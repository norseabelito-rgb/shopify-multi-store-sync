// services/ordersIndexService.js
const { query } = require('../lib/db');

function normalizeText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildSearchText(o) {
  const parts = [
    o.order_name,
    o.order_number,
    o.customer_name,
    o.email,
    o.phone,
    o.total_price,
    o.currency,
    o.financial_status,
    o.fulfillment_status,
  ];
  return normalizeText(parts.filter(Boolean).join(' '));
}

async function upsertOrders(rows) {
  if (!rows || !rows.length) return { upserted: 0 };

  const values = [];
  const params = [];
  let i = 1;

  for (const r of rows) {
    const search_text = buildSearchText(r);

    values.push(`(
      $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}, $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}, $${i++}, $${i++}, $${i++},
      $${i++}
    )`);

    params.push(
      r.store_id,
      r.order_id,
      r.order_name || null,
      r.order_number || null,
      r.created_at || null,
      r.updated_at || null,
      r.customer_name || null,
      r.email || null,
      r.phone || null,
      r.total_price != null ? r.total_price : null,
      r.currency || null,
      r.financial_status || null,
      r.fulfillment_status || null,
      search_text
    );
  }

  const sql = `
    INSERT INTO orders_index (
      store_id, order_id, order_name, order_number,
      created_at, updated_at, customer_name, email, phone,
      total_price, currency, financial_status, fulfillment_status,
      search_text
    ) VALUES ${values.join(',')}
    ON CONFLICT (store_id, order_id) DO UPDATE SET
      order_name = EXCLUDED.order_name,
      order_number = EXCLUDED.order_number,
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      customer_name = EXCLUDED.customer_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      total_price = EXCLUDED.total_price,
      currency = EXCLUDED.currency,
      financial_status = EXCLUDED.financial_status,
      fulfillment_status = EXCLUDED.fulfillment_status,
      search_text = EXCLUDED.search_text
  `;

  await query(sql, params);
  return { upserted: rows.length };
}

