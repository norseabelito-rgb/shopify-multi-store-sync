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

  await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders_index (created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders_index (updated_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_store_created_at ON orders_index (store_id, created_at DESC);`);

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
}

module.exports = { getPool, query, initDb };