// services/customersIndexService.js
// Service for persisting and querying normalized customer data (customers_index table)

const { query } = require('../lib/db');

function normalizeText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildSearchText(c) {
  const parts = [
    c.email,
    c.phone,
    c.first_name,
    c.last_name,
    c.display_name,
    c.tags,
    c.default_address_city,
    c.default_address_province,
    c.default_address_country,
  ];
  return normalizeText(parts.filter(Boolean).join(' '));
}

/**
 * Batch upsert customers into customers_index table
 * @param {Array} rows - Array of customer row objects
 * @returns {Promise<{upserted: number}>}
 */
async function upsertCustomers(rows) {
  if (!rows || !rows.length) return { upserted: 0 };

  const values = [];
  const params = [];
  let i = 1;

  for (const r of rows) {
    const search_text = buildSearchText(r);

    values.push(`(
      $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}, $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}, $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}, $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}
    )`);

    params.push(
      r.store_id,
      r.customer_id,
      r.created_at || null,
      r.updated_at || null,
      r.email || null,
      r.phone || null,
      r.first_name || null,
      r.last_name || null,
      r.display_name || null,
      r.tags || null,
      r.orders_count != null ? r.orders_count : 0,
      r.total_spent != null ? r.total_spent : 0,
      r.last_order_id || null,
      r.last_order_name || null,
      r.verified_email != null ? r.verified_email : false,
      r.state || null,
      r.default_address_city || null,
      r.default_address_province || null,
      r.default_address_country || null,
      search_text
    );
  }

  const sql = `
    INSERT INTO customers_index (
      store_id, customer_id, created_at, updated_at,
      email, phone, first_name, last_name, display_name,
      tags, orders_count, total_spent, last_order_id, last_order_name,
      verified_email, state, default_address_city, default_address_province,
      default_address_country, search_text
    ) VALUES ${values.join(',')}
    ON CONFLICT (store_id, customer_id) DO UPDATE SET
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      display_name = EXCLUDED.display_name,
      tags = EXCLUDED.tags,
      orders_count = EXCLUDED.orders_count,
      total_spent = EXCLUDED.total_spent,
      last_order_id = EXCLUDED.last_order_id,
      last_order_name = EXCLUDED.last_order_name,
      verified_email = EXCLUDED.verified_email,
      state = EXCLUDED.state,
      default_address_city = EXCLUDED.default_address_city,
      default_address_province = EXCLUDED.default_address_province,
      default_address_country = EXCLUDED.default_address_country,
      search_text = EXCLUDED.search_text
  `;

  await query(sql, params);
  return { upserted: rows.length };
}

/**
 * Get latest customers with optional store filter and sorting
 * @param {Object} options - Query options
 * @param {string} options.store_id - Store ID or 'all'
 * @param {number} options.limit - Max results to return (default 1000 for no pagination)
 * @param {string} options.sort_by - Column to sort by
 * @param {string} options.sort_dir - Sort direction ('asc' or 'desc')
 * @returns {Promise<Array>}
 */
async function getLatestCustomers({ store_id = 'all', limit = 1000, sort_by = 'updated_at', sort_dir = 'desc' } = {}) {
  const l = Math.max(1, Math.min(Number(limit) || 1000, 2000));

  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    'updated_at': 'updated_at',
    'created_at': 'created_at',
    'display_name': 'display_name',
    'email': 'email',
    'phone': 'phone',
    'orders_count': 'orders_count',
    'total_spent': 'total_spent',
    'store_id': 'store_id',
  };

  const sortColumn = allowedSortColumns[sort_by] || 'updated_at';
  const sortDirection = (sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (store_id && store_id !== 'all') {
    const r = await query(
      `
      SELECT * FROM customers_index
      WHERE store_id = $1
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $2
      `,
      [store_id, l]
    );
    return r.rows;
  }

  const r = await query(
    `
    SELECT * FROM customers_index
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $1
    `,
    [l]
  );
  return r.rows;
}

/**
 * Search customers with full-text search and filters
 * @param {Object} options - Search options
 * @param {string} options.q - Search query
 * @param {string} options.store_id - Store ID or 'all'
 * @param {number} options.limit - Max results
 * @param {string} options.sort_by - Column to sort by
 * @param {string} options.sort_dir - Sort direction ('asc' or 'desc')
 * @returns {Promise<Array>}
 */
async function searchCustomers({ q, store_id = 'all', limit = 1000, sort_by = 'updated_at', sort_dir = 'desc' } = {}) {
  const l = Math.max(1, Math.min(Number(limit) || 1000, 2000));

  if (!q || !String(q).trim()) {
    return getLatestCustomers({ store_id, limit: l, sort_by, sort_dir });
  }

  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    'updated_at': 'updated_at',
    'created_at': 'created_at',
    'display_name': 'display_name',
    'email': 'email',
    'phone': 'phone',
    'orders_count': 'orders_count',
    'total_spent': 'total_spent',
    'store_id': 'store_id',
  };

  const sortColumn = allowedSortColumns[sort_by] || 'updated_at';
  const sortDirection = (sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const searchQuery = normalizeText(q);
  const params = [];
  let whereClauses = [];
  let paramIndex = 1;

  // Full-text search
  whereClauses.push(`to_tsvector('simple', COALESCE(search_text,'')) @@ plainto_tsquery('simple', $${paramIndex++})`);
  params.push(searchQuery);

  // Store filter
  if (store_id && store_id !== 'all') {
    whereClauses.push(`store_id = $${paramIndex++}`);
    params.push(store_id);
  }

  params.push(l);

  const sql = `
    SELECT * FROM customers_index
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $${paramIndex++}
  `;

  const r = await query(sql, params);
  return r.rows;
}