async function getLatestOrders({ store_id = 'all', limit = 100, sort_by = 'created_at', sort_dir = 'desc' } = {}) {
  const l = Math.max(1, Math.min(Number(limit) || 100, 250));

  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'order_name': 'order_name',
    'order_number': 'order_number',
    'customer_name': 'customer_name',
    'email': 'email',
    'total_price': 'total_price',
    'financial_status': 'financial_status',
    'fulfillment_status': 'fulfillment_status',
    'store_id': 'store_id',
  };

  const sortColumn = allowedSortColumns[sort_by] || 'created_at';
  const sortDirection = (sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (store_id && store_id !== 'all') {
    const r = await query(
      `
      SELECT * FROM orders_index
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
    SELECT * FROM orders_index
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $1
    `,
    [l]
  );
  return r.rows;
}

async function searchOrders({ store_id = 'all', q = '', limit = 100, sort_by = 'created_at', sort_dir = 'desc' } = {}) {
  const term = String(q || '').trim();
  const l = Math.max(1, Math.min(Number(limit) || 100, 250));
  if (!term) return [];

  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSortColumns = {
    'created_at': 'created_at',
    'updated_at': 'updated_at',
    'order_name': 'order_name',
    'order_number': 'order_number',
    'customer_name': 'customer_name',
    'email': 'email',
    'total_price': 'total_price',
    'financial_status': 'financial_status',
    'fulfillment_status': 'fulfillment_status',
    'store_id': 'store_id',
  };

  const sortColumn = allowedSortColumns[sort_by] || 'created_at';
  const sortDirection = (sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (store_id && store_id !== 'all') {
    const r = await query(
      `
      SELECT *
      FROM orders_index
      WHERE store_id = $1
        AND (
          to_tsvector('simple', COALESCE(search_text,'')) @@ plainto_tsquery('simple', $2)
          OR search_text ILIKE '%' || lower($2) || '%'
        )
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $3
      `,
      [store_id, term, l]
    );
    return r.rows;
  }

  const r = await query(
    `
    SELECT *
    FROM orders_index
    WHERE
      to_tsvector('simple', COALESCE(search_text,'')) @@ plainto_tsquery('simple', $1)
      OR search_text ILIKE '%' || lower($1) || '%'
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $2
    `,
    [term, l]
  );
  return r.rows;
}

async function getTodayOrdersCount({ store_id = 'all' } = {}) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  if (store_id && store_id !== 'all') {
    const r = await query(
      `
      SELECT COUNT(*)::int AS c
      FROM orders_index
      WHERE store_id = $1
        AND created_at >= $2
        AND created_at <= $3
      `,
      [store_id, start.toISOString(), end.toISOString()]
    );
    return r.rows[0]?.c || 0;
  }

  const r = await query(
    `
    SELECT COUNT(*)::int AS c
    FROM orders_index
    WHERE created_at >= $1
      AND created_at <= $2
    `,
    [start.toISOString(), end.toISOString()]
  );
  return r.rows[0]?.c || 0;
}

async function getSyncState(store_id) {
  const r = await query(`SELECT * FROM sync_state WHERE store_id = $1`, [store_id]);
  return r.rows[0] || null;
}

async function upsertSyncState(store_id, patch = {}) {
  const last_updated_at = patch.last_updated_at || null;
  const last_order_id = patch.last_order_id || null;
  // CRITICAL: Never pass NULL for backfill_done - it's NOT NULL in DB
  const backfill_done = patch.backfill_done === true ? true : false;
  const last_run_started_at = patch.last_run_started_at || null;
  const last_run_finished_at = patch.last_run_finished_at || null;
  // CRITICAL: Never pass NULL for last_run_new_orders - default to 0
  const last_run_new_orders = patch.last_run_new_orders != null ? patch.last_run_new_orders : 0;
  const last_run_error = patch.last_run_error || null;

  await query(
    `
    INSERT INTO sync_state (
      store_id, last_updated_at, last_order_id, backfill_done,
      last_run_started_at, last_run_finished_at, last_run_new_orders, last_run_error,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (store_id) DO UPDATE SET
      last_updated_at = COALESCE(EXCLUDED.last_updated_at, sync_state.last_updated_at),
      last_order_id = COALESCE(EXCLUDED.last_order_id, sync_state.last_order_id),
      -- backfill_done: Use incoming value, fallback to existing, never NULL (should never happen now)
      backfill_done = COALESCE(EXCLUDED.backfill_done, sync_state.backfill_done, FALSE),
      last_run_started_at = COALESCE(EXCLUDED.last_run_started_at, sync_state.last_run_started_at),
      last_run_finished_at = COALESCE(EXCLUDED.last_run_finished_at, sync_state.last_run_finished_at),
      -- last_run_new_orders: Use incoming value, fallback to existing, never NULL
      last_run_new_orders = COALESCE(EXCLUDED.last_run_new_orders, sync_state.last_run_new_orders, 0),
      last_run_error = COALESCE(EXCLUDED.last_run_error, sync_state.last_run_error),
      updated_at = NOW()
    `,
    [store_id, last_updated_at, last_order_id, backfill_done, last_run_started_at, last_run_finished_at, last_run_new_orders, last_run_error]
  );
}

async function getOrdersCount(store_id) {
  if (store_id === 'all') {
    const r = await query(`SELECT COUNT(*)::int AS c FROM orders_index`);
    return r.rows[0]?.c || 0;
  }
  const r = await query(`SELECT COUNT(*)::int AS c FROM orders_index WHERE store_id = $1`, [store_id]);
  return r.rows[0]?.c || 0;
}

async function getMaxUpdatedAtFromDB(store_id) {
  const r = await query(
    `SELECT MAX(updated_at) as max_updated_at, MAX(order_id) as max_order_id
     FROM orders_index
     WHERE store_id = $1`,
    [store_id]
  );
  return {
    max_updated_at: r.rows[0]?.max_updated_at || null,
    max_order_id: r.rows[0]?.max_order_id || null,
  };
}

module.exports = {
  upsertOrders,
  getLatestOrders,
  searchOrders,
  getTodayOrdersCount,
  getSyncState,
  upsertSyncState,
  getOrdersCount,
  getMaxUpdatedAtFromDB,
};