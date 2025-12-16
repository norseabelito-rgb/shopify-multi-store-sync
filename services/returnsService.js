// services/returnsService.js
// Service for daily returns/refunds aggregation and retrieval
// Uses Europe/Bucharest timezone for business date boundaries (same as metricsService)

const { query, getPool } = require('../lib/db');

/**
 * Get today's date in Europe/Bucharest timezone
 * @returns {string} Date in YYYY-MM-DD format
 */
function getTodayBucharest() {
  const now = new Date();
  const bucharest = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
  return bucharest.toISOString().split('T')[0];
}

/**
 * Aggregate returns/refunds for a specific date and upsert into returns_daily_agg
 *
 * Detection logic (conservative, DB-first from orders_detail.raw_json):
 * 1. Check raw_json.refunds array - this is the primary source
 * 2. Sum refund_line_items.subtotal + total_tax for refund amount
 * 3. Also check transactions for kind='refund' amounts as backup
 * 4. Count orders that have non-empty refunds array
 *
 * @param {string} date - Date in YYYY-MM-DD format (in Europe/Bucharest timezone)
 * @returns {Promise<object>} Summary of aggregation
 */
async function aggregateDailyReturns(date) {
  console.log(`[returns] Aggregating returns for date: ${date} (Europe/Bucharest timezone)`);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Query orders_detail to find orders with refunds on this date
    // We check both:
    // 1. Orders created on this date that have refunds
    // 2. Refunds created on this date (refunds[].created_at)
    // For simplicity in MVP, we'll aggregate by refund creation date when available
    const refundsQuery = `
      WITH refund_data AS (
        SELECT
          od.store_id,
          od.order_id,
          od.raw_json,
          -- Extract refunds array
          jsonb_array_elements(COALESCE(od.raw_json->'refunds', '[]'::jsonb)) AS refund
        FROM orders_detail od
        WHERE od.raw_json->'refunds' IS NOT NULL
          AND jsonb_array_length(COALESCE(od.raw_json->'refunds', '[]'::jsonb)) > 0
      ),
      refunds_on_date AS (
        SELECT
          store_id,
          order_id,
          raw_json,
          refund,
          -- Get refund created_at date in Bucharest timezone
          ((refund->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE AS refund_date,
          -- Calculate refund amount from refund_line_items
          (
            SELECT COALESCE(SUM(
              COALESCE((rli->>'subtotal')::NUMERIC, 0) +
              COALESCE((rli->>'total_tax')::NUMERIC, 0)
            ), 0)
            FROM jsonb_array_elements(COALESCE(refund->'refund_line_items', '[]'::jsonb)) AS rli
          ) AS line_item_amount,
          -- Also get transaction amount as backup
          (
            SELECT COALESCE(SUM((tx->>'amount')::NUMERIC), 0)
            FROM jsonb_array_elements(COALESCE(refund->'transactions', '[]'::jsonb)) AS tx
            WHERE tx->>'kind' = 'refund' AND tx->>'status' = 'success'
          ) AS transaction_amount,
          -- Try to extract refund reason/note
          refund->>'note' AS refund_note
        FROM refund_data
      )
      SELECT
        store_id,
        COUNT(DISTINCT order_id)::INT AS returns_count,
        -- Use line_item_amount if available, otherwise transaction_amount
        COALESCE(SUM(CASE WHEN line_item_amount > 0 THEN line_item_amount ELSE transaction_amount END), 0)::NUMERIC AS refund_amount,
        -- Get most common reason (best effort)
        MODE() WITHIN GROUP (ORDER BY refund_note) AS top_reason
      FROM refunds_on_date
      WHERE refund_date = $1
      GROUP BY store_id
      ORDER BY store_id
    `;

    const storeResult = await client.query(refundsQuery, [date]);
    const stores = storeResult.rows;

    console.log(`[returns] Found ${stores.length} stores with refunds on ${date}`);

    // Upsert per-store metrics
    for (const store of stores) {
      await client.query(
        `INSERT INTO returns_daily_agg (agg_date, store_id, returns_count, refund_amount, top_reason, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (agg_date, store_id)
         DO UPDATE SET
           returns_count = EXCLUDED.returns_count,
           refund_amount = EXCLUDED.refund_amount,
           top_reason = EXCLUDED.top_reason,
           updated_at = NOW()`,
        [date, store.store_id, store.returns_count, store.refund_amount, store.top_reason]
      );

      console.log(`[returns]   ${store.store_id}: ${store.returns_count} returns, ${store.refund_amount} refunded`);
    }

    // Compute and upsert total (store_id='ALL')
    const totalReturns = stores.reduce((sum, s) => sum + s.returns_count, 0);
    const totalRefunded = stores.reduce((sum, s) => sum + Number(s.refund_amount), 0);

    await client.query(
      `INSERT INTO returns_daily_agg (agg_date, store_id, returns_count, refund_amount, top_reason, updated_at)
       VALUES ($1, 'ALL', $2, $3, NULL, NOW())
       ON CONFLICT (agg_date, store_id)
       DO UPDATE SET
         returns_count = EXCLUDED.returns_count,
         refund_amount = EXCLUDED.refund_amount,
         updated_at = NOW()`,
      [date, totalReturns, totalRefunded]
    );

    console.log(`[returns]   ALL: ${totalReturns} returns, ${totalRefunded} refunded`);

    await client.query('COMMIT');

    console.log(`[returns] Aggregation complete for ${date}`);

    return {
      date,
      stores,
      total: {
        store_id: 'ALL',
        returns_count: totalReturns,
        refund_amount: totalRefunded,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[returns] Aggregation failed for ${date}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get max agg_date from returns_daily_agg for a store
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<string|null>} Max date in YYYY-MM-DD format or null
 */
async function getMaxReturnsAggDate(storeId) {
  const result = await query(
    `SELECT MAX(agg_date) AS max_date FROM returns_daily_agg WHERE store_id = $1`,
    [storeId]
  );
  return result.rows[0]?.max_date || null;
}

/**
 * Try to acquire advisory lock for returns refresh
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<boolean>} True if lock acquired
 */
async function tryAcquireReturnsLock(storeId) {
  // Use a different base key to avoid collision with orders metrics lock
  let lockKey = 1000000; // Base offset for returns
  for (let i = 0; i < storeId.length; i++) {
    lockKey = (lockKey * 31 + storeId.charCodeAt(i)) & 0x7FFFFFFF;
  }

  const result = await query('SELECT pg_try_advisory_lock($1) AS acquired', [lockKey]);
  const acquired = result.rows[0]?.acquired || false;

  console.log(`[returns] Advisory lock for ${storeId} (key=${lockKey}): ${acquired ? 'ACQUIRED' : 'FAILED'}`);
  return acquired;
}

/**
 * Release advisory lock for returns refresh
 * @param {string} storeId - Store ID or 'ALL'
 */
async function releaseReturnsLock(storeId) {
  let lockKey = 1000000;
  for (let i = 0; i < storeId.length; i++) {
    lockKey = (lockKey * 31 + storeId.charCodeAt(i)) & 0x7FFFFFFF;
  }

  await query('SELECT pg_advisory_unlock($1)', [lockKey]);
  console.log(`[returns] Advisory lock released for ${storeId} (key=${lockKey})`);
}

/**
 * Incremental refresh of returns_daily_agg from fromDate to toDate
 * @param {string} storeId - Store ID (for context/logging)
 * @param {string} fromDate - Start date YYYY-MM-DD
 * @param {string} toDate - End date YYYY-MM-DD
 * @returns {Promise<object>} Summary
 */
async function incrementalReturnsRefresh(storeId, fromDate, toDate) {
  console.log(`[returns] Starting incremental refresh: ${fromDate} → ${toDate}`);

  let datesRefreshed = 0;
  const currentDate = new Date(fromDate);
  const endDate = new Date(toDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    try {
      await aggregateDailyReturns(dateStr);
      datesRefreshed++;
    } catch (err) {
      console.error(`[returns] Failed to refresh ${dateStr}:`, err.message);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[returns] Incremental refresh complete: ${datesRefreshed} dates (${fromDate} → ${toDate})`);

  return {
    dates_refreshed: datesRefreshed,
    from_date: fromDate,
    to_date: toDate,
  };
}

/**
 * Background refresh job for returns (non-blocking)
 * @param {string} storeId - Store ID or 'ALL'
 * @param {string} today - Today's date YYYY-MM-DD
 * @param {string} maxAggDate - Current max agg_date or null
 */
async function backgroundReturnsRefreshJob(storeId, today, maxAggDate) {
  let lockAcquired = false;

  try {
    lockAcquired = await tryAcquireReturnsLock(storeId);

    if (!lockAcquired) {
      console.log(`[returns] Background refresh skipped: another refresh is running`);
      return;
    }

    // Calculate missing date range
    let fromDateStr;
    if (maxAggDate) {
      const fromDate = new Date(maxAggDate);
      fromDate.setDate(fromDate.getDate() + 1);
      fromDateStr = fromDate.toISOString().split('T')[0];
    } else {
      // No data - start from 30 days ago (conservative initial backfill)
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      fromDateStr = thirtyDaysAgo.toISOString().split('T')[0];
    }

    console.log(`[returns] Background refresh starting: ${fromDateStr} → ${today}`);
    await incrementalReturnsRefresh(storeId, fromDateStr, today);
    console.log(`[returns] Background refresh completed`);
  } catch (err) {
    console.error(`[returns] Background refresh failed:`, err);
  } finally {
    if (lockAcquired) {
      try {
        await releaseReturnsLock(storeId);
      } catch (err) {
        console.error(`[returns] Failed to release lock:`, err);
      }
    }
  }
}

/**
 * Get returns snapshot metrics for a store
 * Returns today/week/month/year returns_count and refund_amount
 * Implements lazy incremental refresh
 *
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<object>} Returns metrics
 */
async function getReturnsSnapshot(storeId = 'ALL') {
  console.log(`[returns] Fetching returns snapshot for store: ${storeId}`);

  const today = getTodayBucharest();

  // Check staleness and trigger background refresh
  let refreshRunning = false;
  let lastAggDate = null;

  try {
    const maxAggDate = await getMaxReturnsAggDate(storeId);
    lastAggDate = maxAggDate;

    if (!maxAggDate || maxAggDate < today) {
      console.log(`[returns] Stale data detected: max_agg_date=${maxAggDate}, today=${today}`);

      const lockAcquired = await tryAcquireReturnsLock(storeId);

      if (lockAcquired) {
        refreshRunning = true;

        // Trigger background refresh without awaiting
        setImmediate(() => {
          backgroundReturnsRefreshJob(storeId, today, maxAggDate)
            .catch(err => console.error(`[returns] Background refresh error:`, err));
        });

        console.log(`[returns] Background refresh triggered`);
      } else {
        refreshRunning = true;
        console.log(`[returns] Refresh already running`);
      }
    }
  } catch (err) {
    console.error(`[returns] Failed to check staleness:`, err);
  }

  // Calculate date boundaries (same logic as metricsService)
  const todayDate = new Date(today);

  // Week start (Monday)
  const weekStart = new Date(todayDate);
  const dayOfWeek = weekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Month start
  const monthStart = `${today.substring(0, 7)}-01`;

  // Year start
  const yearStart = `${today.substring(0, 4)}-01-01`;

  // Query aggregated data
  const [todayRes, weekRes, monthRes, yearRes] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(returns_count), 0)::INT AS count, COALESCE(SUM(refund_amount), 0)::NUMERIC AS amount
       FROM returns_daily_agg
       WHERE store_id = $1 AND agg_date = $2`,
      [storeId, today]
    ),
    query(
      `SELECT COALESCE(SUM(returns_count), 0)::INT AS count, COALESCE(SUM(refund_amount), 0)::NUMERIC AS amount
       FROM returns_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, weekStartStr, today]
    ),
    query(
      `SELECT COALESCE(SUM(returns_count), 0)::INT AS count, COALESCE(SUM(refund_amount), 0)::NUMERIC AS amount
       FROM returns_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, monthStart, today]
    ),
    query(
      `SELECT COALESCE(SUM(returns_count), 0)::INT AS count, COALESCE(SUM(refund_amount), 0)::NUMERIC AS amount
       FROM returns_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, yearStart, today]
    ),
  ]);

  const snapshot = {
    store_id: storeId,
    today_returns: todayRes.rows[0]?.count || 0,
    today_refund_amount: Number(todayRes.rows[0]?.amount || 0),
    week_returns: weekRes.rows[0]?.count || 0,
    week_refund_amount: Number(weekRes.rows[0]?.amount || 0),
    month_returns: monthRes.rows[0]?.count || 0,
    month_refund_amount: Number(monthRes.rows[0]?.amount || 0),
    year_returns: yearRes.rows[0]?.count || 0,
    year_refund_amount: Number(yearRes.rows[0]?.amount || 0),
    refresh_running: refreshRunning,
    last_agg_date: lastAggDate,
    target_date: today,
  };

  console.log(`[returns] Snapshot for ${storeId}: today=${snapshot.today_returns}, week=${snapshot.week_returns}, month=${snapshot.month_returns}, year=${snapshot.year_returns}`);

  return snapshot;
}

/**
 * Get top stores by return rate (returns_count / orders_count) for last N days
 * @param {number} days - Number of days to look back (default 30)
 * @param {number} limit - Number of stores to return (default 3)
 * @returns {Promise<Array>} Array of { store_id, return_rate, returns_count, orders_count, refund_amount }
 */
async function getTopReturnStores(days = 30, limit = 3) {
  const today = getTodayBucharest();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startDateStr = startDate.toISOString().split('T')[0];

  const result = await query(`
    SELECT
      r.store_id,
      COALESCE(SUM(r.returns_count), 0)::INT AS returns_count,
      COALESCE(SUM(r.refund_amount), 0)::NUMERIC AS refund_amount,
      COALESCE(SUM(o.orders_count), 0)::INT AS orders_count,
      CASE
        WHEN COALESCE(SUM(o.orders_count), 0) > 0
        THEN ROUND(100.0 * COALESCE(SUM(r.returns_count), 0) / SUM(o.orders_count), 2)
        ELSE 0
      END AS return_rate
    FROM returns_daily_agg r
    LEFT JOIN orders_daily_agg o ON r.store_id = o.store_id AND r.agg_date = o.agg_date
    WHERE r.store_id != 'ALL'
      AND r.agg_date >= $1
      AND r.agg_date <= $2
    GROUP BY r.store_id
    HAVING COALESCE(SUM(r.returns_count), 0) > 0
    ORDER BY return_rate DESC, refund_amount DESC
    LIMIT $3
  `, [startDateStr, today, limit]);

  return result.rows.map(r => ({
    store_id: r.store_id,
    return_rate: Number(r.return_rate),
    returns_count: r.returns_count,
    orders_count: r.orders_count,
    refund_amount: Number(r.refund_amount),
  }));
}

/**
 * Get top refunded products/SKUs from recent orders (last N days)
 * Scans orders_detail for refund_line_items to find most refunded products
 * @param {string} storeId - Store ID or 'ALL'
 * @param {number} days - Number of days to look back (default 30)
 * @param {number} limit - Number of products to return (default 10)
 * @returns {Promise<Array>} Array of { sku, product_title, refund_count, refund_amount }
 */
async function getTopRefundedProducts(storeId = 'ALL', days = 30, limit = 10) {
  const today = getTodayBucharest();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startDateStr = startDate.toISOString().split('T')[0];

  // This query extracts refunded line items and aggregates by SKU/title
  const storeFilter = storeId === 'ALL' ? '' : 'AND od.store_id = $4';

  const queryText = `
    WITH refund_items AS (
      SELECT
        od.store_id,
        od.order_id,
        refund->'refund_line_items' AS refund_line_items
      FROM orders_detail od,
           jsonb_array_elements(COALESCE(od.raw_json->'refunds', '[]'::jsonb)) AS refund
      WHERE jsonb_array_length(COALESCE(od.raw_json->'refunds', '[]'::jsonb)) > 0
        AND ((refund->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE >= $1
        AND ((refund->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE <= $2
        ${storeFilter}
    ),
    exploded_items AS (
      SELECT
        ri.store_id,
        ri.order_id,
        item->>'line_item_id' AS line_item_id,
        COALESCE((item->>'subtotal')::NUMERIC, 0) + COALESCE((item->>'total_tax')::NUMERIC, 0) AS refund_amount,
        COALESCE((item->>'quantity')::INT, 1) AS quantity
      FROM refund_items ri,
           jsonb_array_elements(COALESCE(ri.refund_line_items, '[]'::jsonb)) AS item
    ),
    with_product_info AS (
      SELECT
        ei.store_id,
        ei.order_id,
        ei.line_item_id,
        ei.refund_amount,
        ei.quantity,
        li->>'sku' AS sku,
        li->>'title' AS product_title,
        li->>'variant_title' AS variant_title
      FROM exploded_items ei
      LEFT JOIN LATERAL (
        SELECT li
        FROM orders_detail od,
             jsonb_array_elements(od.raw_json->'line_items') AS li
        WHERE od.store_id = ei.store_id
          AND od.order_id = ei.order_id
          AND (li->>'id')::TEXT = ei.line_item_id
        LIMIT 1
      ) product ON true
    )
    SELECT
      COALESCE(sku, 'N/A') AS sku,
      COALESCE(product_title, 'Unknown Product') AS product_title,
      COUNT(*)::INT AS refund_count,
      SUM(quantity)::INT AS total_units,
      COALESCE(SUM(refund_amount), 0)::NUMERIC AS refund_amount
    FROM with_product_info
    GROUP BY sku, product_title
    ORDER BY refund_amount DESC, refund_count DESC
    LIMIT $3
  `;

  const params = storeId === 'ALL'
    ? [startDateStr, today, limit]
    : [startDateStr, today, limit, storeId];

  try {
    const result = await query(queryText, params);

    return result.rows.map(r => ({
      sku: r.sku,
      product_title: r.product_title,
      refund_count: r.refund_count,
      total_units: r.total_units,
      refund_amount: Number(r.refund_amount),
    }));
  } catch (err) {
    console.error(`[returns] Failed to get top refunded products:`, err);
    // Return empty array on error - don't crash
    return [];
  }
}

/**
 * Manual refresh for returns aggregation (used by tasks endpoint)
 * @param {string} storeId - Store ID or 'ALL'
 * @param {string} fromDate - Start date YYYY-MM-DD
 * @param {string} toDate - End date YYYY-MM-DD
 * @returns {Promise<object>} Result
 */
async function manualReturnsRefresh(storeId, fromDate, toDate) {
  console.log(`[returns-manual] Manual refresh requested: ${fromDate} → ${toDate}`);

  let lockAcquired = false;

  try {
    lockAcquired = await tryAcquireReturnsLock(storeId);

    if (!lockAcquired) {
      return {
        ok: false,
        lock_acquired: false,
        error: 'Refresh already running',
      };
    }

    const result = await incrementalReturnsRefresh(storeId, fromDate, toDate);

    return {
      ok: true,
      lock_acquired: true,
      dates_refreshed: result.dates_refreshed,
      from_date: result.from_date,
      to_date: result.to_date,
    };
  } catch (err) {
    console.error(`[returns-manual] Failed:`, err);
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await releaseReturnsLock(storeId);
      } catch (err) {
        console.error(`[returns-manual] Failed to release lock:`, err);
      }
    }
  }
}

module.exports = {
  aggregateDailyReturns,
  getReturnsSnapshot,
  getTopReturnStores,
  getTopRefundedProducts,
  getMaxReturnsAggDate,
  manualReturnsRefresh,
  getTodayBucharest,
};
