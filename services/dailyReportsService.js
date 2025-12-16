// services/dailyReportsService.js
// Service for managing day-centric daily reports with projects and audit

const { query, getPool } = require('../lib/db');

/**
 * Normalize date to YYYY-MM-DD format
 * @param {string|Date} date - Date to normalize
 * @returns {string}
 */
function normalizeDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Get all reports for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} options - Query options
 * @param {string} options.projectId - Filter by project ID
 * @param {string} options.search - Search in person names
 * @returns {Promise<Array>}
 */
async function getReportsByDate(date, { projectId = null, search = '' } = {}) {
  const normalizedDate = normalizeDate(date);
  let sql = `
    SELECT
      e.id,
      e.report_date,
      e.person_id,
      e.did,
      e.next,
      e.blockers,
      e.created_at,
      e.updated_at,
      e.last_edited_by_person_id,
      p.display_name,
      p.email,
      editor.display_name AS last_edited_by_name,
      COALESCE(
        json_agg(
          json_build_object('id', proj.id, 'name', proj.name, 'color', proj.color)
          ORDER BY proj.name
        ) FILTER (WHERE proj.id IS NOT NULL),
        '[]'
      ) AS projects
    FROM daily_report_entries e
    INNER JOIN daily_people p ON e.person_id = p.id
    LEFT JOIN daily_people editor ON e.last_edited_by_person_id = editor.id
    LEFT JOIN daily_report_entry_projects ep ON e.id = ep.entry_id
    LEFT JOIN daily_projects proj ON ep.project_id = proj.id AND proj.is_active = TRUE
    WHERE e.report_date = $1
  `;

  const params = [normalizedDate];
  let paramIndex = 2;

  if (projectId) {
    sql += ` AND EXISTS (
      SELECT 1 FROM daily_report_entry_projects
      WHERE entry_id = e.id AND project_id = $${paramIndex++}
    )`;
    params.push(projectId);
  }

  if (search && search.trim()) {
    const searchPattern = `%${search.trim().toLowerCase()}%`;
    sql += ` AND LOWER(p.display_name) LIKE $${paramIndex++}`;
    params.push(searchPattern);
  }

  sql += ` GROUP BY e.id, p.display_name, p.email, editor.display_name
           ORDER BY p.display_name ASC`;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get report entry by person and date
 * @param {string} personId - Person UUID
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object|null>}
 */
async function getReportByPersonAndDate(personId, date) {
  const normalizedDate = normalizeDate(date);

  const result = await query(
    `SELECT
      e.*,
      p.display_name,
      p.email,
      COALESCE(
        json_agg(
          json_build_object('id', proj.id, 'name', proj.name, 'color', proj.color)
          ORDER BY proj.name
        ) FILTER (WHERE proj.id IS NOT NULL),
        '[]'
      ) AS projects
    FROM daily_report_entries e
    INNER JOIN daily_people p ON e.person_id = p.id
    LEFT JOIN daily_report_entry_projects ep ON e.id = ep.entry_id
    LEFT JOIN daily_projects proj ON ep.project_id = proj.id AND proj.is_active = TRUE
    WHERE e.person_id = $1 AND e.report_date = $2
    GROUP BY e.id, p.display_name, p.email`,
    [personId, normalizedDate]
  );

  return result.rows[0] || null;
}

/**
 * Upsert (create or update) a daily report entry
 * @param {Object} data - Report data
 * @param {string} data.personId - Person UUID
 * @param {string} data.date - Date in YYYY-MM-DD format
 * @param {string} data.did - What was accomplished
 * @param {string} data.next - What's next
 * @param {string} data.blockers - Blockers/needs
 * @param {Array<string>} data.projectIds - Array of project UUIDs
 * @param {string} data.editedByPersonId - Person who edited (for audit)
 * @returns {Promise<object>}
 */