/**
 * Get total count of customers matching search
 * @param {Object} options - Search options
 * @param {string} options.q - Search query
 * @param {string} options.store_id - Store ID or 'all'
 * @returns {Promise<number>}
 */
async function getCustomersCount({ q, store_id = 'all' } = {}) {
  if (!q || !String(q).trim()) {
    // No search query - return total count
    if (store_id && store_id !== 'all') {
      const r = await query(
        `SELECT COUNT(*)::int AS c FROM customers_index WHERE store_id = $1`,
        [store_id]
      );
      return r.rows[0]?.c || 0;
    }
    const r = await query(`SELECT COUNT(*)::int AS c FROM customers_index`);
    return r.rows[0]?.c || 0;
  }

  const searchQuery = normalizeText(q);
  const params = [];
  let whereClauses = [];
  let paramIndex = 1;

  // Full-text search
  whereClauses.push(`to_tsvector('simple', COALESCE(search_text,'')) @@ plainto_tsquery('simple', $${paramIndex++})`);
  params.push(searchQuery);

  // Store filter
  if (store_id && store_id !== 'all') {
    whereClauses.push(`store_id = $${paramIndex++}`);
    params.push(store_id);
  }

  const sql = `
    SELECT COUNT(*)::int AS c FROM customers_index
    WHERE ${whereClauses.join(' AND ')}
  `;

  const r = await query(sql, params);
  return r.rows[0]?.c || 0;
}

/**
 * Get sync state for a store
 * @param {string} store_id - Store identifier
 * @returns {Promise<object|null>}
 */
async function getCustomersSyncState(store_id) {
  const r = await query(`SELECT * FROM customers_sync_state WHERE store_id = $1`, [store_id]);
  return r.rows[0] || null;
}

/**
 * Upsert sync state checkpoint
 * @param {string} store_id - Store identifier
 * @param {Object} patch - Fields to update
 * @returns {Promise<void>}
 */
async function upsertCustomersSyncState(store_id, patch = {}) {
  const last_updated_at = patch.last_updated_at || null;
  const last_customer_id = patch.last_customer_id || null;
  // CRITICAL: Never pass NULL for backfill_done - it's NOT NULL in DB
  const backfill_done = patch.backfill_done === true ? true : false;
  const last_run_started_at = patch.last_run_started_at || null;
  const last_run_finished_at = patch.last_run_finished_at || null;
  // CRITICAL: Never pass NULL for last_run_new_customers - default to 0
  const last_run_new_customers = patch.last_run_new_customers != null ? patch.last_run_new_customers : 0;
  const last_run_error = patch.last_run_error || null;

  await query(
    `
    INSERT INTO customers_sync_state (
      store_id, last_updated_at, last_customer_id, backfill_done,
      last_run_started_at, last_run_finished_at, last_run_new_customers, last_run_error,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (store_id) DO UPDATE SET
      last_updated_at = COALESCE(EXCLUDED.last_updated_at, customers_sync_state.last_updated_at),
      last_customer_id = COALESCE(EXCLUDED.last_customer_id, customers_sync_state.last_customer_id),
      backfill_done = COALESCE(EXCLUDED.backfill_done, customers_sync_state.backfill_done, FALSE),
      last_run_started_at = COALESCE(EXCLUDED.last_run_started_at, customers_sync_state.last_run_started_at),
      last_run_finished_at = COALESCE(EXCLUDED.last_run_finished_at, customers_sync_state.last_run_finished_at),
      last_run_new_customers = COALESCE(EXCLUDED.last_run_new_customers, customers_sync_state.last_run_new_customers, 0),
      last_run_error = COALESCE(EXCLUDED.last_run_error, customers_sync_state.last_run_error),
      updated_at = NOW()
    `,
    [store_id, last_updated_at, last_customer_id, backfill_done, last_run_started_at, last_run_finished_at, last_run_new_customers, last_run_error]
  );
}

/**
 * Get MAX(updated_at) and MAX(customer_id) from DB for checkpoint bootstrapping
 * @param {string} store_id - Store identifier
 * @returns {Promise<{max_updated_at: string|null, max_customer_id: number|null}>}
 */
async function getMaxUpdatedAtFromDB(store_id) {
  const r = await query(
    `SELECT MAX(updated_at) as max_updated_at, MAX(customer_id) as max_customer_id
     FROM customers_index
     WHERE store_id = $1`,
    [store_id]
  );
  return {
    max_updated_at: r.rows[0]?.max_updated_at || null,
    max_customer_id: r.rows[0]?.max_customer_id || null,
  };
}

module.exports = {
  upsertCustomers,
  getLatestCustomers,
  searchCustomers,
  getCustomersCount,
  getCustomersSyncState,
  upsertCustomersSyncState,
  getMaxUpdatedAtFromDB,
};
