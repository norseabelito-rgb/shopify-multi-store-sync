// services/ordersDetailService.js
// Service for persisting and retrieving full Shopify order details (raw JSON)

const { query } = require('../lib/db');

/**
 * Batch upsert full order details into orders_detail table
 * @param {string} storeId - Store identifier
 * @param {Array} orders - Array of raw Shopify order objects
 * @returns {Promise<{upserted: number}>}
 */
async function upsertOrderDetails(storeId, orders) {
  if (!orders || !orders.length) return { upserted: 0 };

  const values = [];
  const params = [];
  let i = 1;

  for (const order of orders) {
    // Extract timestamps from the order object
    const created_at = order.created_at || null;
    const updated_at = order.updated_at || order.created_at || null;
    const order_id = order.id ? Number(order.id) : null;

    if (!order_id) {
      console.warn('[ordersDetailService] Skipping order without ID:', order);
      continue;
    }

    values.push(`(
      $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++}
    )`);

    params.push(
      storeId,
      order_id,
      created_at,
      updated_at,
      JSON.stringify(order) // Store complete raw order as JSONB
    );
  }

  if (values.length === 0) return { upserted: 0 };

  const sql = `
    INSERT INTO orders_detail (
      store_id, order_id, created_at, updated_at, fetched_at, raw_json
    ) VALUES ${values.join(',')}
    ON CONFLICT (store_id, order_id) DO UPDATE SET
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      fetched_at = NOW(),
      raw_json = EXCLUDED.raw_json
  `;

  await query(sql, params);
  return { upserted: values.length };
}

/**
 * Get full order details from database
 * @param {string} storeId - Store identifier
 * @param {number|string} orderId - Order ID
 * @returns {Promise<object|null>} - Raw order JSON or null if not found
 */
async function getOrderDetail(storeId, orderId) {
  const result = await query(
    `
    SELECT raw_json, created_at, updated_at, fetched_at
    FROM orders_detail
    WHERE store_id = $1 AND order_id = $2
    `,
    [storeId, Number(orderId)]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  return {
    ...row.raw_json, // Postgres automatically parses JSONB to JS object
    _db_fetched_at: row.fetched_at,
  };
}

/**
 * Get multiple order details by IDs
 * @param {string} storeId - Store identifier
 * @param {Array<number|string>} orderIds - Array of order IDs
 * @returns {Promise<Array>} - Array of raw order JSON objects
 */
async function getOrderDetailsBatch(storeId, orderIds) {
  if (!orderIds || !orderIds.length) return [];

  const numericIds = orderIds.map(id => Number(id)).filter(id => !isNaN(id));
  if (!numericIds.length) return [];

  const result = await query(
    `
    SELECT raw_json, order_id, created_at, updated_at, fetched_at
    FROM orders_detail
    WHERE store_id = $1 AND order_id = ANY($2::bigint[])
    ORDER BY created_at DESC
    `,
    [storeId, numericIds]
  );

  return result.rows.map(row => ({
    ...row.raw_json,
    _db_fetched_at: row.fetched_at,
  }));
}

/**
 * Check if order detail exists in database
 * @param {string} storeId - Store identifier
 * @param {number|string} orderId - Order ID
 * @returns {Promise<boolean>}
 */
async function orderDetailExists(storeId, orderId) {
  const result = await query(
    `
    SELECT 1
    FROM orders_detail
    WHERE store_id = $1 AND order_id = $2
    LIMIT 1
    `,
    [storeId, Number(orderId)]
  );

  return result.rows.length > 0;
}

/**
 * Get count of stored order details for a store
 * @param {string} storeId - Store identifier (or 'all' for total)
 * @returns {Promise<number>}
 */
async function getOrderDetailsCount(storeId) {
  if (storeId === 'all') {
    const result = await query(`SELECT COUNT(*)::int AS c FROM orders_detail`);
    return result.rows[0]?.c || 0;
  }

  const result = await query(
    `SELECT COUNT(*)::int AS c FROM orders_detail WHERE store_id = $1`,
    [storeId]
  );
  return result.rows[0]?.c || 0;
}

module.exports = {
  upsertOrderDetails,
  getOrderDetail,
  getOrderDetailsBatch,
  orderDetailExists,
  getOrderDetailsCount,
};
