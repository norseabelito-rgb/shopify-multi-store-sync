// routes/health.js
// Health check and metrics endpoints
const express = require('express');
const router = express.Router();
const { healthCheck, getPoolStats } = require('../lib/db');
const config = require('../config');
const { createLogger } = require('../lib/logger');

const logger = createLogger('health');

// In-memory metrics
const metrics = {
  requestCount: 0,
  errorCount: 0,
  requestDurations: [],
  startTime: Date.now(),
};

/**
 * Record a request metric
 * @param {number} duration - Request duration in ms
 * @param {boolean} isError - Whether the request resulted in error
 */
function recordRequestMetric(duration, isError = false) {
  metrics.requestCount++;
  if (isError) metrics.errorCount++;

  // Keep last 1000 request durations for percentile calculations
  metrics.requestDurations.push(duration);
  if (metrics.requestDurations.length > 1000) {
    metrics.requestDurations.shift();
  }
}

/**
 * Calculate percentile from array of numbers
 * @param {Array<number>} arr - Array of numbers
 * @param {number} p - Percentile (0-100)
 * @returns {number} Percentile value
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// ==================== HEALTH CHECK ENDPOINT ====================

/**
 * GET /health - Basic health check
 * Returns 200 if healthy, 503 if unhealthy
 */
router.get('/', async (req, res) => {
  const dbHealth = await healthCheck();

  const isHealthy = dbHealth.healthy;
  const status = isHealthy ? 'healthy' : 'unhealthy';

  res.status(isHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    checks: {
      database: dbHealth,
    },
  });
});

/**
 * GET /health/ready - Readiness check (for load balancers)
 * Returns 200 only when fully ready to accept traffic
 */
router.get('/ready', async (req, res) => {
  const dbHealth = await healthCheck();

  if (!dbHealth.healthy) {
    return res.status(503).json({
      ready: false,
      reason: 'Database not available',
    });
  }

  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/live - Liveness check (for container orchestration)
 * Returns 200 if the process is alive
 */
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

// ==================== METRICS ENDPOINT ====================

/**
 * GET /metrics - Prometheus-compatible metrics
 */
router.get('/metrics', async (req, res) => {
  if (!config.METRICS_ENABLED) {
    return res.status(404).json({ error: 'Metrics disabled' });
  }

  const poolStats = getPoolStats();
  const dbHealth = await healthCheck();
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);

  // Calculate request latency percentiles
  const p50 = percentile(metrics.requestDurations, 50);
  const p95 = percentile(metrics.requestDurations, 95);
  const p99 = percentile(metrics.requestDurations, 99);

  // Prometheus format
  const lines = [
    '# HELP app_uptime_seconds Application uptime in seconds',
    '# TYPE app_uptime_seconds gauge',
    `app_uptime_seconds ${uptimeSeconds}`,
    '',
    '# HELP app_requests_total Total number of HTTP requests',
    '# TYPE app_requests_total counter',
    `app_requests_total ${metrics.requestCount}`,
    '',
    '# HELP app_errors_total Total number of HTTP errors',
    '# TYPE app_errors_total counter',
    `app_errors_total ${metrics.errorCount}`,
    '',
    '# HELP app_request_duration_ms Request duration in milliseconds',
    '# TYPE app_request_duration_ms summary',
    `app_request_duration_ms{quantile="0.5"} ${p50}`,
    `app_request_duration_ms{quantile="0.95"} ${p95}`,
    `app_request_duration_ms{quantile="0.99"} ${p99}`,
    '',
    '# HELP db_pool_total_connections Total database pool connections',
    '# TYPE db_pool_total_connections gauge',
    `db_pool_total_connections ${poolStats.totalCount}`,
    '',
    '# HELP db_pool_idle_connections Idle database pool connections',
    '# TYPE db_pool_idle_connections gauge',
    `db_pool_idle_connections ${poolStats.idleCount}`,
    '',
    '# HELP db_pool_waiting_connections Waiting database pool connections',
    '# TYPE db_pool_waiting_connections gauge',
    `db_pool_waiting_connections ${poolStats.waitingCount}`,
    '',
    '# HELP db_health Database health status (1=healthy, 0=unhealthy)',
    '# TYPE db_health gauge',
    `db_health ${dbHealth.healthy ? 1 : 0}`,
    '',
    '# HELP db_latency_ms Database query latency in milliseconds',
    '# TYPE db_latency_ms gauge',
    `db_latency_ms ${dbHealth.latencyMs}`,
  ];

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(lines.join('\n') + '\n');
});

/**
 * GET /metrics/json - JSON format metrics
 */
router.get('/json', async (req, res) => {
  const poolStats = getPoolStats();
  const dbHealth = await healthCheck();
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);

  res.json({
    uptime: uptimeSeconds,
    requests: {
      total: metrics.requestCount,
      errors: metrics.errorCount,
      errorRate: metrics.requestCount > 0
        ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2) + '%'
        : '0%',
    },
    latency: {
      p50: percentile(metrics.requestDurations, 50),
      p95: percentile(metrics.requestDurations, 95),
      p99: percentile(metrics.requestDurations, 99),
    },
    database: {
      ...dbHealth,
      pool: poolStats,
    },
    memory: process.memoryUsage(),
  });
});

module.exports = {
  router,
  recordRequestMetric,
  metrics,
};
