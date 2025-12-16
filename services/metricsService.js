// services/metricsService.js
// Service for daily order metrics aggregation and retrieval
// Uses Europe/Bucharest timezone for business date boundaries

const { query, getPool } = require('../lib/db');

/**
 * Convert a UTC timestamp to Europe/Bucharest date (YYYY-MM-DD)
 * This ensures orders are counted on the correct business day.
 *
 * Implementation: We use Postgres AT TIME ZONE to convert UTC timestamps
 * to Europe/Bucharest timezone, then extract the date part.
 *
 * Example:
 * - Order created at 2025-01-15 22:30:00 UTC
 * - In Europe/Bucharest (UTC+2/UTC+3): 2025-01-16 00:30:00
 * - Business date: 2025-01-16
 *
 * @param {string} utcTimestamp - ISO timestamp in UTC
 * @returns {string} Date in YYYY-MM-DD format in Europe/Bucharest timezone
 */
function toBucharestDate(utcTimestamp) {
  // This is a helper for reference - actual conversion happens in SQL
  // using: (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE
  const d = new Date(utcTimestamp);
  return d.toLocaleString('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).split(',')[0];
}

/**
 * Get yesterday's date in Europe/Bucharest timezone
 * @returns {string} Date in YYYY-MM-DD format
 */
function getYesterdayBucharestDate() {
  const now = new Date();
  const bucharest = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
  bucharest.setDate(bucharest.getDate() - 1);
  return bucharest.toISOString().split('T')[0];
}

/**
 * Aggregate orders for a specific date and upsert into orders_daily_agg
 * This function computes daily metrics from orders_index using Europe/Bucharest timezone
 * for date boundaries, then stores both per-store and aggregate (store_id='ALL') rows.
 *
 * @param {string} date - Date in YYYY-MM-DD format (in Europe/Bucharest timezone)
 * @returns {Promise<object>} Summary of aggregation { date, stores: [...], total: {...} }
 */
async function aggregateDailyOrders(date) {
  console.log(`[metrics] Aggregating orders for date: ${date} (Europe/Bucharest timezone)`);

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Step 1: Aggregate orders per store using Europe/Bucharest timezone for date boundaries
    // We convert created_at (UTC) to Europe/Bucharest, then filter by date
    const storeAggQuery = `
      SELECT
        store_id,
        COUNT(*)::INT AS orders_count,
        COALESCE(SUM(total_price), 0)::NUMERIC AS gross_revenue
      FROM orders_index
      WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE = $1
      GROUP BY store_id
      ORDER BY store_id
    `;

    const storeResult = await client.query(storeAggQuery, [date]);
    const stores = storeResult.rows;

    console.log(`[metrics] Found ${stores.length} stores with orders on ${date}`);

    // Step 2: Upsert per-store metrics
    for (const store of stores) {
      await client.query(
        `INSERT INTO orders_daily_agg (agg_date, store_id, orders_count, gross_revenue, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (agg_date, store_id)
         DO UPDATE SET
           orders_count = EXCLUDED.orders_count,
           gross_revenue = EXCLUDED.gross_revenue,
           updated_at = NOW()`,
        [date, store.store_id, store.orders_count, store.gross_revenue]
      );

      console.log(`[metrics]   ${store.store_id}: ${store.orders_count} orders, ${store.gross_revenue} revenue`);
    }

    // Step 3: Compute and upsert total (store_id='ALL')
    const totalOrders = stores.reduce((sum, s) => sum + s.orders_count, 0);
    const totalRevenue = stores.reduce((sum, s) => sum + Number(s.gross_revenue), 0);

    await client.query(
      `INSERT INTO orders_daily_agg (agg_date, store_id, orders_count, gross_revenue, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (agg_date, store_id)
       DO UPDATE SET
         orders_count = EXCLUDED.orders_count,
         gross_revenue = EXCLUDED.gross_revenue,
         updated_at = NOW()`,
      [date, 'ALL', totalOrders, totalRevenue]
    );

    console.log(`[metrics]   ALL: ${totalOrders} orders, ${totalRevenue} revenue`);

    // Step 4: Handle stores with zero orders (optional - for completeness)
    // For now, we only store rows for stores that have orders on that date
    // If needed, we can query all known stores and insert 0 rows

    await client.query('COMMIT');

    console.log(`[metrics] ✓ Aggregation complete for ${date}`);

    return {
      date,
      stores,
      total: {
        store_id: 'ALL',
        orders_count: totalOrders,
        gross_revenue: totalRevenue,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[metrics] ✗ Aggregation failed for ${date}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Backfill orders_daily_agg for all dates in 2025
 * Iterates through each day in 2025 and runs aggregation
 * Idempotent - safe to re-run
 *
 * @returns {Promise<object>} Summary { year: 2025, days_processed, total_orders }
 */
async function backfill2025() {
  console.log('[metrics] Starting backfill for 2025...');

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  let daysProcessed = 0;
  let totalOrders = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    try {
      const result = await aggregateDailyOrders(dateStr);
      daysProcessed++;
      totalOrders += result.total.orders_count;

      // Log progress per month
      if (currentDate.getDate() === 1 || currentDate.getDate() === 15) {
        console.log(`[metrics] Progress: ${dateStr} - ${daysProcessed} days processed, ${totalOrders} total orders`);
      }
    } catch (err) {
      console.error(`[metrics] Failed to process ${dateStr}:`, err.message);
      // Continue with next date even if one fails
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[metrics] ✓ Backfill 2025 complete: ${daysProcessed} days processed, ${totalOrders} total orders`);

  return {
    year: 2025,
    days_processed: daysProcessed,
    total_orders: totalOrders,
  };
}

/**
 * Get last sync timestamp for a store or all stores
 * @param {string} storeId - Store ID or 'ALL' for all stores
 * @returns {Promise<object|null>} { last_sync_at, last_sync_status, store_id }
 */
async function getLastSync(storeId = 'ALL') {
  try {
    if (storeId === 'ALL') {
      // For "All stores", get the most recent sync across all stores
      const result = await query(`
        SELECT
          'ALL' as store_id,
          MAX(COALESCE(last_run_finished_at, last_run_started_at)) as last_sync_at,
          CASE
            WHEN COUNT(*) FILTER (WHERE last_run_error IS NOT NULL AND last_run_error != '') > 0 THEN 'error'
            WHEN MAX(COALESCE(last_run_finished_at, last_run_started_at)) IS NULL THEN 'never'
            ELSE 'success'
          END as last_sync_status
        FROM sync_state
      `);

      return result.rows[0] || { store_id: 'ALL', last_sync_at: null, last_sync_status: 'never' };
    } else {
      // For specific store
      const result = await query(`
        SELECT
          store_id,
          COALESCE(last_run_finished_at, last_run_started_at) as last_sync_at,
          CASE
            WHEN last_run_error IS NOT NULL AND last_run_error != '' THEN 'error'
            WHEN last_run_finished_at IS NULL AND last_run_started_at IS NULL THEN 'never'
            ELSE 'success'
          END as last_sync_status
        FROM sync_state
        WHERE store_id = $1
      `, [storeId]);

      return result.rows[0] || { store_id: storeId, last_sync_at: null, last_sync_status: 'never' };
    }
  } catch (err) {
    console.error('[metrics] Failed to get last sync:', err);
    return { store_id: storeId, last_sync_at: null, last_sync_status: 'error' };
  }
}

/**
 * Get per-store metrics from orders_daily_agg (replaces Shopify API calls)
 * @param {string} storeId - Store ID
 * @returns {Promise<object>} Store metrics
 */
async function getStoreMetrics(storeId) {
  // Get today's date in Bucharest timezone
  const now = new Date();
  const bucharestNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
  const today = bucharestNow.toISOString().split('T')[0];

  // Calculate date boundaries
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

  // Query orders_daily_agg for this specific store
  const [todayRes, weekRes, monthRes, yearRes] = await Promise.all([
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date = $2`,
      [storeId, today]
    ),
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, weekStartStr, today]
    ),
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, monthStart, today]
    ),
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, yearStart, today]
    ),
  ]);

  return {
    today_orders: todayRes.rows[0]?.count || 0,
    week_orders: weekRes.rows[0]?.count || 0,
    month_orders: monthRes.rows[0]?.count || 0,
    year_orders: yearRes.rows[0]?.count || 0,
  };
}

