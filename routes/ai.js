// routes/ai.js
// API routes for AI-powered insights (Product Sales / Romanian)

const express = require('express');
const router = express.Router();

const { getHomeProductInsight, invalidateCache, cleanExpiredCache } = require('../services/aiInsightsService');
const { buildSalesSnapshot, getTodayBucharest } = require('../services/productSalesService');
const { getStatus: getLLMStatus } = require('../services/llmService');

// Rate limiting for regenerate button
const regenerateRateLimits = new Map(); // storeId -> lastRegenerateTime
const REGENERATE_COOLDOWN_MS = 30000; // 30 seconds between regenerates

/**
 * Helper: Check tasks secret for protected endpoints
 */
function requireTasksSecret(req, res, next) {
  const secret = process.env.TASKS_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'TASKS_SECRET not configured' });
  }

  const provided = req.headers['x-tasks-secret'];
  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/**
 * GET /ai/insights/home
 * Get AI-generated product sales insight for the home view (Romanian)
 *
 * Query params:
 * - store_id: Store ID or 'ALL' (default: 'ALL')
 * - force: '1' to force regenerate (skip cache)
 */
router.get('/insights/home', async (req, res) => {
  try {
    const storeId = req.query.store_id || 'ALL';
    const force = req.query.force === '1';

    console.log(`[ai-routes] GET /insights/home store_id=${storeId} force=${force}`);

    // Check rate limit for force regenerate
    if (force) {
      const lastRegenerate = regenerateRateLimits.get(storeId);
      const now = Date.now();

      if (lastRegenerate && (now - lastRegenerate) < REGENERATE_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((REGENERATE_COOLDOWN_MS - (now - lastRegenerate)) / 1000);

        return res.status(429).json({
          error: 'Rate limited',
          message: `Așteaptă ${waitSeconds} secunde înainte de regenerare`,
          retry_after: waitSeconds,
        });
      }

      // Update rate limit timestamp
      regenerateRateLimits.set(storeId, now);
    }

    const result = await getHomeProductInsight(storeId, force);

    res.json(result);
  } catch (err) {
    console.error('[ai-routes] Error getting home insight:', err);
    res.status(500).json({
      error: 'Eroare internă',
      message: err.message,
    });
  }
});

/**
 * POST /ai/insights/home/refresh
 * Force regenerate the insight (manual button)
 *
 * Body:
 * - store_id: Store ID or 'ALL' (default: 'ALL')
 */
router.post('/insights/home/refresh', async (req, res) => {
  try {
    const storeId = req.body?.store_id || 'ALL';

    console.log(`[ai-routes] POST /insights/home/refresh store_id=${storeId}`);

    // Check rate limit
    const lastRegenerate = regenerateRateLimits.get(storeId);
    const now = Date.now();

    if (lastRegenerate && (now - lastRegenerate) < REGENERATE_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((REGENERATE_COOLDOWN_MS - (now - lastRegenerate)) / 1000);

      return res.status(429).json({
        error: 'Rate limited',
        message: `Așteaptă ${waitSeconds} secunde înainte de regenerare`,
        retry_after: waitSeconds,
      });
    }

    // Update rate limit timestamp
    regenerateRateLimits.set(storeId, now);

    const result = await getHomeProductInsight(storeId, true);

    res.json(result);
  } catch (err) {
    console.error('[ai-routes] Error refreshing home insight:', err);
    res.status(500).json({
      error: 'Eroare internă',
      message: err.message,
    });
  }
});

/**
 * GET /ai/status
 * Get AI/LLM service status
 */
router.get('/status', async (req, res) => {
  try {
    const llmStatus = getLLMStatus();

    res.json({
      llm: llmStatus,
      rate_limit_cooldown_ms: REGENERATE_COOLDOWN_MS,
    });
  } catch (err) {
    console.error('[ai-routes] Error getting status:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /ai/sales/snapshot
 * Get sales snapshot data (for debugging/monitoring)
 *
 * Query params:
 * - store_id: Store ID or 'ALL' (default: 'ALL')
 */
router.get('/sales/snapshot', async (req, res) => {
  try {
    const storeId = req.query.store_id || 'ALL';

    const snapshot = await buildSalesSnapshot(storeId);

    res.json(snapshot);
  } catch (err) {
    console.error('[ai-routes] Error getting sales snapshot:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /ai/cache/invalidate
 * Invalidate cached insights for a store
 *
 * Body:
 * - store_id: Store ID or 'ALL' (required)
 */
router.post('/cache/invalidate', async (req, res) => {
  try {
    const storeId = req.body?.store_id;

    if (!storeId) {
      return res.status(400).json({ error: 'store_id is required' });
    }

    const deleted = await invalidateCache(storeId);

    res.json({
      ok: true,
      deleted,
      store_id: storeId,
    });
  } catch (err) {
    console.error('[ai-routes] Error invalidating cache:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /ai/cache/cleanup
 * Clean up expired cache entries
 */
router.post('/cache/cleanup', async (req, res) => {
  try {
    const deleted = await cleanExpiredCache();

    res.json({
      ok: true,
      deleted,
    });
  } catch (err) {
    console.error('[ai-routes] Error cleaning cache:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== TASKS ENDPOINTS (require x-tasks-secret) ====================

/**
 * POST /ai/tasks/cache/cleanup
 * Trigger cleanup of expired cache entries
 * Requires x-tasks-secret header
 */
router.post('/tasks/cache/cleanup', requireTasksSecret, async (req, res) => {
  try {
    console.log(`[ai-routes] POST /tasks/cache/cleanup`);

    const deleted = await cleanExpiredCache();

    res.json({
      ok: true,
      message: 'Cache cleanup completed',
      deleted,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ai-routes] Error cleaning cache:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
