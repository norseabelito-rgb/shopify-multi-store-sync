// services/ordersIndexService.js
const { query } = require('../lib/db');

function normalizeText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildSearchText(o) {
  // include everything the user might type: order name/number, name, email, phone
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
      $${i++},$${i++},$${i++},$${i++},
      $${i++},$${i++},$${i++},$${i++},$${i++},
      $${i++},$${i++},$${i++},$${i++},
      $${i++},$${i++}
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
      search_text,
      search_text // for fts convenience (same field)
    );
  }

  // Note: last param duplicate is fine; we store search_text once, but we keep params simple.
  // We'll use the first search_text and ignore the second by mapping to same column.
  // To avoid confusion, we actually only store one search_text column:
  // -> We'll use the first one and drop the second:
  // However we already pushed 15 params per row above; keep it consistent.
  // We'll map both to search_text and it will just overwrite with same value.

  const sql = `
    INSERT INTO orders_index (
      store_id, order_id, order_name, order_number,
      created_at, updated_at, customer_name, email, phone,
      total_price, currency, financial_status, fulfillment_status,
      search_text, search_text
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

async function getLatestOrders({ store_id = 'all', limit = 100 } = {}) {
  const l = Math.max(1, Math.min(Number(limit) || 100, 250));

  if (store_id && store_id !== 'all') {
    const r = await query(
      `
      SELECT * FROM orders_index
      WHERE store_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [store_id, l]
    );
    return r.rows;
  }

  const r = await query(
    `
    SELECT * FROM orders_index
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [l]
  );
  return r.rows;
}

async function searchOrders({ store_id = 'all', q = '', limit = 100 } = {}) {
  const term = String(q || '').trim();
  const l = Math.max(1, Math.min(Number(limit) || 100, 250));
  if (!term) return [];

  // Use FTS for "search everywhere". Fallback to ILIKE too (phone/email exact-ish).
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
      ORDER BY created_at DESC
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
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [term, l]
  );
  return r.rows;
}

async function getTodayOrdersCount({ store_id = 'all' } = {}) {
  // Count orders created today in UTC (simple and consistent)
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
  const backfill_done = patch.backfill_done === true;

  await query(
    `
    INSERT INTO sync_state (store_id, last_updated_at, backfill_done, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (store_id) DO UPDATE SET
      last_updated_at = COALESCE(EXCLUDED.last_updated_at, sync_state.last_updated_at),
      backfill_done = COALESCE(EXCLUDED.backfill_done, sync_state.backfill_done),
      updated_at = NOW()
    `,
    [store_id, last_updated_at, backfill_done]
  );
}

module.exports = {
  upsertOrders,
  getLatestOrders,
  searchOrders,
  getTodayOrdersCount,
  getSyncState,
  upsertSyncState,
};