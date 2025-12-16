// services/aiInsightsService.js
// AI Insights service for generating actionable analytics
// Implements caching, context building, and LLM orchestration

const crypto = require('crypto');
const { query } = require('../lib/db');
const { generateJSON, getStatus: getLLMStatus, LLM_MODEL } = require('./llmService');
const { getReturnsSnapshot, getTopReturnStores, getTopRefundedProducts, getTodayBucharest } = require('./returnsService');
const { getHomeMetrics } = require('./metricsService');

// Configuration
const CACHE_TTL_MINUTES = 30;
const PROMPT_VERSION = 'v1.0';

/**
 * Generate a deterministic hash of the context object
 * @param {object} context - Context object
 * @returns {string} SHA256 hash
 */
function hashContext(context) {
  const str = JSON.stringify(context, Object.keys(context).sort());
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
}

/**
 * Get cached insight from database
 * @param {string} cacheKey - Cache key
 * @param {string} contextHash - Expected context hash
 * @returns {Promise<object|null>} Cached payload or null
 */
async function getCachedInsight(cacheKey, contextHash) {
  try {
    const result = await query(
      `SELECT payload, generated_at, expires_at, model, context_hash
       FROM ai_insights_cache
       WHERE cache_key = $1
         AND expires_at > NOW()
         AND context_hash = $2`,
      [cacheKey, contextHash]
    );

    if (result.rows.length > 0) {
      console.log(`[ai-insights] Cache HIT for ${cacheKey}`);
      return {
        hit: true,
        payload: result.rows[0].payload,
        generated_at: result.rows[0].generated_at,
        expires_at: result.rows[0].expires_at,
        model: result.rows[0].model,
      };
    }

    console.log(`[ai-insights] Cache MISS for ${cacheKey}`);
    return null;
  } catch (err) {
    console.error(`[ai-insights] Cache lookup failed:`, err);
    return null;
  }
}

/**
 * Store insight in cache
 * @param {object} options - Cache options
 */
