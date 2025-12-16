// services/productSalesService.js
// DB-first product sales data extraction for AI Insights
// Extracts sales metrics from orders_detail.raw_json line_items
// Uses Europe/Bucharest timezone for business date boundaries

const { query } = require('../lib/db');

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
 * Get current month number (1-12) in Bucharest timezone
 * @returns {number} Month number
 */
function getCurrentMonthBucharest() {
  const now = new Date();
  const bucharest = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Bucharest' }));
  return bucharest.getMonth() + 1;
}

/**
 * Get date N days ago in Bucharest timezone
 * @param {number} daysAgo - Number of days to go back
 * @returns {string} Date in YYYY-MM-DD format
 */
function getDateDaysAgo(daysAgo) {
  const today = getTodayBucharest();
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Build a product sales snapshot from orders_detail.raw_json
 * Extracts line_items and aggregates by product
 *
 * Exclusion logic (conservative):
 * - Excludes orders with financial_status in ('refunded', 'voided')
 * - Excludes orders where cancelled_at is not null
 * - Uses raw_json fields when available, falls back to orders_index
 *
 * @param {string} storeId - Store ID or 'ALL' for all stores
 * @param {string} fromDate - Start date YYYY-MM-DD
 * @param {string} toDate - End date YYYY-MM-DD
 * @param {number} limit - Max products to return (default 20)
 * @returns {Promise<Array>} Array of product sales data
 */
async function getTopSellingProducts(storeId, fromDate, toDate, limit = 20) {
  console.log(`[product-sales] Getting top products for ${storeId} from ${fromDate} to ${toDate}`);

  const storeFilter = storeId === 'ALL' ? '' : 'AND od.store_id = $4';
  const params = storeId === 'ALL'
    ? [fromDate, toDate, limit]
    : [fromDate, toDate, limit, storeId];

  // Query line_items from orders_detail.raw_json
  // Filter out cancelled/refunded orders
  // Group by product title and SKU
  const queryText = `
    WITH valid_orders AS (
      SELECT
        od.store_id,
        od.order_id,
        od.raw_json,
        (od.raw_json->>'created_at')::TIMESTAMPTZ AS order_created_at
      FROM orders_detail od
      WHERE
        -- Date filter in Bucharest timezone
        ((od.raw_json->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE >= $1
        AND ((od.raw_json->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE <= $2
        -- Exclude cancelled orders
        AND (od.raw_json->>'cancelled_at') IS NULL
        -- Exclude refunded/voided orders (conservative filter)
        AND COALESCE(od.raw_json->>'financial_status', 'paid') NOT IN ('refunded', 'voided')
        ${storeFilter}
    ),
    line_items_expanded AS (
      SELECT
        vo.store_id,
        vo.order_id,
        vo.order_created_at,
        li->>'sku' AS sku,
        li->>'title' AS product_title,
        li->>'variant_title' AS variant_title,
        COALESCE((li->>'quantity')::INT, 1) AS quantity,
        COALESCE((li->>'price')::NUMERIC, 0) AS unit_price,
        li->>'product_id' AS product_id
      FROM valid_orders vo,
           jsonb_array_elements(COALESCE(vo.raw_json->'line_items', '[]'::jsonb)) AS li
      WHERE li->>'title' IS NOT NULL
        -- Exclude gift cards (they're not real product sales)
        AND COALESCE((li->>'gift_card')::BOOLEAN, false) = false
    )
    SELECT
      COALESCE(sku, 'N/A') AS sku,
      product_title,
      product_id,
      SUM(quantity)::INT AS units_sold,
      ROUND(SUM(quantity * unit_price)::NUMERIC, 2) AS total_revenue,
      ROUND(AVG(unit_price)::NUMERIC, 2) AS avg_price,
      COUNT(DISTINCT order_id)::INT AS order_count,
      -- Store distribution: which stores sold this product
      jsonb_agg(DISTINCT store_id) AS stores_selling,
      COUNT(DISTINCT store_id)::INT AS store_count
    FROM line_items_expanded
    GROUP BY sku, product_title, product_id
    HAVING SUM(quantity) > 0
    ORDER BY total_revenue DESC
    LIMIT $3
  `;

  try {
    const result = await query(queryText, params);

    console.log(`[product-sales] Found ${result.rows.length} products`);

    return result.rows.map(r => ({
      sku: r.sku,
      product_title: r.product_title,
      product_id: r.product_id,
      units_sold: r.units_sold,
      total_revenue: Number(r.total_revenue),
      avg_price: Number(r.avg_price),
      order_count: r.order_count,
      stores_selling: r.stores_selling || [],
      store_count: r.store_count,
    }));
  } catch (err) {
    console.error(`[product-sales] Query failed:`, err);
    return [];
  }
}

/**
 * Get store-level sales breakdown for a specific period
 * @param {string} storeId - Store ID or 'ALL'
 * @param {string} fromDate - Start date YYYY-MM-DD
 * @param {string} toDate - End date YYYY-MM-DD
 * @returns {Promise<Array>} Array of store sales data
 */
async function getStoreSalesBreakdown(storeId, fromDate, toDate) {
  const storeFilter = storeId === 'ALL' ? '' : 'AND od.store_id = $3';
  const params = storeId === 'ALL' ? [fromDate, toDate] : [fromDate, toDate, storeId];

  const queryText = `
    WITH valid_orders AS (
      SELECT
        od.store_id,
        od.raw_json
      FROM orders_detail od
      WHERE
        ((od.raw_json->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE >= $1
        AND ((od.raw_json->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE <= $2
        AND (od.raw_json->>'cancelled_at') IS NULL
        AND COALESCE(od.raw_json->>'financial_status', 'paid') NOT IN ('refunded', 'voided')
        ${storeFilter}
    ),
    line_items_expanded AS (
      SELECT
        vo.store_id,
        COALESCE((li->>'quantity')::INT, 1) AS quantity,
        COALESCE((li->>'price')::NUMERIC, 0) AS unit_price
      FROM valid_orders vo,
           jsonb_array_elements(COALESCE(vo.raw_json->'line_items', '[]'::jsonb)) AS li
      WHERE COALESCE((li->>'gift_card')::BOOLEAN, false) = false
    )
    SELECT
      store_id,
      SUM(quantity)::INT AS units_sold,
      ROUND(SUM(quantity * unit_price)::NUMERIC, 2) AS total_revenue,
      COUNT(*)::INT AS line_item_count
    FROM line_items_expanded
    GROUP BY store_id
    ORDER BY total_revenue DESC
  `;

  try {
    const result = await query(queryText, params);
    return result.rows.map(r => ({
      store_id: r.store_id,
      units_sold: r.units_sold,
      total_revenue: Number(r.total_revenue),
      line_item_count: r.line_item_count,
    }));
  } catch (err) {
    console.error(`[product-sales] Store breakdown query failed:`, err);
    return [];
  }
}

/**
 * Get aggregated sales totals for a period
 * @param {string} storeId - Store ID or 'ALL'
 * @param {string} fromDate - Start date
 * @param {string} toDate - End date
 * @returns {Promise<object>} { total_revenue, total_units, order_count }
 */
async function getSalesTotals(storeId, fromDate, toDate) {
  const storeFilter = storeId === 'ALL' ? '' : 'AND od.store_id = $3';
  const params = storeId === 'ALL' ? [fromDate, toDate] : [fromDate, toDate, storeId];

  const queryText = `
    WITH valid_orders AS (
      SELECT
        od.order_id,
        od.raw_json
      FROM orders_detail od
      WHERE
        ((od.raw_json->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE >= $1
        AND ((od.raw_json->>'created_at')::TIMESTAMPTZ AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Bucharest')::DATE <= $2
        AND (od.raw_json->>'cancelled_at') IS NULL
        AND COALESCE(od.raw_json->>'financial_status', 'paid') NOT IN ('refunded', 'voided')
        ${storeFilter}
    ),
    line_items_expanded AS (
      SELECT
        vo.order_id,
        COALESCE((li->>'quantity')::INT, 1) AS quantity,
        COALESCE((li->>'price')::NUMERIC, 0) AS unit_price
      FROM valid_orders vo,
           jsonb_array_elements(COALESCE(vo.raw_json->'line_items', '[]'::jsonb)) AS li
      WHERE COALESCE((li->>'gift_card')::BOOLEAN, false) = false
    )
    SELECT
      COALESCE(SUM(quantity), 0)::INT AS total_units,
      COALESCE(ROUND(SUM(quantity * unit_price)::NUMERIC, 2), 0) AS total_revenue,
      COUNT(DISTINCT order_id)::INT AS order_count
    FROM line_items_expanded
  `;

  try {
    const result = await query(queryText, params);
    const row = result.rows[0] || {};
    return {
      total_units: row.total_units || 0,
      total_revenue: Number(row.total_revenue || 0),
      order_count: row.order_count || 0,
    };
  } catch (err) {
    console.error(`[product-sales] Totals query failed:`, err);
    return { total_units: 0, total_revenue: 0, order_count: 0 };
  }
}

/**
 * Build complete sales snapshot for AI insights context
 * Includes current period, previous period (for trend), and top products
 *
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<object>} Complete sales snapshot
 */
async function buildSalesSnapshot(storeId = 'ALL') {
  console.log(`[product-sales] Building sales snapshot for ${storeId}`);

  const today = getTodayBucharest();
  const currentMonth = getCurrentMonthBucharest();

  // Date ranges
  const last7DaysStart = getDateDaysAgo(6);  // 7 days including today
  const prev7DaysStart = getDateDaysAgo(13); // Previous 7 days
  const prev7DaysEnd = getDateDaysAgo(7);

  const last30DaysStart = getDateDaysAgo(29); // 30 days including today
  const prev30DaysStart = getDateDaysAgo(59); // Previous 30 days
  const prev30DaysEnd = getDateDaysAgo(30);

  // Fetch all data in parallel
  const [
    topProducts7d,
    topProducts30d,
    totals7d,
    totalsPrev7d,
    totals30d,
    totalsPrev30d,
    storeBreakdown7d,
  ] = await Promise.all([
    getTopSellingProducts(storeId, last7DaysStart, today, 10),
    getTopSellingProducts(storeId, last30DaysStart, today, 15),
    getSalesTotals(storeId, last7DaysStart, today),
    getSalesTotals(storeId, prev7DaysStart, prev7DaysEnd),
    getSalesTotals(storeId, last30DaysStart, today),
    getSalesTotals(storeId, prev30DaysStart, prev30DaysEnd),
    getStoreSalesBreakdown(storeId, last7DaysStart, today),
  ]);

  // Calculate trends (percentage change)
  const trend7d = totalsPrev7d.total_revenue > 0
    ? ((totals7d.total_revenue - totalsPrev7d.total_revenue) / totalsPrev7d.total_revenue * 100).toFixed(1)
    : null;

  const trend30d = totalsPrev30d.total_revenue > 0
    ? ((totals30d.total_revenue - totalsPrev30d.total_revenue) / totalsPrev30d.total_revenue * 100).toFixed(1)
    : null;

  // Identify momentum products (appear in top 7d but not as high in 30d, or higher rank)
  const momentumProducts = identifyMomentumProducts(topProducts7d, topProducts30d);

  // Identify steady bestsellers (consistent in both periods)
  const steadyBestsellers = identifySteadyBestsellers(topProducts7d, topProducts30d);

  // Season context
  const seasonContext = getSeasonContext(currentMonth);

  const snapshot = {
    store_id: storeId,
    generated_at: new Date().toISOString(),
    current_date: today,
    current_month: currentMonth,
    season: seasonContext,

    // Period totals
    last_7_days: {
      from: last7DaysStart,
      to: today,
      ...totals7d,
      trend_percent: trend7d ? parseFloat(trend7d) : null,
    },
    last_30_days: {
      from: last30DaysStart,
      to: today,
      ...totals30d,
      trend_percent: trend30d ? parseFloat(trend30d) : null,
    },

    // Top products
    top_products_7d: topProducts7d,
    top_products_30d: topProducts30d,

    // Analysis
    momentum_products: momentumProducts,
    steady_bestsellers: steadyBestsellers,

    // Store breakdown (for multi-store context)
    store_breakdown: storeBreakdown7d,

    // Data quality indicators
    data_quality: {
      has_7d_data: totals7d.order_count > 0,
      has_30d_data: totals30d.order_count > 0,
      has_trend_data: trend7d !== null,
      product_count_7d: topProducts7d.length,
      product_count_30d: topProducts30d.length,
    },
  };

  console.log(`[product-sales] Snapshot built: ${totals7d.order_count} orders (7d), ${totals30d.order_count} orders (30d)`);

  return snapshot;
}

/**
 * Identify products with rising momentum (performing better recently)
 * @param {Array} products7d - Top products in last 7 days
 * @param {Array} products30d - Top products in last 30 days
 * @returns {Array} Products with momentum
 */
function identifyMomentumProducts(products7d, products30d) {
  const momentum = [];
  const products30dMap = new Map(products30d.map((p, idx) => [p.sku || p.product_title, { ...p, rank30d: idx + 1 }]));

  products7d.forEach((p, idx) => {
    const key = p.sku || p.product_title;
    const rank7d = idx + 1;
    const product30d = products30dMap.get(key);

    if (!product30d) {
      // New product in top 10 that wasn't in top 15 of 30d = high momentum
      momentum.push({
        ...p,
        rank_7d: rank7d,
        rank_30d: null,
        momentum_type: 'new_entrant',
        momentum_label: 'Produs nou în top',
      });
    } else if (rank7d < product30d.rank30d - 2) {
      // Moved up significantly in ranking
      momentum.push({
        ...p,
        rank_7d: rank7d,
        rank_30d: product30d.rank30d,
        momentum_type: 'rising',
        momentum_label: `Urcat ${product30d.rank30d - rank7d} poziții`,
      });
    }
  });

  return momentum.slice(0, 5);
}

/**
 * Identify steady bestsellers (consistent performers)
 * @param {Array} products7d - Top products in last 7 days
 * @param {Array} products30d - Top products in last 30 days
 * @returns {Array} Steady bestsellers
 */
function identifySteadyBestsellers(products7d, products30d) {
  const steady = [];
  const products7dMap = new Map(products7d.map((p, idx) => [p.sku || p.product_title, { ...p, rank7d: idx + 1 }]));

  products30d.slice(0, 10).forEach((p, idx) => {
    const key = p.sku || p.product_title;
    const rank30d = idx + 1;
    const product7d = products7dMap.get(key);

    if (product7d && Math.abs(product7d.rank7d - rank30d) <= 2) {
      // Consistent ranking in both periods
      steady.push({
        ...p,
        rank_7d: product7d.rank7d,
        rank_30d: rank30d,
        consistency_label: 'Vânzări constante',
      });
    }
  });

  return steady.slice(0, 5);
}

/**
 * Get season context based on month
 * @param {number} month - Month number 1-12
 * @returns {object} Season context
 */
function getSeasonContext(month) {
  const seasons = {
    12: { name: 'iarnă', events: ['Crăciun', 'Revelion'], is_holiday: true },
    1: { name: 'iarnă', events: ['Post-sărbători', 'Reduceri de iarnă'], is_holiday: false },
    2: { name: 'iarnă', events: ['Valentine\'s Day', 'Mărțișor'], is_holiday: false },
    3: { name: 'primăvară', events: ['8 Martie', 'Început primăvară'], is_holiday: false },
    4: { name: 'primăvară', events: ['Paște'], is_holiday: true },
    5: { name: 'primăvară', events: [], is_holiday: false },
    6: { name: 'vară', events: ['Început vară', 'Vacanțe'], is_holiday: false },
    7: { name: 'vară', events: ['Sezon vacanțe'], is_holiday: false },
    8: { name: 'vară', events: ['Back to school'], is_holiday: false },
    9: { name: 'toamnă', events: ['Început an școlar'], is_holiday: false },
    10: { name: 'toamnă', events: ['Halloween'], is_holiday: false },
    11: { name: 'toamnă', events: ['Black Friday', 'Pregătire sărbători'], is_holiday: false },
  };

  return seasons[month] || { name: 'necunoscut', events: [], is_holiday: false };
}

module.exports = {
  buildSalesSnapshot,
  getTopSellingProducts,
  getStoreSalesBreakdown,
  getSalesTotals,
  getTodayBucharest,
  getCurrentMonthBucharest,
};
