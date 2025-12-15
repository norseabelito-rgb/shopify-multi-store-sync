// lib/db.js
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing DATABASE_URL env var');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

async function initDb() {
  // orders_index
  await query(`
    CREATE TABLE IF NOT EXISTS orders_index (
      store_id TEXT NOT NULL,
      order_id BIGINT NOT NULL,
      order_name TEXT,
      order_number INT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      customer_id BIGINT,
      customer_name TEXT,
      email TEXT,
      phone TEXT,
      total_price NUMERIC,
      currency TEXT,
      financial_status TEXT,
      fulfillment_status TEXT,
      search_text TEXT,
      PRIMARY KEY (store_id, order_id)
    );
  `);

  // Add customer_id column if it doesn't exist (idempotent migration)
  await query(`ALTER TABLE orders_index ADD COLUMN IF NOT EXISTS customer_id BIGINT;`);

  await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders_index (created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders_index (updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_store_created_at ON orders_index (store_id, created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders_index (store_id, customer_id) WHERE customer_id IS NOT NULL;`);

  // FTS index for broad search (bulletproof "search everywhere")
  await query(`
    CREATE INDEX IF NOT EXISTS idx_orders_search_fts
    ON orders_index
    USING GIN (to_tsvector('simple', COALESCE(search_text,'')));
  `);

  // orders_detail - full raw order payloads
  await query(`
    CREATE TABLE IF NOT EXISTS orders_detail (
      store_id TEXT NOT NULL,
      order_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_json JSONB NOT NULL,
      PRIMARY KEY (store_id, order_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_orders_detail_updated_at ON orders_detail (updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_detail_store_updated_at ON orders_detail (store_id, updated_at DESC);`);

  // sync_state - enhanced checkpoint table
  // First, create table if it doesn't exist (for new deployments)
  await query(`
    CREATE TABLE IF NOT EXISTS sync_state (
      store_id TEXT PRIMARY KEY,
      last_updated_at TIMESTAMPTZ,
      backfill_done BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Then, add new columns if they don't exist (for existing deployments)
  // This is idempotent and safe for production
  await query(`ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_order_id BIGINT;`);
  await query(`ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_run_started_at TIMESTAMPTZ;`);
  await query(`ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_run_finished_at TIMESTAMPTZ;`);
  await query(`ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_run_new_orders INT DEFAULT 0;`);
  await query(`ALTER TABLE sync_state ADD COLUMN IF NOT EXISTS last_run_error TEXT;`);

  // Fix existing NULL values and enforce NOT NULL constraint (idempotent)
  // Step 1: Set default value for backfill_done if not already set
  await query(`ALTER TABLE sync_state ALTER COLUMN backfill_done SET DEFAULT FALSE;`);

  // Step 2: Update any existing NULL values to FALSE
  await query(`UPDATE sync_state SET backfill_done = FALSE WHERE backfill_done IS NULL;`);

  // Step 3: Ensure NOT NULL constraint is set (idempotent - won't fail if already set)
  await query(`ALTER TABLE sync_state ALTER COLUMN backfill_done SET NOT NULL;`);

  // Step 4: Ensure last_run_new_orders has default and fix NULLs
  await query(`ALTER TABLE sync_state ALTER COLUMN last_run_new_orders SET DEFAULT 0;`);
  await query(`UPDATE sync_state SET last_run_new_orders = 0 WHERE last_run_new_orders IS NULL;`);

  // Verify schema is correct
  const schemaCheck = await query(`
    SELECT
      column_name,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'sync_state'
      AND column_name IN ('backfill_done', 'last_run_new_orders')
    ORDER BY column_name;
  `);

  const backfillCol = schemaCheck.rows.find(r => r.column_name === 'backfill_done');
  const newOrdersCol = schemaCheck.rows.find(r => r.column_name === 'last_run_new_orders');

  console.log(
    `[db] sync_state schema ok: ` +
    `backfill_done(NOT NULL=${backfillCol?.is_nullable === 'NO'}, default=false) ` +
    `last_run_new_orders(default=0)`
  );

  // customers_index - normalized customer data for fast search/listing
  await query(`
    CREATE TABLE IF NOT EXISTS customers_index (
      store_id TEXT NOT NULL,
      customer_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      email TEXT,
      phone TEXT,
      first_name TEXT,
      last_name TEXT,
      display_name TEXT,
      tags TEXT,
      orders_count INT DEFAULT 0,
      total_spent NUMERIC DEFAULT 0,
      last_order_id BIGINT,
      last_order_name TEXT,
      verified_email BOOLEAN DEFAULT FALSE,
      state TEXT,
      default_address_city TEXT,
      default_address_province TEXT,
      default_address_country TEXT,
      search_text TEXT,
      PRIMARY KEY (store_id, customer_id)
    );
  `);

  // Indexes for customers search and sorting
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers_index (updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers_index (created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_store_updated_at ON customers_index (store_id, updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_email_lower ON customers_index (LOWER(email));`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers_index (phone);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_first_name_lower ON customers_index (LOWER(first_name));`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_last_name_lower ON customers_index (LOWER(last_name));`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_display_name_lower ON customers_index (LOWER(display_name));`);

  // FTS index for full-text search across all customer fields
  await query(`
    CREATE INDEX IF NOT EXISTS idx_customers_search_fts
    ON customers_index
    USING GIN (to_tsvector('simple', COALESCE(search_text,'')));
  `);

  // customers_detail - full raw customer payloads (JSONB)
  await query(`
    CREATE TABLE IF NOT EXISTS customers_detail (
      store_id TEXT NOT NULL,
      customer_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_json JSONB NOT NULL,
      PRIMARY KEY (store_id, customer_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_customers_detail_updated_at ON customers_detail (updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_detail_store_updated_at ON customers_detail (store_id, updated_at DESC);`);

  // customers_sync_state - checkpoint tracking for customer sync
  await query(`
    CREATE TABLE IF NOT EXISTS customers_sync_state (
      store_id TEXT PRIMARY KEY,
      last_updated_at TIMESTAMPTZ,
      last_customer_id BIGINT,
      backfill_done BOOLEAN NOT NULL DEFAULT FALSE,
      last_run_started_at TIMESTAMPTZ,
      last_run_finished_at TIMESTAMPTZ,
      last_run_new_customers INT DEFAULT 0,
      last_run_error TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add columns if they don't exist (for existing deployments)
  await query(`ALTER TABLE customers_sync_state ADD COLUMN IF NOT EXISTS last_customer_id BIGINT;`);
  await query(`ALTER TABLE customers_sync_state ADD COLUMN IF NOT EXISTS last_run_started_at TIMESTAMPTZ;`);
  await query(`ALTER TABLE customers_sync_state ADD COLUMN IF NOT EXISTS last_run_finished_at TIMESTAMPTZ;`);
  await query(`ALTER TABLE customers_sync_state ADD COLUMN IF NOT EXISTS last_run_new_customers INT DEFAULT 0;`);
  await query(`ALTER TABLE customers_sync_state ADD COLUMN IF NOT EXISTS last_run_error TEXT;`);

  // Fix existing NULL values for customers_sync_state
  await query(`ALTER TABLE customers_sync_state ALTER COLUMN backfill_done SET DEFAULT FALSE;`);
  await query(`UPDATE customers_sync_state SET backfill_done = FALSE WHERE backfill_done IS NULL;`);
  await query(`ALTER TABLE customers_sync_state ALTER COLUMN backfill_done SET NOT NULL;`);
  await query(`ALTER TABLE customers_sync_state ALTER COLUMN last_run_new_customers SET DEFAULT 0;`);
  await query(`UPDATE customers_sync_state SET last_run_new_customers = 0 WHERE last_run_new_customers IS NULL;`);

  console.log('[db] customers tables initialized');

  // ==================== DAILY REPORTS SYSTEM ====================

  // people - team members who submit daily reports
  await query(`
    CREATE TABLE IF NOT EXISTS people (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      role TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_people_email ON people (email);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_people_active ON people (active);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_people_active_email ON people (active, email);`);

  // daily_reports_index - fast listing and calendar queries
  await query(`
    CREATE TABLE IF NOT EXISTS daily_reports_index (
      report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      report_date DATE NOT NULL,
      summary_excerpt TEXT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (person_id, report_date)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports_index (report_date DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_reports_person ON daily_reports_index (person_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_reports_person_date ON daily_reports_index (person_id, report_date DESC);`);

  // daily_reports_detail - full JSONB storage
  await query(`
    CREATE TABLE IF NOT EXISTS daily_reports_detail (
      report_id UUID PRIMARY KEY,
      person_id UUID NOT NULL,
      report_date DATE NOT NULL,
      raw_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (report_id) REFERENCES daily_reports_index(report_id) ON DELETE CASCADE
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_daily_reports_detail_date ON daily_reports_detail (report_date DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_reports_detail_person ON daily_reports_detail (person_id);`);

  console.log('[db] daily reports tables initialized');
}

module.exports = { getPool, query, initDb };