// services/aiInsightsService.js
// AI Insights service for generating actionable product sales analytics
// Implements caching, context building, and LLM orchestration
// Output language: Romanian

const crypto = require('crypto');
const { query } = require('../lib/db');
const { generateJSON, getStatus: getLLMStatus } = require('./llmService');
const { buildSalesSnapshot, getTodayBucharest } = require('./productSalesService');

// Configuration
const CACHE_TTL_MINUTES = 30;
const PROMPT_VERSION = 'v2.0-sales-ro';

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
  }
}

/**
 * Build the system prompt for product sales insights (Romanian)
 * @returns {string} System prompt
 */
function buildSalesSystemPrompt() {
  return `Ești un analist e-commerce expert. Analizezi datele de vânzări și generezi recomandări concrete pentru ce produse să promovezi ACUM.

REGULI STRICTE:
1. Răspunde DOAR cu JSON valid. Fără markdown, fără explicații în afara JSON-ului.
2. Scrie în ROMÂNĂ - scurt, direct, acționabil.
3. Folosește cifrele din context. NU inventa date.
4. Concentrează-te pe: ce se vinde bine, ce are momentum, ce să promovezi și unde.
5. Ia în calcul sezonalitatea (luna curentă, evenimente).
6. Dacă lipsesc date, menționează în "gaps_date" și oferă ce poți.
7. Moneda: RON sau EUR (din context).

FORMAT JSON STRICT:
{
  "titlu": "string (5-8 cuvinte, titlu scurt)",
  "sumar": "string (1-2 propoziții, rezumat executiv)",
  "produse_recomandate": [
    {
      "nume": "string (numele produsului)",
      "sku": "string sau null",
      "de_ce": "string (motivul recomandării, max 15 cuvinte)",
      "metrici": "string (ex: '45 buc, 12.500 RON, +25% față de săpt. trecută')",
      "magazine_recomandate": ["string"] sau null,
      "actiuni": ["string (1-2 acțiuni concrete)"]
    }
  ],
  "produse_momentum": [
    {
      "nume": "string",
      "trend": "string (ex: 'Urcat 3 poziții', 'Nou în top 10')",
      "actiune": "string"
    }
  ],
  "bestsellers_stabili": [
    {
      "nume": "string",
      "consistenta": "string (ex: 'Top 3 constant ultimele 30 zile')"
    }
  ],
  "context_sezon": "string sau null (ce e relevant pentru luna/sezonul curent)",
  "numere": {
    "venit_7_zile": number,
    "trend_procent": number sau null,
    "produs_top": "string",
    "comenzi_7_zile": number
  },
  "incredere": "scazuta" | "medie" | "ridicata",
  "gaps_date": ["string (ce date lipsesc pentru analiză mai bună)"]
}`;
}

/**
 * Build the user prompt for product sales insights (Romanian)
 * @param {object} context - Sales context
 * @returns {string} User prompt
 */
function buildSalesUserPrompt(context) {
  const seasonInfo = context.season
    ? `Luna curentă: ${context.current_month} (${context.season.name}). Evenimente relevante: ${context.season.events.join(', ') || 'niciunul'}.`
    : '';

  return `Analizează datele de vânzări și generează recomandări pentru CE PRODUSE SĂ PROMOVEZ ACUM.

${seasonInfo}

Întrebări cheie:
1. Care sunt TOP 5 produse de promovat acum și de ce?
2. Ce produse au momentum (cresc rapid)?
3. Ce bestsellers sunt constante și sigure?
4. Pe ce magazine să mă concentrez pentru fiecare produs?
5. Ce acțiuni concrete recomandezi? (ex: pune pe homepage, bundling, reducere test, etc.)

Răspunde în română, format JSON strict.`;
}

/**
 * Get home product sales insight for a store
 * Main entry point for AI-powered sales analytics
 *
 * @param {string} storeId - Store ID or 'ALL'
 * @param {boolean} forceRefresh - Skip cache and regenerate
 * @returns {Promise<object>} Insight response
 */
async function getHomeProductInsight(storeId = 'ALL', forceRefresh = false) {
  console.log(`[ai-insights] Getting product sales insight for ${storeId}, force=${forceRefresh}`);

  const today = getTodayBucharest();
  const cacheKey = `home:sales:${storeId}:${today}`;

  // Check LLM availability
  const llmStatus = getLLMStatus();

  // Build context from DB
  let context;
  let dataRefreshRunning = false;

  try {
    // Build sales snapshot (DB-first, no Shopify calls)
    context = await buildSalesSnapshot(storeId);
    dataRefreshRunning = false; // Sales queries are synchronous

    console.log(`[ai-insights] Built sales context: ${JSON.stringify(context).length} chars`);
  } catch (err) {
    console.error(`[ai-insights] Failed to build sales context:`, err);

    // Return error response without LLM call
    return {
      insight: {
        error: true,
        titlu: 'Date indisponibile',
        sumar: 'Nu am putut extrage datele de vânzări. Încearcă din nou.',
        produse_recomandate: [],
        numere: {},
        incredere: 'scazuta',
        generated_at: new Date().toISOString(),
      },
      cache: { hit: false, expires_at: null },
      refresh: { data_refresh_running: false },
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
        refresh: { data_refresh_running: dataRefreshRunning },
        llm: llmStatus,
        metrics: extractMetricsSummary(context),
      };
    }
  }

  // Check if LLM is available
  if (!llmStatus.available) {
    console.log(`[ai-insights] LLM not available: ${llmStatus.reason}`);

    // Return fallback insight without AI (in Romanian)
    const fallbackInsight = generateSalesFallbackInsight(context);

    return {
      insight: fallbackInsight,
      cache: { hit: false, expires_at: null },
      refresh: { data_refresh_running: dataRefreshRunning },
      llm: llmStatus,
      metrics: extractMetricsSummary(context),
    };
  }

  // Generate insight via LLM
  console.log(`[ai-insights] Generating sales insight via LLM...`);

  const llmResponse = await generateJSON({
    system: buildSalesSystemPrompt(),
    user: buildSalesUserPrompt(context),
    jsonContext: context,
  });

  if (llmResponse.error) {
    console.error(`[ai-insights] LLM generation failed:`, llmResponse.message);

    // Return fallback with error info
    const fallbackInsight = generateSalesFallbackInsight(context);
    fallbackInsight.llm_error = llmResponse.message;

    return {
      insight: fallbackInsight,
      cache: { hit: false, expires_at: null },
      refresh: { data_refresh_running: dataRefreshRunning },
      llm: { ...llmStatus, error: llmResponse.message },
      metrics: extractMetricsSummary(context),
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
    insightType: 'home_sales',
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
    refresh: { data_refresh_running: dataRefreshRunning },
    llm: {
      ...llmStatus,
      usage: llmResponse.usage,
    },
    metrics: extractMetricsSummary(context),
  };
}

