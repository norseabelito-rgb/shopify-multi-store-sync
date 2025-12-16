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

  // ==================== DAILY REPORTS SYSTEM (Day-Centric with Projects) ====================

  // daily_people - team members (ready for future Google Auth UAM)
  await query(`
    CREATE TABLE IF NOT EXISTS daily_people (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      auth_user_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_people_email ON daily_people (email) WHERE email IS NOT NULL;`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_people_auth_user_id ON daily_people (auth_user_id) WHERE auth_user_id IS NOT NULL;`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_people_active ON daily_people (is_active);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_people_display_name ON daily_people (LOWER(display_name));`);

  // daily_projects - project tags for reports
  await query(`
    CREATE TABLE IF NOT EXISTS daily_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_daily_projects_name ON daily_projects (LOWER(name));`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_projects_active ON daily_projects (is_active);`);

  // daily_report_entries - structured day-centric reports
  await query(`
    CREATE TABLE IF NOT EXISTS daily_report_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_date DATE NOT NULL,
      person_id UUID NOT NULL REFERENCES daily_people(id) ON DELETE CASCADE,
      did TEXT,
      next TEXT,
      blockers TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_edited_by_person_id UUID REFERENCES daily_people(id) ON DELETE SET NULL,
      UNIQUE (report_date, person_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_daily_report_entries_date ON daily_report_entries (report_date DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_report_entries_person ON daily_report_entries (person_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_report_entries_date_person ON daily_report_entries (report_date DESC, person_id);`);

  // daily_report_entry_projects - many-to-many relationship
  await query(`
    CREATE TABLE IF NOT EXISTS daily_report_entry_projects (
      entry_id UUID NOT NULL REFERENCES daily_report_entries(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES daily_projects(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, project_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_daily_report_entry_projects_entry ON daily_report_entry_projects (entry_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_report_entry_projects_project ON daily_report_entry_projects (project_id);`);

  // daily_report_entry_revisions - audit/history tracking
  await query(`
    CREATE TABLE IF NOT EXISTS daily_report_entry_revisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entry_id UUID NOT NULL REFERENCES daily_report_entries(id) ON DELETE CASCADE,
      edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      edited_by_person_id UUID REFERENCES daily_people(id) ON DELETE SET NULL,
      snapshot JSONB NOT NULL
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_daily_report_entry_revisions_entry ON daily_report_entry_revisions (entry_id, edited_at DESC);`);

  console.log('[db] daily reports tables initialized (day-centric with projects & audit)');

  // ==================== ORDERS DAILY AGGREGATION (Metrics System) ====================

  // orders_daily_agg - Daily aggregated order metrics per store and for ALL stores
  // This table stores daily snapshots of order counts and revenue aggregated by business date
  // in Europe/Bucharest timezone. This enables fast homepage metrics without heavy scans.
  await query(`
    CREATE TABLE IF NOT EXISTS orders_daily_agg (
      agg_date DATE NOT NULL,
      store_id TEXT NOT NULL,
      orders_count INT NOT NULL DEFAULT 0,
      gross_revenue NUMERIC NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (agg_date, store_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_orders_daily_agg_store_date ON orders_daily_agg (store_id, agg_date DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_daily_agg_date ON orders_daily_agg (agg_date DESC);`);

  console.log('[db] orders_daily_agg table initialized (metrics aggregation system)');

  // ==================== RETURNS DAILY AGGREGATION ====================
  // Tracks refunds/returns per day per store for money loss analytics
  // Similar structure to orders_daily_agg but focused on refunds
  await query(`
    CREATE TABLE IF NOT EXISTS returns_daily_agg (
      agg_date DATE NOT NULL,
      store_id TEXT NOT NULL,
      returns_count INT NOT NULL DEFAULT 0,
      refund_amount NUMERIC NOT NULL DEFAULT 0,
      top_reason TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (agg_date, store_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_returns_daily_agg_store_date ON returns_daily_agg (store_id, agg_date DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_returns_daily_agg_date ON returns_daily_agg (agg_date DESC);`);

  console.log('[db] returns_daily_agg table initialized (returns/refunds aggregation)');

  // ==================== AI INSIGHTS CACHE ====================
  // Caches AI-generated insights to avoid repeated LLM calls
  // TTL-based expiration with context hashing to detect stale insights
  await query(`
    CREATE TABLE IF NOT EXISTS ai_insights_cache (
      cache_key TEXT PRIMARY KEY,
      store_id TEXT NOT NULL,
      insight_type TEXT NOT NULL,
      context_hash TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_store_type ON ai_insights_cache (store_id, insight_type);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires ON ai_insights_cache (expires_at);`);

  console.log('[db] ai_insights_cache table initialized (AI response caching)');

  // ==================== PRODUCTS MODULE ====================
  // Master products table - single source of truth, SKU is PRIMARY KEY (readonly)
  // This is NOT per-store - it's the global master catalog
  await query(`
    CREATE TABLE IF NOT EXISTS products_master (
      sku TEXT PRIMARY KEY,
      title_default TEXT NOT NULL,
      description_default TEXT,
      price_default NUMERIC NOT NULL DEFAULT 0,
      compare_at_price_default NUMERIC,
      cost NUMERIC,
      seo_title_default TEXT,
      seo_meta_default TEXT,
      drive_folder_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_products_master_title ON products_master (LOWER(title_default));`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_master_created_at ON products_master (created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_master_updated_at ON products_master (updated_at DESC);`);

  // FTS index for product search (SKU + title)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_products_master_search_fts
    ON products_master
    USING GIN (to_tsvector('simple', COALESCE(sku,'') || ' ' || COALESCE(title_default,'')));
  `);

  console.log('[db] products_master table initialized');

  // Per-store product overrides - optional overrides for each store
  // All override fields are nullable - NULL means "use master default"
  await query(`
    CREATE TABLE IF NOT EXISTS products_store_overrides (
      sku TEXT NOT NULL REFERENCES products_master(sku) ON DELETE CASCADE,
      store_id TEXT NOT NULL,
      title_override TEXT,
      description_override TEXT,
      price_override NUMERIC,
      compare_at_price_override NUMERIC,
      seo_title_override TEXT,
      seo_meta_override TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (sku, store_id)
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_products_store_overrides_store ON products_store_overrides (store_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_store_overrides_sku ON products_store_overrides (sku);`);

  console.log('[db] products_store_overrides table initialized');

  // Per-store sync metadata - tracks Shopify sync status for each product/store
  await query(`
    CREATE TABLE IF NOT EXISTS products_store_sync (
      sku TEXT NOT NULL REFERENCES products_master(sku) ON DELETE CASCADE,
      store_id TEXT NOT NULL,
      shopify_product_id BIGINT,
      status TEXT NOT NULL DEFAULT 'not_pushed',
      last_pushed_at TIMESTAMPTZ,
      last_push_error TEXT,
      has_cashsync_tag BOOLEAN NOT NULL DEFAULT FALSE,
      created_by_system BOOLEAN NOT NULL DEFAULT FALSE,
      shopify_created_at TIMESTAMPTZ,
      shopify_updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (sku, store_id)
    );
  `);

  // Status values: 'not_pushed', 'draft', 'active', 'archived', 'failed', 'collision_resolved'
  await query(`CREATE INDEX IF NOT EXISTS idx_products_store_sync_store ON products_store_sync (store_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_store_sync_status ON products_store_sync (status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_store_sync_shopify_id ON products_store_sync (store_id, shopify_product_id) WHERE shopify_product_id IS NOT NULL;`);

  console.log('[db] products_store_sync table initialized');

  // Products push job tracking - for background bulk push operations
  await query(`
    CREATE TABLE IF NOT EXISTS products_push_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_products INT NOT NULL DEFAULT 0,
      processed_products INT NOT NULL DEFAULT 0,
      successful_products INT NOT NULL DEFAULT 0,
      failed_products INT NOT NULL DEFAULT 0,
      skus_to_push JSONB,
      failed_skus JSONB,
      started_at TIMESTAMPTZ,
      finished_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Job status values: 'pending', 'running', 'completed', 'failed', 'cancelled'
  await query(`CREATE INDEX IF NOT EXISTS idx_products_push_jobs_store ON products_push_jobs (store_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_push_jobs_status ON products_push_jobs (status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_push_jobs_created ON products_push_jobs (created_at DESC);`);

  console.log('[db] products_push_jobs table initialized');

  // SKU collision log - tracks when we rename existing SKUs in Shopify stores
  await query(`
    CREATE TABLE IF NOT EXISTS products_sku_collisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id TEXT NOT NULL,
      original_sku TEXT NOT NULL,
      new_sku TEXT NOT NULL,
      shopify_product_id BIGINT NOT NULL,
      resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      notes TEXT
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_products_sku_collisions_store ON products_sku_collisions (store_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_sku_collisions_original ON products_sku_collisions (original_sku);`);

  console.log('[db] products_sku_collisions table initialized');
  console.log('[db] Products module tables initialized');
}

module.exports = { getPool, query, initDb };