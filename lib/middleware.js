// lib/middleware.js
// Express middleware for validation, rate limiting, and error handling
const config = require('../config');
const { createLogger } = require('./logger');

const logger = createLogger('middleware');

// ==================== RATE LIMITING ====================

// In-memory store for rate limiting (consider Redis for multi-instance)
const rateLimitStore = new Map();

/**
 * Rate limiting middleware
 * @param {object} options - Rate limit options
 * @returns {Function} Express middleware
 */
function rateLimit(options = {}) {
  const {
    windowMs = config.RATE_LIMIT_WINDOW_MS,
    maxRequests = config.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator = (req) => req.ip || 'unknown',
    message = 'Too many requests, please try again later',
  } = options;

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore) {
      if (now - data.windowStart > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let data = rateLimitStore.get(key);

    if (!data || now - data.windowStart > windowMs) {
      data = { windowStart: now, count: 0 };
    }

    data.count++;
    rateLimitStore.set(key, data);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((data.windowStart + windowMs) / 1000));

    if (data.count > maxRequests) {
      logger.warn('Rate limit exceeded', { key, count: data.count });
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((data.windowStart + windowMs - now) / 1000),
      });
    }

    next();
  };
}

// ==================== VALIDATION ====================

/**
 * Validate request body against schema
 * @param {object} schema - Validation schema
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }

      if (value === undefined || value === null) continue;

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `${field} must be a string` });
      }

      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push({ field, message: `${field} must be a number` });
      }

      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push({ field, message: `${field} must be an array` });
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must be at most ${rules.maxLength} characters` });
      }

      if (rules.min && typeof value === 'number' && value < rules.min) {
        errors.push({ field, message: `${field} must be at least ${rules.min}` });
      }

      if (rules.max && typeof value === 'number' && value > rules.max) {
        errors.push({ field, message: `${field} must be at most ${rules.max}` });
      }

      if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
        errors.push({ field, message: `${field} has invalid format` });
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    next();
  };
}

/**
 * Validate query parameters
 * @param {object} schema - Validation schema
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [param, rules] of Object.entries(schema)) {
      let value = req.query[param];

      if (rules.required && (value === undefined || value === '')) {
        errors.push({ param, message: `${param} is required` });
        continue;
      }

      if (value === undefined || value === '') continue;

      // Type coercion for query params
      if (rules.type === 'number') {
        value = Number(value);
        if (isNaN(value)) {
          errors.push({ param, message: `${param} must be a number` });
          continue;
        }
        req.query[param] = value;
      }

      if (rules.type === 'boolean') {
        value = value === 'true' || value === '1';
        req.query[param] = value;
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ param, message: `${param} must be one of: ${rules.enum.join(', ')}` });
      }

      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push({ param, message: `${param} must be at least ${rules.min}` });
      }

      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push({ param, message: `${param} must be at most ${rules.max}` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        errors,
      });
    }

    next();
  };
}

// ==================== ERROR HANDLING ====================

/**
 * Standardized error response format
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Async handler wrapper to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * @returns {Function} Express middleware
 */
function errorHandler() {
  return (err, req, res, next) => {
    // Default error values
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'An unexpected error occurred';
    let details = err.details || null;

    // Log the error
    if (statusCode >= 500) {
      logger.error('Server error', {
        requestId: req.requestId,
        statusCode,
        code,
        message,
        stack: err.stack,
      });
    } else {
      logger.warn('Client error', {
        requestId: req.requestId,
        statusCode,
        code,
        message,
      });
    }

    // Don't leak internal errors in production
    if (config.NODE_ENV === 'production' && statusCode >= 500 && !err.isOperational) {
      message = 'An unexpected error occurred';
      details = null;
    }

    // Standardized error response
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        details,
        requestId: req.requestId,
      },
    });
  };
}

/**
 * Not found handler
 * @returns {Function} Express middleware
 */
function notFoundHandler() {
  return (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        requestId: req.requestId,
      },
    });
  };
}

// ==================== COMMON VALIDATION SCHEMAS ====================

const paginationSchema = {
  page: { type: 'number', min: 1 },
  limit: { type: 'number', min: 1, max: config.MAX_PAGE_SIZE },
};

const sortSchema = {
  sortBy: { type: 'string' },
  sortOrder: { type: 'string', enum: ['asc', 'desc'] },
};

module.exports = {
  rateLimit,
  validateBody,
  validateQuery,
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  paginationSchema,
  sortSchema,
};
