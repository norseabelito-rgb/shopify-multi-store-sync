// services/ordersCustomerIdBackfill.js
// One-time backfill job to populate orders_index.customer_id from orders_detail.raw_json

const { query } = require('../lib/db');

const BATCH_SIZE = 500; // Process 500 rows at a time
const BATCH_DELAY_MS = 100; // 100ms delay between batches to be gentle on DB
const LOG_EVERY_N_BATCHES = 10; // Log progress every 10 batches

// In-memory job status
let jobStatus = {
  is_running: false,
  started_at: null,
  finished_at: null,
  total_updated: 0,
  last_error: null,
  batches_processed: 0,
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get count of orders with NULL customer_id
 * @returns {Promise<number>}
 */
async function getNullCustomerIdCount() {
  const r = await query(`
    SELECT COUNT(*)::int AS c
    FROM orders_index
    WHERE customer_id IS NULL
  `);
  return r.rows[0]?.c || 0;
}

/**
 * Get job status
 * @returns {Promise<object>}
 */
async function getBackfillStatus() {
  const nullCount = await getNullCustomerIdCount();
  return {
    ...jobStatus,
    remaining_nulls: nullCount,
  };
}

/**
 * Backfill customer_id for a single store in batches
 * @param {string} storeId - Store identifier
 * @returns {Promise<{updated: number, batches: number}>}
 */
async function backfillStoreCustomerId(storeId) {
  let totalUpdated = 0;
  let batchCount = 0;
  let hasMore = true;

  console.log(`[backfill-customer-id] Starting for store: ${storeId}`);

  while (hasMore) {
    // Select a batch of orders with NULL customer_id and join with orders_detail
    const updateResult = await query(`
      WITH batch AS (
        SELECT oi.store_id, oi.order_id
        FROM orders_index oi
        WHERE oi.store_id = $1
          AND oi.customer_id IS NULL
        LIMIT $2
      ),
      with_customer AS (
        SELECT
          b.store_id,
          b.order_id,
          (od.raw_json->'customer'->>'id')::bigint AS customer_id
        FROM batch b
        INNER JOIN orders_detail od
          ON od.store_id = b.store_id
          AND od.order_id = b.order_id
        WHERE od.raw_json->'customer'->>'id' IS NOT NULL
          AND od.raw_json->'customer'->>'id' != 'null'
      )
      UPDATE orders_index oi
      SET customer_id = wc.customer_id
      FROM with_customer wc
      WHERE oi.store_id = wc.store_id
        AND oi.order_id = wc.order_id
    `, [storeId, BATCH_SIZE]);

    const updated = updateResult.rowCount || 0;
    totalUpdated += updated;
    batchCount++;

    // Log progress every N batches
    if (batchCount % LOG_EVERY_N_BATCHES === 0) {
      const remaining = await query(
        `SELECT COUNT(*)::int AS c FROM orders_index WHERE store_id = $1 AND customer_id IS NULL`,
        [storeId]
      );
      console.log(
        `[backfill-customer-id] ${storeId} - Batch ${batchCount}: ` +
        `+${updated} updated, ${totalUpdated} total, ~${remaining.rows[0]?.c || 0} remaining`
      );
    }

    // If we updated fewer rows than batch size, we're done
    if (updated < BATCH_SIZE) {
      hasMore = false;
    } else {
      // Small delay between batches to be gentle on DB
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(
    `[backfill-customer-id] ${storeId} - COMPLETE: ` +
    `${totalUpdated} rows updated in ${batchCount} batches`
  );

  return { updated: totalUpdated, batches: batchCount };
}

/**
 * Run the full backfill job for all stores
 * @returns {Promise<object>}
 */
async function runBackfillJob() {
  if (jobStatus.is_running) {
    throw new Error('Backfill job is already running');
  }

  jobStatus.is_running = true;
  jobStatus.started_at = new Date().toISOString();
  jobStatus.finished_at = null;
  jobStatus.total_updated = 0;
  jobStatus.last_error = null;
  jobStatus.batches_processed = 0;

  const startTime = Date.now();

  try {
    // Get all unique store_ids from orders_index where customer_id is NULL
    const storesResult = await query(`
      SELECT DISTINCT store_id
      FROM orders_index
      WHERE customer_id IS NULL
      ORDER BY store_id
    `);

    const stores = storesResult.rows.map(r => r.store_id);
    console.log(`[backfill-customer-id] Found ${stores.length} stores with NULL customer_id`);

    const summary = {
      stores: [],
      total_updated: 0,
      total_batches: 0,
    };

    for (const storeId of stores) {
      const result = await backfillStoreCustomerId(storeId);
      summary.stores.push({
        store_id: storeId,
        updated: result.updated,
        batches: result.batches,
      });
      summary.total_updated += result.updated;
      summary.total_batches += result.batches;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    jobStatus.total_updated = summary.total_updated;
    jobStatus.batches_processed = summary.total_batches;
    jobStatus.finished_at = new Date().toISOString();
    jobStatus.is_running = false;

    console.log(
      `[backfill-customer-id] JOB COMPLETE: ` +
      `${summary.total_updated} rows updated across ${stores.length} stores in ${duration}s`
    );

    return summary;
  } catch (err) {
    jobStatus.last_error = err.message || String(err);
    jobStatus.finished_at = new Date().toISOString();
    jobStatus.is_running = false;
    throw err;
  }
}

module.exports = {
  runBackfillJob,
  getBackfillStatus,
  getNullCustomerIdCount,
};
