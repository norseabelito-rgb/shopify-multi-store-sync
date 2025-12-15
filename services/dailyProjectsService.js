// services/dailyProjectsService.js
// Service for managing projects (daily_projects table)

const { query } = require('../lib/db');

/**
 * Get all projects
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Only return active projects (default true)
 * @returns {Promise<Array>}
 */
async function getAllProjects({ activeOnly = true } = {}) {
  let sql = 'SELECT * FROM daily_projects';

  if (activeOnly) {
    sql += ' WHERE is_active = TRUE';
  }

  sql += ' ORDER BY name ASC';

  const result = await query(sql);
  return result.rows;
}

/**
 * Get project by ID
 * @param {string} projectId - Project UUID
 * @returns {Promise<object|null>}
 */
async function getProjectById(projectId) {
  const result = await query(
    'SELECT * FROM daily_projects WHERE id = $1',
    [projectId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new project
 * @param {Object} data - Project data
 * @param {string} data.name - Project name (required, unique)
 * @param {string} data.color - Hex color code (optional)
 * @returns {Promise<object>}
 */
async function createProject({ name, color = null }) {
  if (!name || !name.trim()) {
    throw new Error('Project name is required');
  }

  // Check for duplicate name
  const existing = await query(
    'SELECT id FROM daily_projects WHERE LOWER(name) = LOWER($1)',
    [name.trim()]
  );

  if (existing.rows.length > 0) {
    throw new Error('Project name already exists');
  }

  const result = await query(
    `INSERT INTO daily_projects (name, color)
     VALUES ($1, $2)
     RETURNING *`,
    [name.trim(), color]
  );

  return result.rows[0];
}

/**
 * Update project
 * @param {string} projectId - Project UUID
 * @param {Object} data - Update data
 * @returns {Promise<object>}
 */
async function updateProject(projectId, { name, color }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined && name.trim()) {
    // Check for duplicate name if changing
    const existing = await query(
      'SELECT id FROM daily_projects WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), projectId]
    );
    if (existing.rows.length > 0) {
      throw new Error('Project name already exists');
    }
    updates.push(`name = $${paramIndex++}`);
    params.push(name.trim());
  }

  if (color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    params.push(color);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  updates.push(`updated_at = NOW()`);
  params.push(projectId);

  const result = await query(
    `UPDATE daily_projects
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error('Project not found');
  }

  return result.rows[0];
}

/**
 * Deactivate project (soft delete)
 * @param {string} projectId - Project UUID
 * @returns {Promise<object>}
 */
async function deactivateProject(projectId) {
  const result = await query(
    `UPDATE daily_projects
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [projectId]
  );

  if (result.rows.length === 0) {
    throw new Error('Project not found');
  }

  return result.rows[0];
}

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deactivateProject,
};
