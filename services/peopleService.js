// services/peopleService.js
// Service for managing people (team members who submit daily reports)

const { query } = require('../lib/db');

/**
 * Get all people (optionally filter by active status)
 * @param {Object} options - Query options
 * @param {boolean} options.activeOnly - Filter to active people only
 * @returns {Promise<Array>}
 */
async function getAllPeople({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? `SELECT * FROM people WHERE active = TRUE ORDER BY last_name, first_name`
    : `SELECT * FROM people ORDER BY last_name, first_name`;

  const result = await query(sql);
  return result.rows;
}

/**
 * Get person by ID
 * @param {string} id - Person UUID
 * @returns {Promise<object|null>}
 */
async function getPersonById(id) {
  const result = await query(
    `SELECT * FROM people WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get person by email
 * @param {string} email - Email address
 * @returns {Promise<object|null>}
 */
async function getPersonByEmail(email) {
  const result = await query(
    `SELECT * FROM people WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Create a new person
 * @param {Object} data - Person data
 * @param {string} data.first_name
 * @param {string} data.last_name
 * @param {string} data.email
 * @param {string} data.phone
 * @param {string} data.role
 * @returns {Promise<object>} - Created person
 */
async function createPerson(data) {
  const { first_name, last_name, email, phone, role } = data;

  if (!first_name || !last_name || !email) {
    throw new Error('first_name, last_name, and email are required');
  }

  // Check if email already exists
  const existing = await getPersonByEmail(email);
  if (existing) {
    throw new Error(`Email ${email} is already registered`);
  }

  const result = await query(
    `INSERT INTO people (first_name, last_name, email, phone, role, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
     RETURNING *`,
    [first_name, last_name, email, phone || null, role || null]
  );

  return result.rows[0];
}

/**
 * Update person
 * @param {string} id - Person UUID
 * @param {Object} data - Fields to update
 * @returns {Promise<object>} - Updated person
 */
async function updatePerson(id, data) {
  const { first_name, last_name, email, phone, role, active } = data;

  // Check if person exists
  const existing = await getPersonById(id);
  if (!existing) {
    throw new Error('Person not found');
  }

  // If email is being changed, check uniqueness
  if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
    const emailExists = await getPersonByEmail(email);
    if (emailExists) {
      throw new Error(`Email ${email} is already registered`);
    }
  }

  const result = await query(
    `UPDATE people
     SET first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         phone = COALESCE($4, phone),
         role = COALESCE($5, role),
         active = COALESCE($6, active),
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [
      first_name || null,
      last_name || null,
      email || null,
      phone,
      role,
      active !== undefined ? active : null,
      id
    ]
  );

  return result.rows[0];
}

/**
 * Soft delete person (set active = false)
 * @param {string} id - Person UUID
 * @returns {Promise<object>} - Updated person
 */
async function deactivatePerson(id) {
  const result = await query(
    `UPDATE people
     SET active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  if (!result.rows.length) {
    throw new Error('Person not found');
  }

  return result.rows[0];
}

/**
 * Get count of active people
 * @returns {Promise<number>}
 */
async function getActivePeopleCount() {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM people WHERE active = TRUE`
  );
  return result.rows[0]?.count || 0;
}

/**
 * Search people by name or email
 * @param {string} searchQuery
 * @param {boolean} activeOnly
 * @returns {Promise<Array>}
 */
async function searchPeople(searchQuery, activeOnly = false) {
  if (!searchQuery || !searchQuery.trim()) {
    return getAllPeople({ activeOnly });
  }

  const search = `%${searchQuery.toLowerCase()}%`;
  const activeFilter = activeOnly ? 'AND active = TRUE' : '';

  const result = await query(
    `SELECT * FROM people
     WHERE (
       LOWER(first_name) LIKE $1
       OR LOWER(last_name) LIKE $1
       OR LOWER(email) LIKE $1
     ) ${activeFilter}
     ORDER BY last_name, first_name`,
    [search]
  );

  return result.rows;
}

module.exports = {
  getAllPeople,
  getPersonById,
  getPersonByEmail,
  createPerson,
  updatePerson,
  deactivatePerson,
  getActivePeopleCount,
  searchPeople,
};
