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

  // sync_state
  await query(`
    CREATE TABLE IF NOT EXISTS sync_state (
      store_id TEXT PRIMARY KEY,
      last_updated_at TIMESTAMPTZ,
      backfill_done BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = { getPool, query, initDb };