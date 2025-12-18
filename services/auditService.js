// services/auditService.js
// Audit logging service for tracking all data changes
const { query } = require('../lib/db');
const { createLogger } = require('../lib/logger');

const logger = createLogger('audit');

/**
 * Log an audit event
 * @param {object} event - Audit event data
 * @returns {Promise<object>} Created audit log entry
 */
async function logAuditEvent({
  entityType,
  entityId,
  action,
  actor = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const result = await query(
      `INSERT INTO audit_log
        (entity_type, entity_id, action, actor, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        entityType,
        entityId,
        action,
        actor,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
      ]
    );

    logger.debug('Audit event logged', {
      entityType,
      entityId,
      action,
      actor,
    });

    return result.rows[0];
  } catch (err) {
    logger.error('Failed to log audit event', {
      error: err.message,
      entityType,
      entityId,
      action,
    });
    // Don't throw - audit failures shouldn't break main operations
    return null;
  }
}

/**
 * Get audit history for an entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Audit log entries
 */
async function getAuditHistory(entityType, entityId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const result = await query(
    `SELECT * FROM audit_log
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY created_at DESC
     LIMIT $3 OFFSET $4`,
    [entityType, entityId, limit, offset]
  );

  return result.rows;
}

/**
 * Get recent audit events
 * @param {object} options - Query options
 * @returns {Promise<Array>} Audit log entries
 */
async function getRecentAuditEvents(options = {}) {
  const { limit = 100, offset = 0, entityType = null, action = null, actor = null } = options;

  let sql = `SELECT * FROM audit_log WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (entityType) {
    sql += ` AND entity_type = $${paramIndex++}`;
    params.push(entityType);
  }

  if (action) {
    sql += ` AND action = $${paramIndex++}`;
    params.push(action);
  }

  if (actor) {
    sql += ` AND actor = $${paramIndex++}`;
    params.push(actor);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Middleware to capture request context for audit logging
 * @returns {Function} Express middleware
 */
function auditContextMiddleware() {
  return (req, res, next) => {
    req.auditContext = {
      actor: req.user?.id || req.headers['x-user-id'] || 'anonymous',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };
    next();
  };
}

/**
 * Helper to create audit log from request context
 * @param {object} req - Express request
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {string} action - Action performed
 * @param {object} oldValues - Previous values
 * @param {object} newValues - New values
 */
async function auditFromRequest(req, entityType, entityId, action, oldValues = null, newValues = null) {
  const context = req.auditContext || {};
  return logAuditEvent({
    entityType,
    entityId,
    action,
    actor: context.actor,
    oldValues,
    newValues,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });
}

// Predefined entity types
const ENTITY_TYPES = {
  PRODUCT: 'product',
  ORDER: 'order',
  CUSTOMER: 'customer',
  STORE: 'store',
  JOB: 'job',
  USER: 'user',
  REPORT: 'report',
  WEBHOOK: 'webhook',
};

// Predefined actions
const ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  SOFT_DELETE: 'soft_delete',
  RESTORE: 'restore',
  PUSH: 'push',
  SYNC: 'sync',
  LOGIN: 'login',
  LOGOUT: 'logout',
  EXPORT: 'export',
  IMPORT: 'import',
};

module.exports = {
  logAuditEvent,
  getAuditHistory,
  getRecentAuditEvents,
  auditContextMiddleware,
  auditFromRequest,
  ENTITY_TYPES,
  ACTIONS,
};
