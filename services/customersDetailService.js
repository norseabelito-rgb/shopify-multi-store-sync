// services/customersDetailService.js
// Service for persisting and retrieving full Shopify customer details (raw JSON)

const { query } = require('../lib/db');

/**
 * Batch upsert full customer details into customers_detail table
 * @param {string} storeId - Store identifier
 * @param {Array} customers - Array of raw Shopify customer objects
 * @returns {Promise<{upserted: number}>}
 */
async function upsertCustomerDetails(storeId, customers) {
  if (!customers || !customers.length) return { upserted: 0 };

  const values = [];
  const params = [];
  let i = 1;

  for (const customer of customers) {
    // Extract timestamps from the customer object
    const created_at = customer.created_at || null;
    const updated_at = customer.updated_at || customer.created_at || null;
    const customer_id = customer.id ? Number(customer.id) : null;

    if (!customer_id) {
      console.warn('[customersDetailService] Skipping customer without ID:', customer);
      continue;
    }

    values.push(`(
      $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++}
    )`);

    params.push(
      storeId,
      customer_id,
      created_at,
      updated_at,
      JSON.stringify(customer) // Store complete raw customer as JSONB
    );
  }

  if (values.length === 0) return { upserted: 0 };

  const sql = `
    INSERT INTO customers_detail (
      store_id, customer_id, created_at, updated_at, fetched_at, raw_json
    ) VALUES ${values.join(',')}
    ON CONFLICT (store_id, customer_id) DO UPDATE SET
      created_at = EXCLUDED.created_at,
      updated_at = EXCLUDED.updated_at,
      fetched_at = NOW(),
      raw_json = EXCLUDED.raw_json
  `;

  await query(sql, params);
  return { upserted: values.length };
}

/**
 * Get full customer details from database
 * @param {string} storeId - Store identifier
 * @param {number|string} customerId - Customer ID
 * @returns {Promise<object|null>} - Raw customer JSON or null if not found
 */
async function getCustomerDetail(storeId, customerId) {
  const result = await query(
    `
    SELECT raw_json, created_at, updated_at, fetched_at
    FROM customers_detail
    WHERE store_id = $1 AND customer_id = $2
    `,
    [storeId, Number(customerId)]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  return {
    ...row.raw_json, // Postgres automatically parses JSONB to JS object
    _db_fetched_at: row.fetched_at,
  };
}

/**
 * Get multiple customer details by IDs
 * @param {string} storeId - Store identifier
 * @param {Array<number|string>} customerIds - Array of customer IDs
 * @returns {Promise<Array>} - Array of raw customer JSON objects
 */
async function getCustomerDetailsBatch(storeId, customerIds) {
  if (!customerIds || !customerIds.length) return [];

  const numericIds = customerIds.map(id => Number(id)).filter(id => !isNaN(id));
  if (!numericIds.length) return [];

  const result = await query(
    `
    SELECT raw_json, customer_id, created_at, updated_at, fetched_at
    FROM customers_detail
    WHERE store_id = $1 AND customer_id = ANY($2::bigint[])
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
 * Check if customer detail exists in database
 * @param {string} storeId - Store identifier
 * @param {number|string} customerId - Customer ID
 * @returns {Promise<boolean>}
 */
async function customerDetailExists(storeId, customerId) {
  const result = await query(
    `
    SELECT 1
    FROM customers_detail
    WHERE store_id = $1 AND customer_id = $2
    LIMIT 1
    `,
    [storeId, Number(customerId)]
  );

  return result.rows.length > 0;
}

/**
 * Get count of stored customer details for a store
 * @param {string} storeId - Store identifier (or 'all' for total)
 * @returns {Promise<number>}
 */
async function getCustomerDetailsCount(storeId) {
  if (storeId === 'all') {
    const result = await query(`SELECT COUNT(*)::int AS c FROM customers_detail`);
    return result.rows[0]?.c || 0;
  }

  const result = await query(
    `SELECT COUNT(*)::int AS c FROM customers_detail WHERE store_id = $1`,
    [storeId]
  );
  return result.rows[0]?.c || 0;
}

module.exports = {
  upsertCustomerDetails,
  getCustomerDetail,
  getCustomerDetailsBatch,
  customerDetailExists,
  getCustomerDetailsCount,
};