/**
 * Get homepage metrics from orders_daily_agg
 * Returns aggregated data for today, week, month, year, and last 30 days sparkline
 *
 * @param {string} storeId - Store ID or 'ALL' for all stores
 * @returns {Promise<object>} Metrics object
 */
async function getHomeMetrics(storeId = 'ALL') {
  console.log(`[metrics] Fetching home metrics for store: ${storeId}`);

  // Get today's date in Bucharest timezone
  const now = new Date();
  const bucharestNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
  const today = bucharestNow.toISOString().split('T')[0];

  // Calculate date boundaries
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

  // Last 30 days
  const thirtyDaysAgo = new Date(todayDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  // Log date boundaries for debugging
  console.log(`[metrics] Date boundaries (Europe/Bucharest):`, {
    today,
    week_start: weekStartStr,
    month_start: monthStart,
    year_start: yearStart,
  });

  // Query aggregated data
  const [todayRes, weekRes, monthRes, yearRes, sparklineRes] = await Promise.all([
    // Today
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count, COALESCE(SUM(gross_revenue), 0)::NUMERIC AS revenue
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date = $2`,
      [storeId, today]
    ),

    // Week (Monday to today)
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count, COALESCE(SUM(gross_revenue), 0)::NUMERIC AS revenue
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, weekStartStr, today]
    ),

    // Month
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count, COALESCE(SUM(gross_revenue), 0)::NUMERIC AS revenue
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, monthStart, today]
    ),

    // Year
    query(
      `SELECT COALESCE(SUM(orders_count), 0)::INT AS count, COALESCE(SUM(gross_revenue), 0)::NUMERIC AS revenue
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3`,
      [storeId, yearStart, today]
    ),

    // Last 30 days (for sparkline)
    query(
      `SELECT agg_date, orders_count, gross_revenue
       FROM orders_daily_agg
       WHERE store_id = $1 AND agg_date >= $2 AND agg_date <= $3
       ORDER BY agg_date ASC`,
      [storeId, thirtyDaysAgoStr, today]
    ),
  ]);

  // Get last sync timestamp
  const lastSync = await getLastSync(storeId);

  const metrics = {
    store_id: storeId,
    today_orders: todayRes.rows[0]?.count || 0,
    today_revenue: Number(todayRes.rows[0]?.revenue || 0),
    week_orders: weekRes.rows[0]?.count || 0,
    week_revenue: Number(weekRes.rows[0]?.revenue || 0),
    month_orders: monthRes.rows[0]?.count || 0,
    month_revenue: Number(monthRes.rows[0]?.revenue || 0),
    year_orders: yearRes.rows[0]?.count || 0,
    year_revenue: Number(yearRes.rows[0]?.revenue || 0),
    last_30_days: sparklineRes.rows.map(r => ({
      date: r.agg_date,
      orders_count: r.orders_count,
      revenue: Number(r.gross_revenue),
    })),
    last_sync_at: lastSync.last_sync_at,
    last_sync_status: lastSync.last_sync_status,
  };

  console.log(`[metrics] Metrics for ${storeId}: today=${metrics.today_orders}, week=${metrics.week_orders}, month=${metrics.month_orders}, year=${metrics.year_orders}, last_sync=${lastSync.last_sync_at}`);

  return metrics;
}

module.exports = {
  aggregateDailyOrders,
  backfill2025,
  getHomeMetrics,
  getStoreMetrics,
  getLastSync,
  getYesterdayBucharestDate,
};
