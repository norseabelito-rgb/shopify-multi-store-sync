// lib/logger.js
// Structured logging with request correlation and log levels
const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LOG_LEVELS[config.LOG_LEVEL] ?? LOG_LEVELS.info;

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format log entry as JSON or pretty string
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 * @returns {string} Formatted log entry
 */
function formatLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (config.LOG_FORMAT === 'pretty') {
    const metaStr = Object.keys(meta).length > 0
      ? ` ${JSON.stringify(meta)}`
      : '';
    return `[${entry.timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  return JSON.stringify(entry);
}

/**
 * Create a logger instance
 * @param {string} component - Component name for context
 * @returns {object} Logger instance
 */
function createLogger(component) {
  const log = (level, message, meta = {}) => {
    if (LOG_LEVELS[level] > currentLevel) return;

    const fullMeta = { component, ...meta };
    const formatted = formatLog(level, message, fullMeta);

    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  };

  return {
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    info: (message, meta) => log('info', message, meta),
    debug: (message, meta) => log('debug', message, meta),

    // Create child logger with additional context
    child: (additionalMeta) => {
      const childLogger = createLogger(component);
      const originalLog = childLogger;
      return {
        error: (msg, meta) => originalLog.error(msg, { ...additionalMeta, ...meta }),
        warn: (msg, meta) => originalLog.warn(msg, { ...additionalMeta, ...meta }),
        info: (msg, meta) => originalLog.info(msg, { ...additionalMeta, ...meta }),
        debug: (msg, meta) => originalLog.debug(msg, { ...additionalMeta, ...meta }),
      };
    },
  };
}

/**
 * Express middleware for request logging
 * @returns {Function} Express middleware
 */
function requestLoggerMiddleware() {
  const logger = createLogger('http');

  return (req, res, next) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Attach request ID to request object
    req.requestId = requestId;

    // Log request start
    logger.info('Request started', {
      requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    // Capture response
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;

      logger.info('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: duration,
      });

      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Express error logging middleware
 * @returns {Function} Express middleware
 */
function errorLoggerMiddleware() {
  const logger = createLogger('error');

  return (err, req, res, next) => {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      error: err.message,
      stack: config.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    next(err);
  };
}

// Default logger instance
const defaultLogger = createLogger('app');

module.exports = {
  createLogger,
  requestLoggerMiddleware,
  errorLoggerMiddleware,
  generateRequestId,
  logger: defaultLogger,
};
