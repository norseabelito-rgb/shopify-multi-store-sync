// services/productSalesAggService.js
// Service for daily product sales aggregation and top sellers analytics
// Uses Europe/Bucharest timezone for business date boundaries
// DB-first: aggregates from orders_detail.raw_json, only includes SKUs in products_master

const { query, getPool } = require('../lib/db');

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get today's date in Europe/Bucharest timezone
 * @returns {string} Date in YYYY-MM-DD format
 */
function getTodayBucharestDate() {
  const now = new Date();
  const bucharestNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
  return bucharestNow.toISOString().split('T')[0];
}

/**
 * Calculate date range based on timeframe
 * @param {string} timeframe - '7d', 'month', or 'ytd'
 * @returns {object} { from_date, to_date, label }
 */
function getDateRange(timeframe) {
  const today = getTodayBucharestDate();
  const todayDate = new Date(today);

  switch (timeframe) {
    case '7d': {
      const sevenDaysAgo = new Date(todayDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return {
        from_date: sevenDaysAgo.toISOString().split('T')[0],
        to_date: today,
        label: 'Ultimele 7 zile',
      };
    }
    case 'month': {
      const monthStart = `${today.substring(0, 7)}-01`;
      return {
        from_date: monthStart,
        to_date: today,
        label: 'Luna curentă',
      };
    }
    case 'ytd': {
      const yearStart = `${today.substring(0, 4)}-01-01`;
      return {
        from_date: yearStart,
        to_date: today,
        label: 'De la începutul anului',
      };
    }
    default:
      throw new Error(`Invalid timeframe: ${timeframe}`);
  }
}

// ==================== AGGREGATION FUNCTIONS ====================

/**
 * Aggregate product sales for a specific date and upsert into product_sales_daily_agg
 *
 * This function:
 * 1. Extracts line_items from orders_detail.raw_json
 * 2. Only includes SKUs that exist in products_master (our products)
 * 3. Excludes cancelled/voided orders
 * 4. Computes units_sold, gross_revenue, orders_count per SKU per store
 * 5. Also computes ALL stores aggregate
 *
 * @param {string} date - Date in YYYY-MM-DD format (in Europe/Bucharest timezone)
 * @returns {Promise<object>} Summary of aggregation
 */
async function aggregateDailyProductSales(date) {
  console.log(`[product-sales] Aggregating product sales for date: ${date} (Europe/Bucharest timezone)`);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Extract and aggregate line items from orders_detail
    // Only include orders where:
    // - Business date (Europe/Bucharest) matches target date
    // - Order is NOT cancelled (cancelled_at IS NULL)
    // - Order is NOT voided (financial_status != 'voided')
    // Only include SKUs that exist in products_master
    const aggQuery = `
      WITH valid_orders AS (
        SELECT
          od.store_id,
          od.order_id,
          od.raw_json
        FROM orders_detail od
        WHERE (od.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE = $1
          AND (od.raw_json->>'cancelled_at' IS NULL OR od.raw_json->>'cancelled_at' = '')
          AND COALESCE(od.raw_json->>'financial_status', '') NOT IN ('voided', '')
      ),
      line_items AS (
        SELECT
          vo.store_id,
          vo.order_id,
          li->>'sku' AS sku,
          COALESCE((li->>'quantity')::INT, 0) AS quantity,
          COALESCE((li->>'price')::NUMERIC, 0) AS unit_price
        FROM valid_orders vo,
        LATERAL jsonb_array_elements(vo.raw_json->'line_items') AS li
        WHERE li->>'sku' IS NOT NULL
          AND li->>'sku' != ''
      ),
      filtered_items AS (
        SELECT
          li.store_id,
          li.order_id,
          li.sku,
          li.quantity,
          li.unit_price * li.quantity AS line_revenue
        FROM line_items li
        INNER JOIN products_master pm ON pm.sku = li.sku
      )
      SELECT
        store_id,
        sku,
        SUM(quantity)::INT AS units_sold,
        SUM(line_revenue)::NUMERIC(12,2) AS gross_revenue,
        COUNT(DISTINCT order_id)::INT AS orders_count
      FROM filtered_items
      GROUP BY store_id, sku
      ORDER BY store_id, units_sold DESC
    `;

    const result = await client.query(aggQuery, [date]);
    const rows = result.rows;

    console.log(`[product-sales] Found ${rows.length} product-store combinations on ${date}`);

    // Step 2: Upsert per-store metrics
    let storeSkuCount = 0;
    for (const row of rows) {
      await client.query(
        `INSERT INTO product_sales_daily_agg (agg_date, store_id, sku, units_sold, gross_revenue, orders_count, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (agg_date, store_id, sku)
         DO UPDATE SET
           units_sold = EXCLUDED.units_sold,
           gross_revenue = EXCLUDED.gross_revenue,
           orders_count = EXCLUDED.orders_count,
           updated_at = NOW()`,
        [date, row.store_id, row.sku, row.units_sold, row.gross_revenue, row.orders_count]
      );
      storeSkuCount++;
    }

    // Step 3: Compute and upsert totals (store_id='ALL')
    // Group by SKU across all stores
    const allStoresQuery = `
      SELECT
        sku,
        SUM(units_sold)::INT AS units_sold,
        SUM(gross_revenue)::NUMERIC(12,2) AS gross_revenue,
        SUM(orders_count)::INT AS orders_count
      FROM product_sales_daily_agg
      WHERE agg_date = $1 AND store_id != 'ALL'
      GROUP BY sku
    `;

    const allStoresResult = await client.query(allStoresQuery, [date]);

    for (const row of allStoresResult.rows) {
      await client.query(
        `INSERT INTO product_sales_daily_agg (agg_date, store_id, sku, units_sold, gross_revenue, orders_count, updated_at)
         VALUES ($1, 'ALL', $2, $3, $4, $5, NOW())
         ON CONFLICT (agg_date, store_id, sku)
         DO UPDATE SET
           units_sold = EXCLUDED.units_sold,
           gross_revenue = EXCLUDED.gross_revenue,
           orders_count = EXCLUDED.orders_count,
           updated_at = NOW()`,
        [date, row.sku, row.units_sold, row.gross_revenue, row.orders_count]
      );
    }

    await client.query('COMMIT');

    const totalUnits = rows.reduce((sum, r) => sum + r.units_sold, 0);
    const totalRevenue = rows.reduce((sum, r) => sum + Number(r.gross_revenue), 0);

    console.log(`[product-sales] ✓ Aggregation complete for ${date}: ${storeSkuCount} store-SKU rows, ${allStoresResult.rows.length} ALL rows, ${totalUnits} units, ${totalRevenue.toFixed(2)} revenue`);

    return {
      date,
      store_sku_count: storeSkuCount,
      all_sku_count: allStoresResult.rows.length,
      total_units: totalUnits,
      total_revenue: totalRevenue,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[product-sales] ✗ Aggregation failed for ${date}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

// ==================== ADVISORY LOCK FUNCTIONS ====================

/**
 * Try to acquire a Postgres advisory lock for product sales refresh
 * Uses a different key space from orders metrics (offset by 1000000)
 *
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
async function tryAcquireRefreshLock(storeId) {
  // Generate a numeric lock key from storeId
  // Offset by 1000000 to avoid collision with orders metrics locks
  let lockKey = 1000000;
  for (let i = 0; i < storeId.length; i++) {
    lockKey = (lockKey * 31 + storeId.charCodeAt(i)) & 0x7FFFFFFF;
  }

  const result = await query('SELECT pg_try_advisory_lock($1) AS acquired', [lockKey]);
  const acquired = result.rows[0]?.acquired || false;

  console.log(`[product-sales] Advisory lock for ${storeId} (key=${lockKey}): ${acquired ? 'ACQUIRED' : 'FAILED (already locked)'}`);
  return acquired;
}

/**
 * Release a Postgres advisory lock
 * @param {string} storeId - Store ID or 'ALL'
 */
async function releaseRefreshLock(storeId) {
  let lockKey = 1000000;
  for (let i = 0; i < storeId.length; i++) {
    lockKey = (lockKey * 31 + storeId.charCodeAt(i)) & 0x7FFFFFFF;
  }

  await query('SELECT pg_advisory_unlock($1)', [lockKey]);
  console.log(`[product-sales] Advisory lock released for ${storeId} (key=${lockKey})`);
}

// ==================== STALENESS CHECK & REFRESH ====================

/**
 * Get the maximum agg_date from product_sales_daily_agg for a store
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<string|null>} Maximum agg_date in YYYY-MM-DD format or null if no data
 */
async function getMaxAggDate(storeId) {
  const result = await query(
    `SELECT MAX(agg_date)::TEXT AS max_date
     FROM product_sales_daily_agg
     WHERE store_id = $1`,
    [storeId]
  );
  return result.rows[0]?.max_date || null;
}

/**
 * Incrementally refresh product_sales_daily_agg from fromDate to toDate (inclusive)
 *
 * @param {string} storeId - Store ID or 'ALL' (for lock context)
 * @param {string} fromDate - Start date in YYYY-MM-DD format
 * @param {string} toDate - End date in YYYY-MM-DD format
 * @returns {Promise<object>} Summary { dates_refreshed, from_date, to_date }
 */
async function incrementalRefresh(storeId, fromDate, toDate) {
  console.log(`[product-sales] Starting incremental refresh: ${fromDate} → ${toDate}`);

  let datesRefreshed = 0;
  const currentDate = new Date(fromDate);
  const endDate = new Date(toDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    try {
      await aggregateDailyProductSales(dateStr);
      datesRefreshed++;
    } catch (err) {
      console.error(`[product-sales] Failed to refresh ${dateStr}:`, err.message);
      // Continue with next date even if one fails
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[product-sales] ✓ Incremental refresh complete: ${datesRefreshed} dates refreshed (${fromDate} → ${toDate})`);

  return {
    dates_refreshed: datesRefreshed,
    from_date: fromDate,
    to_date: toDate,
  };
}

/**
 * Background refresh job: runs incremental refresh with advisory lock
 * This runs asynchronously without blocking the response
 *
 * @param {string} storeId - Store ID or 'ALL'
 * @param {string} today - Today's date in YYYY-MM-DD format
 * @param {string} maxAggDate - Current max agg_date in YYYY-MM-DD format (can be null)
 */
async function backgroundRefreshJob(storeId, today, maxAggDate) {
  let lockAcquired = false;

  try {
    lockAcquired = await tryAcquireRefreshLock(storeId);

    if (!lockAcquired) {
      console.log(`[product-sales] Background refresh skipped for ${storeId}: another refresh is already running`);
      return;
    }

    // Calculate missing date range
    let fromDateStr;
    if (maxAggDate) {
      const fromDate = new Date(maxAggDate);
      fromDate.setDate(fromDate.getDate() + 1);
      fromDateStr = fromDate.toISOString().split('T')[0];
    } else {
      // No data at all - start from beginning of year
      fromDateStr = `${today.substring(0, 4)}-01-01`;
    }

    console.log(`[product-sales] Background refresh starting: ${fromDateStr} → ${today}`);

    await incrementalRefresh(storeId, fromDateStr, today);

    console.log(`[product-sales] ✓ Background refresh completed`);
  } catch (err) {
    console.error(`[product-sales] ✗ Background refresh failed:`, err);
  } finally {
    if (lockAcquired) {
      try {
        await releaseRefreshLock(storeId);
      } catch (err) {
        console.error(`[product-sales] Failed to release lock:`, err);
      }
    }
  }
}

// ==================== TOP SELLERS QUERY ====================

/**
 * Get top selling products for a store and timeframe
 * Implements lazy incremental refresh: checks staleness and triggers background update
 *
 * @param {string} storeId - Store ID or 'ALL' for all stores
 * @param {string} timeframe - '7d', 'month', or 'ytd'
 * @param {number} limit - Number of top sellers to return (default 5)
 * @returns {Promise<object>} Top sellers response with refresh flags
 */
async function getTopSellers(storeId = 'ALL', timeframe = 'month', limit = 5) {
  console.log(`[product-sales] Fetching top sellers for store=${storeId}, timeframe=${timeframe}, limit=${limit}`);

  const today = getTodayBucharestDate();
  const { from_date, to_date, label } = getDateRange(timeframe);

  // Check for staleness and trigger background refresh if needed
  let refreshTriggered = false;
  let refreshRunning = false;
  let lastAggDate = null;

  try {
    const maxAggDate = await getMaxAggDate(storeId);
    lastAggDate = maxAggDate;

    if (!maxAggDate || maxAggDate < today) {
      console.log(`[product-sales] Stale data detected: max_agg_date=${maxAggDate}, today=${today}`);

      const lockAcquired = await tryAcquireRefreshLock(storeId);

      if (lockAcquired) {
        refreshTriggered = true;
        refreshRunning = true;

        // Trigger background refresh without awaiting
        setImmediate(() => {
          backgroundRefreshJob(storeId, today, maxAggDate)
            .catch(err => console.error(`[product-sales] Background refresh error:`, err));
        });

        console.log(`[product-sales] Background refresh triggered: ${maxAggDate || 'null'} → ${today}`);
      } else {
        refreshRunning = true;
        console.log(`[product-sales] Refresh already running, skipping trigger`);
      }
    } else {
      console.log(`[product-sales] Data is up-to-date: max_agg_date=${maxAggDate}, today=${today}`);
    }
  } catch (err) {
    console.error(`[product-sales] Failed to check staleness:`, err);
  }

  // Query top sellers from aggregated data
  // Include product title from products_master
  // For ALL stores, also get the "best store" (store with most units for that SKU)
  let topSellersQuery;
  let queryParams;

  if (storeId === 'ALL') {
    topSellersQuery = `
      WITH ranked AS (
        SELECT
          psa.sku,
          pm.title_default AS title,
          SUM(psa.units_sold)::INT AS units_sold,
          SUM(psa.gross_revenue)::NUMERIC(12,2) AS gross_revenue,
          SUM(psa.orders_count)::INT AS orders_count
        FROM product_sales_daily_agg psa
        INNER JOIN products_master pm ON pm.sku = psa.sku
        WHERE psa.store_id = 'ALL'
          AND psa.agg_date >= $1
          AND psa.agg_date <= $2
        GROUP BY psa.sku, pm.title_default
        ORDER BY SUM(psa.units_sold) DESC
        LIMIT $3
      ),
      best_stores AS (
        SELECT DISTINCT ON (psa.sku)
          psa.sku,
          psa.store_id AS best_store_id,
          SUM(psa.units_sold) AS store_units
        FROM product_sales_daily_agg psa
        WHERE psa.store_id != 'ALL'
          AND psa.agg_date >= $1
          AND psa.agg_date <= $2
          AND psa.sku IN (SELECT sku FROM ranked)
        GROUP BY psa.sku, psa.store_id
        ORDER BY psa.sku, SUM(psa.units_sold) DESC
      )
      SELECT
        r.sku,
        r.title,
        r.units_sold,
        r.gross_revenue,
        r.orders_count,
        bs.best_store_id
      FROM ranked r
      LEFT JOIN best_stores bs ON bs.sku = r.sku
      ORDER BY r.units_sold DESC
    `;
    queryParams = [from_date, to_date, limit];
  } else {
    topSellersQuery = `
      SELECT
        psa.sku,
        pm.title_default AS title,
        SUM(psa.units_sold)::INT AS units_sold,
        SUM(psa.gross_revenue)::NUMERIC(12,2) AS gross_revenue,
        SUM(psa.orders_count)::INT AS orders_count,
        NULL AS best_store_id
      FROM product_sales_daily_agg psa
      INNER JOIN products_master pm ON pm.sku = psa.sku
      WHERE psa.store_id = $1
        AND psa.agg_date >= $2
        AND psa.agg_date <= $3
      GROUP BY psa.sku, pm.title_default
      ORDER BY SUM(psa.units_sold) DESC
      LIMIT $4
    `;
    queryParams = [storeId, from_date, to_date, limit];
  }

  const result = await query(topSellersQuery, queryParams);

  const response = {
    store_id: storeId,
    timeframe,
    timeframe_label: label,
    range: {
      from: from_date,
      to: to_date,
    },
    items: result.rows.map(row => ({
      sku: row.sku,
      title: row.title,
      units_sold: row.units_sold,
      gross_revenue: Number(row.gross_revenue),
      orders_count: row.orders_count,
      best_store_id: row.best_store_id || null,
    })),
    refresh_triggered: refreshTriggered,
    refresh_running: refreshRunning,
    last_agg_date: lastAggDate,
    target_date: today,
  };

  console.log(`[product-sales] Top sellers: ${response.items.length} items, refresh_triggered=${refreshTriggered}, refresh_running=${refreshRunning}`);

  return response;
}

// ==================== PRODUCT PERFORMANCE ====================

/**
 * Get detailed performance for a specific SKU
 * Returns breakdown by store + daily trend for last 30 days
 *
 * @param {string} sku - Product SKU
 * @param {string} timeframe - '7d', 'month', or 'ytd' for summary
 * @returns {Promise<object>} Performance data
 */
async function getProductPerformance(sku, timeframe = 'month') {
  console.log(`[product-sales] Fetching performance for SKU=${sku}, timeframe=${timeframe}`);

  const today = getTodayBucharestDate();
  const { from_date, to_date, label } = getDateRange(timeframe);

  // Get product info
  const productResult = await query(
    `SELECT sku, title_default AS title FROM products_master WHERE sku = $1`,
    [sku]
  );

  if (productResult.rows.length === 0) {
    return { error: 'Product not found', sku };
  }

  const product = productResult.rows[0];

  // Summary for selected timeframe (ALL stores)
  const summaryResult = await query(
    `SELECT
       SUM(units_sold)::INT AS units_sold,
       SUM(gross_revenue)::NUMERIC(12,2) AS gross_revenue,
       SUM(orders_count)::INT AS orders_count
     FROM product_sales_daily_agg
     WHERE sku = $1 AND store_id = 'ALL' AND agg_date >= $2 AND agg_date <= $3`,
    [sku, from_date, to_date]
  );

  // Breakdown by store for selected timeframe
  const byStoreResult = await query(
    `SELECT
       store_id,
       SUM(units_sold)::INT AS units_sold,
       SUM(gross_revenue)::NUMERIC(12,2) AS gross_revenue,
       SUM(orders_count)::INT AS orders_count
     FROM product_sales_daily_agg
     WHERE sku = $1 AND store_id != 'ALL' AND agg_date >= $2 AND agg_date <= $3
     GROUP BY store_id
     ORDER BY SUM(units_sold) DESC`,
    [sku, from_date, to_date]
  );

  // Daily trend for last 30 days
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const trendResult = await query(
    `SELECT
       agg_date,
       units_sold,
       gross_revenue,
       orders_count
     FROM product_sales_daily_agg
     WHERE sku = $1 AND store_id = 'ALL' AND agg_date >= $2 AND agg_date <= $3
     ORDER BY agg_date ASC`,
    [sku, thirtyDaysAgoStr, today]
  );

  return {
    sku: product.sku,
    title: product.title,
    timeframe,
    timeframe_label: label,
    range: {
      from: from_date,
      to: to_date,
    },
    summary: {
      units_sold: summaryResult.rows[0]?.units_sold || 0,
      gross_revenue: Number(summaryResult.rows[0]?.gross_revenue || 0),
      orders_count: summaryResult.rows[0]?.orders_count || 0,
    },
    by_store: byStoreResult.rows.map(row => ({
      store_id: row.store_id,
      units_sold: row.units_sold,
      gross_revenue: Number(row.gross_revenue),
      orders_count: row.orders_count,
    })),
    daily_trend: trendResult.rows.map(row => ({
      date: row.agg_date,
      units_sold: row.units_sold,
      gross_revenue: Number(row.gross_revenue),
      orders_count: row.orders_count,
    })),
  };
}

// ==================== BACKFILL UTILITY ====================

/**
 * Backfill product_sales_daily_agg for all dates in 2025
 * Iterates through each day in 2025 and runs aggregation
 * Idempotent - safe to re-run
 *
 * @returns {Promise<object>} Summary { year: 2025, days_processed, total_units }
 */
async function backfill2025() {
  console.log('[product-sales] Starting backfill for 2025...');

  const startDate = new Date('2025-01-01');
  const today = new Date(getTodayBucharestDate());
  const endDate = today < new Date('2025-12-31') ? today : new Date('2025-12-31');

  let daysProcessed = 0;
  let totalUnits = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    try {
      const result = await aggregateDailyProductSales(dateStr);
      daysProcessed++;
      totalUnits += result.total_units;

      // Log progress periodically
      if (currentDate.getDate() === 1 || currentDate.getDate() === 15) {
        console.log(`[product-sales] Progress: ${dateStr} - ${daysProcessed} days processed, ${totalUnits} total units`);
      }
    } catch (err) {
      console.error(`[product-sales] Failed to process ${dateStr}:`, err.message);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[product-sales] ✓ Backfill 2025 complete: ${daysProcessed} days processed, ${totalUnits} total units`);

  return {
    year: 2025,
    days_processed: daysProcessed,
    total_units: totalUnits,
  };
}

module.exports = {
  aggregateDailyProductSales,
  getTopSellers,
  getProductPerformance,
  backfill2025,
  getMaxAggDate,
  getTodayBucharestDate,
  getDateRange,
};