async function upsertReportEntry({ personId, date, did, next, blockers, projectIds = [], editedByPersonId = null }) {
  const normalizedDate = normalizeDate(date);

  // Start transaction
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert the entry
    const entryResult = await client.query(
      `INSERT INTO daily_report_entries (report_date, person_id, did, next, blockers, last_edited_by_person_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (report_date, person_id)
       DO UPDATE SET
         did = EXCLUDED.did,
         next = EXCLUDED.next,
         blockers = EXCLUDED.blockers,
         updated_at = NOW(),
         last_edited_by_person_id = EXCLUDED.last_edited_by_person_id
       RETURNING *`,
      [normalizedDate, personId, did || null, next || null, blockers || null, editedByPersonId]
    );

    const entry = entryResult.rows[0];

    // Delete existing project associations
    await client.query(
      'DELETE FROM daily_report_entry_projects WHERE entry_id = $1',
      [entry.id]
    );

    // Insert new project associations
    if (projectIds && projectIds.length > 0) {
      const values = projectIds.map((projectId, i) => `($1, $${i + 2})`).join(', ');
      const insertParams = [entry.id, ...projectIds];
      await client.query(
        `INSERT INTO daily_report_entry_projects (entry_id, project_id)
         VALUES ${values}`,
        insertParams
      );
    }

    // Create revision snapshot
    const snapshot = {
      report_date: entry.report_date,
      person_id: entry.person_id,
      did: entry.did,
      next: entry.next,
      blockers: entry.blockers,
      project_ids: projectIds,
    };

    await client.query(
      `INSERT INTO daily_report_entry_revisions (entry_id, edited_by_person_id, snapshot)
       VALUES ($1, $2, $3)`,
      [entry.id, editedByPersonId, JSON.stringify(snapshot)]
    );

    await client.query('COMMIT');

    // Fetch the complete entry with projects
    const completeEntry = await getReportByPersonAndDate(personId, normalizedDate);
    return completeEntry;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get revisions for a report entry
 * @param {string} entryId - Entry UUID
 * @returns {Promise<Array>}
 */
async function getRevisions(entryId) {
  const result = await query(
    `SELECT
      r.id,
      r.entry_id,
      r.edited_at,
      r.edited_by_person_id,
      r.snapshot,
      p.display_name AS edited_by_name
    FROM daily_report_entry_revisions r
    LEFT JOIN daily_people p ON r.edited_by_person_id = p.id
    WHERE r.entry_id = $1
    ORDER BY r.edited_at DESC`,
    [entryId]
  );

  return result.rows;
}

/**
 * Get summary stats for a date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<object>}
 */
async function getDateSummary(date) {
  const normalizedDate = normalizeDate(date);

  // Get total active people
  const totalPeopleResult = await query(
    'SELECT COUNT(*)::int AS count FROM daily_people WHERE is_active = TRUE'
  );
  const totalPeople = totalPeopleResult.rows[0].count;

  // Get submitted count
  const submittedResult = await query(
    `SELECT COUNT(DISTINCT e.person_id)::int AS count
     FROM daily_report_entries e
     INNER JOIN daily_people p ON e.person_id = p.id
     WHERE e.report_date = $1 AND p.is_active = TRUE`,
    [normalizedDate]
  );
  const submitted = submittedResult.rows[0].count;

  // Get missing people
  const missingResult = await query(
    `SELECT p.id, p.display_name, p.email
     FROM daily_people p
     WHERE p.is_active = TRUE
     AND NOT EXISTS (
       SELECT 1 FROM daily_report_entries e
       WHERE e.person_id = p.id AND e.report_date = $1
     )
     ORDER BY p.display_name ASC`,
    [normalizedDate]
  );

  return {
    date: normalizedDate,
    total_people: totalPeople,
    submitted,
    missing: totalPeople - submitted,
    missing_people: missingResult.rows,
  };
}

/**
 * Get calendar stats for a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Array>}
 */
async function getMonthlyCalendarStats(year, month) {
  // Get first and last day of month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const result = await query(
    `SELECT
      e.report_date,
      COUNT(DISTINCT e.person_id)::int AS submitted_count
    FROM daily_report_entries e
    INNER JOIN daily_people p ON e.person_id = p.id
    WHERE e.report_date >= $1
      AND e.report_date <= $2
      AND p.is_active = TRUE
    GROUP BY e.report_date
    ORDER BY e.report_date ASC`,
    [normalizeDate(firstDay), normalizeDate(lastDay)]
  );

  return result.rows;
}

module.exports = {
  getReportsByDate,
  getReportByPersonAndDate,
  upsertReportEntry,
  getRevisions,
  getDateSummary,
  getMonthlyCalendarStats,
};