/**
 * Extract a summary of key metrics for UI display (even without LLM)
 * @param {object} context - Sales context
 * @returns {object} Metrics summary
 */
function extractMetricsSummary(context) {
  const last7d = context.last_7_days || {};
  const last30d = context.last_30_days || {};
  const topProduct = context.top_products_7d?.[0];

  return {
    venit_7_zile: last7d.total_revenue || 0,
    venit_30_zile: last30d.total_revenue || 0,
    comenzi_7_zile: last7d.order_count || 0,
    comenzi_30_zile: last30d.order_count || 0,
    unitati_7_zile: last7d.total_units || 0,
    trend_7_zile: last7d.trend_percent,
    trend_30_zile: last30d.trend_percent,
    produs_top: topProduct?.product_title || null,
    produs_top_venit: topProduct?.total_revenue || 0,
    nr_produse_vandute: context.top_products_7d?.length || 0,
  };
}

/**
 * Generate a fallback insight when LLM is unavailable (Romanian)
 * Uses simple rules-based analysis
 * @param {object} context - The sales context
 * @returns {object} Fallback insight in Romanian
 */
function generateSalesFallbackInsight(context) {
  const last7d = context.last_7_days || {};
  const topProducts = context.top_products_7d || [];
  const momentumProducts = context.momentum_products || [];
  const steadyBestsellers = context.steady_bestsellers || [];
  const season = context.season || {};

  // Build recommended products from top sellers
  const produseRecomandate = topProducts.slice(0, 5).map((p, idx) => ({
    nume: p.product_title,
    sku: p.sku !== 'N/A' ? p.sku : null,
    de_ce: idx === 0 ? 'Cel mai bine vândut (7 zile)' : `Top ${idx + 1} vânzări`,
    metrici: `${p.units_sold} buc, ${formatNumber(p.total_revenue)} RON`,
    magazine_recomandate: p.store_count > 1 ? p.stores_selling : null,
    actiuni: [idx < 2 ? 'Menține vizibilitate maximă' : 'Monitorizează stocul'],
  }));

  // Build momentum products
  const produseMomentum = momentumProducts.slice(0, 3).map(p => ({
    nume: p.product_title,
    trend: p.momentum_label || 'În creștere',
    actiune: 'Crește vizibilitatea',
  }));

  // Build steady bestsellers
  const bestsellersStabili = steadyBestsellers.slice(0, 3).map(p => ({
    nume: p.product_title,
    consistenta: p.consistency_label || 'Vânzări constante',
  }));

  // Season context
  let contextSezon = null;
  if (season.events?.length > 0) {
    contextSezon = `${season.name.charAt(0).toUpperCase() + season.name.slice(1)}: ${season.events.join(', ')}`;
  }

  // Numbers
  const numere = {
    venit_7_zile: last7d.total_revenue || 0,
    trend_procent: last7d.trend_percent,
    produs_top: topProducts[0]?.product_title || null,
    comenzi_7_zile: last7d.order_count || 0,
  };

  // Determine confidence
  let incredere = 'scazuta';
  if (last7d.order_count >= 50 && topProducts.length >= 5) {
    incredere = 'medie';
  }

  return {
    titlu: 'Produse de Promovat (Analiză de Bază)',
    sumar: `Ultimele 7 zile: ${formatNumber(last7d.total_revenue || 0)} RON din ${last7d.order_count || 0} comenzi. Analiză AI indisponibilă - metrici de bază.`,
    produse_recomandate: produseRecomandate,
    produse_momentum: produseMomentum,
    bestsellers_stabili: bestsellersStabili,
    context_sezon: contextSezon,
    numere,
    incredere,
    gaps_date: ['Analiză AI indisponibilă - configurează ANTHROPIC_API_KEY pentru insight-uri detaliate'],
    generated_at: new Date().toISOString(),
    fallback: true,
  };
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num == null) return '0';
  return Math.round(num).toLocaleString('ro-RO');
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
  getHomeProductInsight,
  invalidateCache,
  cleanExpiredCache,
  CACHE_TTL_MINUTES,
  PROMPT_VERSION,
};
