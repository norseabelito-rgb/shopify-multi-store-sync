// services/dailyPeopleService.js
// Service for managing team members (daily_people table)

const { query } = require('../lib/db');

/**
 * Get all people with optional filters
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Only return active people (default true)
 * @param {string} options.search - Search by display_name or email
 * @returns {Promise<Array>}
 */
async function getAllPeople({ activeOnly = true, search = '' } = {}) {
  let sql = 'SELECT * FROM daily_people';
  const params = [];
  const conditions = [];

  if (activeOnly) {
    conditions.push('is_active = TRUE');
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim().toLowerCase()}%`;
    conditions.push('(LOWER(display_name) LIKE $' + (params.length + 1) + ' OR LOWER(email) LIKE $' + (params.length + 1) + ')');
    params.push(searchPattern);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY display_name ASC';

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get person by ID
 * @param {string} personId - Person UUID
 * @returns {Promise<object|null>}
 */
async function getPersonById(personId) {
  const result = await query(
    'SELECT * FROM daily_people WHERE id = $1',
    [personId]
  );
  return result.rows[0] || null;
}

/**
 * Create a new person
 * @param {Object} data - Person data
 * @param {string} data.display_name - Display name (required)
 * @param {string} data.email - Email (optional)
 * @param {string} data.phone - Phone (optional)
 * @returns {Promise<object>}
 */
async function createPerson({ display_name, email = null, phone = null }) {
  if (!display_name || !display_name.trim()) {
    throw new Error('Display name is required');
  }

  // Check for duplicate email if provided
  if (email && email.trim()) {
    const existing = await query(
      'SELECT id FROM daily_people WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      throw new Error('Email already exists');
    }
  }

  const result = await query(
    `INSERT INTO daily_people (display_name, email, phone)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [display_name.trim(), email ? email.trim().toLowerCase() : null, phone ? phone.trim() : null]
  );

  return result.rows[0];
}

/**
 * Update person
 * @param {string} personId - Person UUID
 * @param {Object} data - Update data
 * @returns {Promise<object>}
 */
async function updatePerson(personId, { display_name, email, phone }) {
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (display_name !== undefined && display_name.trim()) {
    updates.push(`display_name = $${paramIndex++}`);
    params.push(display_name.trim());
  }

  if (email !== undefined) {
    // Check for duplicate email if changing
    if (email && email.trim()) {
      const existing = await query(
        'SELECT id FROM daily_people WHERE email = $1 AND id != $2',
        [email.trim().toLowerCase(), personId]
      );
      if (existing.rows.length > 0) {
        throw new Error('Email already exists');
      }
      updates.push(`email = $${paramIndex++}`);
      params.push(email.trim().toLowerCase());
    } else {
      updates.push(`email = NULL`);
    }
  }

  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    params.push(phone ? phone.trim() : null);
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  updates.push(`updated_at = NOW()`);
  params.push(personId);

  const result = await query(
    `UPDATE daily_people
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error('Person not found');
  }

  return result.rows[0];
}

/**
 * Deactivate person (soft delete)
 * @param {string} personId - Person UUID
 * @returns {Promise<object>}
 */
async function deactivatePerson(personId) {
  const result = await query(
    `UPDATE daily_people
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [personId]
  );

  if (result.rows.length === 0) {
    throw new Error('Person not found');
  }

  return result.rows[0];
}

/**
 * Reactivate person
 * @param {string} personId - Person UUID
 * @returns {Promise<object>}
 */
async function reactivatePerson(personId) {
  const result = await query(
    `UPDATE daily_people
     SET is_active = TRUE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [personId]
  );

  if (result.rows.length === 0) {
    throw new Error('Person not found');
  }

  return result.rows[0];
}

module.exports = {
  getAllPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deactivatePerson,
  reactivatePerson,
};
