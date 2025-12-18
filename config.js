// config.js
// Centralized configuration for all application settings
// All magic numbers and constants should be defined here

module.exports = {
  // ==================== APP SETTINGS ====================
  APP_NAME: 'Shopify Multi-Store Sync',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ==================== SERVER ====================
  PORT: parseInt(process.env.PORT, 10) || 3000,

  // ==================== SHOPIFY ====================
  SHOPIFY_API_VERSION: '2024-10',
  SCRIPT_TAG: 'ADAUGAT CU SCRIPT',

  // Shopify API rate limiting
  SHOPIFY_RATE_LIMIT_DELAY_MS: 500,
  SHOPIFY_REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  SHOPIFY_MAX_RETRIES: 3,

  // ==================== DATABASE ====================
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 25,
  DB_IDLE_TIMEOUT_MS: 30000,
  DB_CONNECTION_TIMEOUT_MS: 10000,
  DB_STATEMENT_TIMEOUT_MS: 30000,

  // ==================== JOBS ====================
  JOB_BATCH_SIZE: 10,
  JOB_RATE_LIMIT_DELAY_MS: 500,
  JOB_MAX_RETRIES: 2,
  JOB_STALE_THRESHOLD_HOURS: 1, // Jobs running longer than this are considered stale
  JOB_CANCELLATION_CHECK_INTERVAL: 10, // Check every N items

  // ==================== CACHING ====================
  IMAGE_CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour
  AI_CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
  AI_REGENERATE_COOLDOWN_MS: 30 * 1000, // 30 seconds

  // ==================== PAGINATION ====================
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  MAX_BULK_FETCH_SIZE: 10000,

  // ==================== SYNC ====================
  ORDERS_SYNC_BATCH_SIZE: 250,
  CUSTOMERS_SYNC_BATCH_SIZE: 250,
  SYNC_START_DATE: '2024-01-01',

  // ==================== TIMEZONE ====================
  BUSINESS_TIMEZONE: 'Europe/Bucharest',

  // ==================== LLM ====================
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'anthropic',
  LLM_MODEL: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
  LLM_MAX_CONTEXT_CHARS: 50000,
  LLM_MAX_RESPONSE_TOKENS: 2048,
  LLM_REQUEST_TIMEOUT_MS: 60000,

  // ==================== RATE LIMITING ====================
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,

  // ==================== HEALTH CHECK ====================
  HEALTH_CHECK_INTERVAL_MS: 30000, // 30 seconds
  HEALTH_CHECK_DB_TIMEOUT_MS: 5000,

  // ==================== METRICS ====================
  METRICS_ENABLED: process.env.METRICS_ENABLED !== 'false',

  // ==================== GRACEFUL SHUTDOWN ====================
  SHUTDOWN_TIMEOUT_MS: 30000, // 30 seconds to drain requests

  // ==================== LOGGING ====================
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'json', // 'json' or 'pretty'

  // ==================== VALIDATION ====================
  MAX_SKU_LENGTH: 100,
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 50000,
  MAX_EXCEL_ROWS: 10000,
  MAX_FILE_SIZE_MB: 10,
};