async function cacheInsight({ cacheKey, storeId, insightType, contextHash, model, payload }) {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO ai_insights_cache (cache_key, store_id, insight_type, context_hash, model, prompt_version, generated_at, expires_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
       ON CONFLICT (cache_key)
       DO UPDATE SET
         context_hash = EXCLUDED.context_hash,
         model = EXCLUDED.model,
         prompt_version = EXCLUDED.prompt_version,
         generated_at = NOW(),
         expires_at = EXCLUDED.expires_at,
         payload = EXCLUDED.payload`,
      [cacheKey, storeId, insightType, contextHash, model, PROMPT_VERSION, expiresAt, payload]
    );

    console.log(`[ai-insights] Cached insight for ${cacheKey}, expires at ${expiresAt.toISOString()}`);
  } catch (err) {
    console.error(`[ai-insights] Failed to cache insight:`, err);
    // Don't throw - caching is optional
  }
}

/**
 * Build the system prompt for returns insights
 * @returns {string} System prompt
 */
function buildReturnsSystemPrompt() {
  return `You are a sharp e-commerce analyst focused on identifying money loss from returns/refunds.
Your job is to analyze the provided data and generate actionable insights.

RULES:
1. Output ONLY valid JSON. No markdown, no explanations, no code blocks.
2. Be concise and specific. Use numbers and percentages.
3. Focus on WHERE money is being lost and WHY.
4. If data is missing (e.g., no refund reasons), acknowledge it and suggest tracking improvements.
5. Don't hallucinate data. Only reference what's in the context.
6. Use a professional but direct tone.
7. Currency is assumed to be store currency (often RON or EUR).

OUTPUT FORMAT (strict JSON):
{
  "title": "string (short title, 5-10 words)",
  "summary": "string (1-2 sentence executive summary)",
  "bullets": ["string (3-6 key findings, each 1 line)"],
  "actions": ["string (3-5 concrete next steps)"],
  "risks": ["string (0-3 potential risks or concerns, optional)"],
  "numbers": {
    "return_rate_percent": number or null,
    "total_refunded_month": number or null,
    "top_refund_store": "string or null",
    "top_refund_product": "string or null"
  },
  "confidence": "low" | "medium" | "high",
  "data_gaps": ["string (list any missing data that would improve analysis)"]
}`;
}

/**
 * Build the user prompt for returns insights
 * @returns {string} User prompt
 */
function buildReturnsUserPrompt() {
  return `Analyze the returns/refunds data below and generate insights focused on money loss.

Key questions to answer:
1. What is the overall return rate and trend?
2. Which stores have the highest return rates?
3. Which products are being returned most often?
4. How much money is being lost to refunds?
5. What patterns or anomalies do you see?
6. What specific actions should be taken?

If refund reasons are not available, note this as a data gap and recommend tracking them.

Generate the analysis as JSON following the specified format.`;
}

/**
 * Get home returns insight for a store
 * Main entry point for AI-powered returns analytics
 *
 * @param {string} storeId - Store ID or 'ALL'
 * @param {boolean} forceRefresh - Skip cache and regenerate
 * @returns {Promise<object>} Insight response
 */
async function getHomeReturnsInsight(storeId = 'ALL', forceRefresh = false) {
  console.log(`[ai-insights] Getting home returns insight for ${storeId}, force=${forceRefresh}`);

  const today = getTodayBucharest();
  const cacheKey = `home:returns:${storeId}:${today}`;

  // Check LLM availability
  const llmStatus = getLLMStatus();

  // Build context from DB
  let context;
  let returnsRefreshRunning = false;
  let returnsLastAggDate = null;

  try {
    // Fetch all data in parallel
    const [ordersMetrics, returnsSnapshot, topStores, topProducts] = await Promise.all([
      getHomeMetrics(storeId),
      getReturnsSnapshot(storeId),
      getTopReturnStores(30, 5),
      getTopRefundedProducts(storeId, 30, 10),
    ]);

    returnsRefreshRunning = returnsSnapshot.refresh_running || ordersMetrics.refresh_running;
    returnsLastAggDate = returnsSnapshot.last_agg_date;

    // Calculate return rates
    const weekReturnRate = ordersMetrics.week_orders > 0
      ? ((returnsSnapshot.week_returns / ordersMetrics.week_orders) * 100).toFixed(2)
      : null;

    const monthReturnRate = ordersMetrics.month_orders > 0
      ? ((returnsSnapshot.month_returns / ordersMetrics.month_orders) * 100).toFixed(2)
      : null;

    context = {
      store_id: storeId,
      date: today,
      timezone: 'Europe/Bucharest',

      // Orders metrics
      orders: {
        today: ordersMetrics.today_orders,
        week: ordersMetrics.week_orders,
        month: ordersMetrics.month_orders,
        year: ordersMetrics.year_orders,
        today_revenue: ordersMetrics.today_revenue,
        week_revenue: ordersMetrics.week_revenue,
        month_revenue: ordersMetrics.month_revenue,
        year_revenue: ordersMetrics.year_revenue,
      },

      // Returns metrics
      returns: {
        today: returnsSnapshot.today_returns,
        today_amount: returnsSnapshot.today_refund_amount,
        week: returnsSnapshot.week_returns,
        week_amount: returnsSnapshot.week_refund_amount,
        month: returnsSnapshot.month_returns,
        month_amount: returnsSnapshot.month_refund_amount,
        year: returnsSnapshot.year_returns,
        year_amount: returnsSnapshot.year_refund_amount,
      },

      // Calculated rates
      return_rates: {
        week_percent: weekReturnRate ? parseFloat(weekReturnRate) : null,
        month_percent: monthReturnRate ? parseFloat(monthReturnRate) : null,
      },

      // Top stores by return rate
      top_return_stores: topStores,

      // Top refunded products
      top_refunded_products: topProducts,

      // Data freshness
      data_freshness: {
        returns_last_agg_date: returnsSnapshot.last_agg_date,
        orders_last_sync: ordersMetrics.last_sync_at,
      },
    };

    console.log(`[ai-insights] Built context: ${JSON.stringify(context).length} chars`);
  } catch (err) {
    console.error(`[ai-insights] Failed to build context:`, err);

    // Return error response without LLM call
    return {
      insight: {
        error: true,
        title: 'Data Unavailable',
        summary: 'Unable to fetch returns data. Please try again later.',
        bullets: [`Error: ${err.message}`],
        actions: ['Check database connectivity', 'Verify returns aggregation is running'],
        numbers: {},
        confidence: 'low',
        generated_at: new Date().toISOString(),
      },
      cache: { hit: false, expires_at: null },
      refresh: {
        returns_refresh_running: false,
        returns_last_agg_date: null,
      },
      llm: llmStatus,
    };
  }

  // Generate context hash
  const contextHash = hashContext(context);

  // Check cache (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedInsight(cacheKey, contextHash);

    if (cached) {
      return {
        insight: cached.payload,
        cache: {
          hit: true,
          expires_at: cached.expires_at,
          generated_at: cached.generated_at,
        },
        refresh: {
          returns_refresh_running: returnsRefreshRunning,
          returns_last_agg_date: returnsLastAggDate,
        },
        llm: llmStatus,
      };
    }
  }

  // Check if LLM is available
  if (!llmStatus.available) {
    console.log(`[ai-insights] LLM not available: ${llmStatus.reason}`);

    // Return fallback insight without AI
    const fallbackInsight = generateFallbackInsight(context);

    return {
      insight: fallbackInsight,
      cache: { hit: false, expires_at: null },
      refresh: {
        returns_refresh_running: returnsRefreshRunning,
        returns_last_agg_date: returnsLastAggDate,
      },
      llm: llmStatus,
    };
  }

  // Generate insight via LLM
  console.log(`[ai-insights] Generating insight via LLM...`);

  const llmResponse = await generateJSON({
    system: buildReturnsSystemPrompt(),
    user: buildReturnsUserPrompt(),
    jsonContext: context,
  });

  if (llmResponse.error) {
    console.error(`[ai-insights] LLM generation failed:`, llmResponse.message);

    // Return fallback with error info
    const fallbackInsight = generateFallbackInsight(context);
    fallbackInsight.llm_error = llmResponse.message;

    return {
      insight: fallbackInsight,
      cache: { hit: false, expires_at: null },
      refresh: {
        returns_refresh_running: returnsRefreshRunning,
        returns_last_agg_date: returnsLastAggDate,
      },
      llm: { ...llmStatus, error: llmResponse.message },
    };
  }

  // Add metadata to insight
  const insight = {
    ...llmResponse.result,
    generated_at: new Date().toISOString(),
    model: llmResponse.model,
  };

  // Cache the result
  await cacheInsight({
    cacheKey,
    storeId,
    insightType: 'home_returns',
    contextHash,
    model: llmResponse.model,
    payload: insight,
  });

  const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000);

  return {
    insight,
    cache: {
      hit: false,
      expires_at: expiresAt.toISOString(),
      generated_at: new Date().toISOString(),
    },
    refresh: {
      returns_refresh_running: returnsRefreshRunning,
      returns_last_agg_date: returnsLastAggDate,
    },
    llm: {
      ...llmStatus,
      usage: llmResponse.usage,
    },
  };
}

/**
 * Generate a fallback insight when LLM is unavailable
 * Uses simple rules-based analysis
 * @param {object} context - The data context
 * @returns {object} Fallback insight
 */
function generateFallbackInsight(context) {
  const bullets = [];
  const actions = [];
  const numbers = {};

  // Basic analysis
  const monthReturns = context.returns?.month || 0;
  const monthOrders = context.orders?.month || 0;
  const monthRefundAmount = context.returns?.month_amount || 0;

  if (monthOrders > 0) {
    const returnRate = ((monthReturns / monthOrders) * 100).toFixed(1);
    numbers.return_rate_percent = parseFloat(returnRate);
    bullets.push(`Monthly return rate: ${returnRate}% (${monthReturns} returns out of ${monthOrders} orders)`);
  } else {
    bullets.push('No order data available for this period');
  }

  numbers.total_refunded_month = monthRefundAmount;
  if (monthRefundAmount > 0) {
    bullets.push(`Total refunded this month: ${monthRefundAmount.toLocaleString()} (store currency)`);
  }

  // Top stores
  if (context.top_return_stores?.length > 0) {
    const top = context.top_return_stores[0];
    numbers.top_refund_store = top.store_id;
    bullets.push(`Highest return rate: ${top.store_id} at ${top.return_rate}%`);
  }

  // Top products
  if (context.top_refunded_products?.length > 0) {
    const top = context.top_refunded_products[0];
    numbers.top_refund_product = top.product_title;
    bullets.push(`Most refunded product: "${top.product_title}" (${top.refund_count} refunds)`);
  }

  // Default actions
  actions.push('Review top refunded products for quality issues');
  actions.push('Analyze stores with high return rates');
  actions.push('Consider implementing refund reason tracking');

  if (monthReturns === 0 && monthOrders > 0) {
    bullets.push('No refunds recorded this month - data may need aggregation');
    actions.unshift('Trigger returns data refresh to ensure accuracy');
  }

  return {
    title: 'Returns Overview (Basic Analysis)',
    summary: `This month: ${monthReturns} returns totaling ${monthRefundAmount.toLocaleString()} refunded. AI analysis unavailable - showing basic metrics.`,
    bullets,
    actions,
    risks: [],
    numbers,
    confidence: 'low',
    data_gaps: ['AI analysis unavailable - configure ANTHROPIC_API_KEY for detailed insights'],
    generated_at: new Date().toISOString(),
    fallback: true,
  };
}

/**
 * Invalidate cache for a store
 * @param {string} storeId - Store ID or 'ALL'
 * @returns {Promise<number>} Number of rows deleted
 */
async function invalidateCache(storeId) {
  try {
    const result = await query(
      `DELETE FROM ai_insights_cache WHERE store_id = $1`,
      [storeId]
    );

    console.log(`[ai-insights] Invalidated ${result.rowCount} cached insights for ${storeId}`);
    return result.rowCount;
  } catch (err) {
    console.error(`[ai-insights] Failed to invalidate cache:`, err);
    return 0;
  }
}

/**
 * Clean up expired cache entries
 * @returns {Promise<number>} Number of rows deleted
 */
async function cleanExpiredCache() {
  try {
    const result = await query(
      `DELETE FROM ai_insights_cache WHERE expires_at < NOW()`
    );

    if (result.rowCount > 0) {
      console.log(`[ai-insights] Cleaned up ${result.rowCount} expired cache entries`);
    }

    return result.rowCount;
  } catch (err) {
    console.error(`[ai-insights] Failed to clean expired cache:`, err);
    return 0;
  }
}

module.exports = {
  getHomeReturnsInsight,
  invalidateCache,
  cleanExpiredCache,
  CACHE_TTL_MINUTES,
  PROMPT_VERSION,
};
