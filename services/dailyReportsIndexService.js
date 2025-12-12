// services/dailyReportsIndexService.js
// Service for fast daily report queries and calendar aggregation

const { query } = require('../lib/db');

/**
 * Generate summary excerpt from full report (first 200 chars of summary)
 * @param {Object} report - Full report object
 * @returns {string}
 */
function generateSummaryExcerpt(report) {
  const summary = report.summary || '';
  return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
}

/**
 * Normalize date to UTC DATE (YYYY-MM-DD)
 * @param {string|Date} date
 * @returns {string} - YYYY-MM-DD format
 */
function normalizeDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Upsert daily report index entry
 * @param {string} personId - Person UUID
 * @param {string} reportDate - YYYY-MM-DD
 * @param {Object} fullReport - Complete report object
 * @param {string} reportId - Report UUID (for updates)
 * @returns {Promise<object>} - Index entry
 */
async function upsertReportIndex(personId, reportDate, fullReport, reportId = null) {
  const normalizedDate = normalizeDate(reportDate);
  const summaryExcerpt = generateSummaryExcerpt(fullReport);

  if (reportId) {
    // Update existing
    const result = await query(
      `UPDATE daily_reports_index
       SET summary_excerpt = $1, updated_at = NOW()
       WHERE report_id = $2
       RETURNING *`,
      [summaryExcerpt, reportId]
    );
    return result.rows[0];
  } else {
    // Insert new (with conflict handling)
    const result = await query(
      `INSERT INTO daily_reports_index (person_id, report_date, summary_excerpt, submitted_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (person_id, report_date) DO UPDATE
       SET summary_excerpt = EXCLUDED.summary_excerpt,
           updated_at = NOW()
       RETURNING *`,
      [personId, normalizedDate, summaryExcerpt]
    );
    return result.rows[0];
  }
}

/**
 * Get report index entry by person and date
 * @param {string} personId
 * @param {string} reportDate - YYYY-MM-DD
 * @returns {Promise<object|null>}
 */
async function getReportIndex(personId, reportDate) {
  const normalizedDate = normalizeDate(reportDate);

  const result = await query(
    `SELECT * FROM daily_reports_index
     WHERE person_id = $1 AND report_date = $2`,
    [personId, normalizedDate]
  );

  return result.rows[0] || null;
}

/**
 * Get all reports for a specific date
 * @param {string} reportDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
async function getReportsByDate(reportDate) {
  const normalizedDate = normalizeDate(reportDate);

  const result = await query(
    `SELECT
       r.*,
       p.first_name,
       p.last_name,
       p.email,
       p.role
     FROM daily_reports_index r
     JOIN people p ON r.person_id = p.id
     WHERE r.report_date = $1
     ORDER BY p.last_name, p.first_name`,
    [normalizedDate]
  );

  return result.rows;
}

/**
 * Get calendar stats for a month
 * @param {string} month - YYYY-MM format
 * @returns {Promise<Array>} - Array of {date, submitted_count, active_people_count}
 */
async function getMonthlyCalendarStats(month) {
  // Parse month (YYYY-MM)
  const [year, monthNum] = month.split('-').map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    throw new Error('Invalid month format. Use YYYY-MM');
  }

  // Calculate start and end dates
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const endDate = new Date(year, monthNum, 0); // Last day of month
  const endDateStr = endDate.toISOString().split('T')[0];

  // Get active people count (constant for the month)
  const activePeopleResult = await query(
    `SELECT COUNT(*)::int AS count FROM people WHERE active = TRUE`
  );
  const activePeopleCount = activePeopleResult.rows[0]?.count || 0;

  // Get submission counts per day
  const result = await query(
    `SELECT
       report_date::text AS date,
       COUNT(*)::int AS submitted_count
     FROM daily_reports_index
     WHERE report_date >= $1 AND report_date <= $2
     GROUP BY report_date
     ORDER BY report_date`,
    [startDate, endDateStr]
  );

  // Create a map for quick lookup
  const statsMap = {};
  result.rows.forEach(row => {
    statsMap[row.date] = {
      date: row.date,
      submitted_count: row.submitted_count,
      active_people_count: activePeopleCount,
    };
  });

  // Fill in missing dates with 0 submissions
  const stats = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    stats.push(statsMap[dateStr] || {
      date: dateStr,
      submitted_count: 0,
      active_people_count: activePeopleCount,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return stats;
}

/**
 * Get people who submitted reports on a specific date
 * @param {string} reportDate - YYYY-MM-DD
 * @returns {Promise<Array>} - Array of person IDs
 */
async function getPeopleWhoSubmitted(reportDate) {
  const normalizedDate = normalizeDate(reportDate);

  const result = await query(
    `SELECT person_id FROM daily_reports_index WHERE report_date = $1`,
    [normalizedDate]
  );

  return result.rows.map(row => row.person_id);
}

/**
 * Get people who did NOT submit on a specific date
 * @param {string} reportDate - YYYY-MM-DD
 * @returns {Promise<Array>} - Array of people objects
 */
async function getPeopleMissingReports(reportDate) {
  const normalizedDate = normalizeDate(reportDate);

  const result = await query(
    `SELECT p.*
     FROM people p
     WHERE p.active = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM daily_reports_index r
         WHERE r.person_id = p.id AND r.report_date = $1
       )
     ORDER BY p.last_name, p.first_name`,
    [normalizedDate]
  );

  return result.rows;
}

/**
 * Get recent reports for a person
 * @param {string} personId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRecentReportsByPerson(personId, limit = 10) {
  const result = await query(
    `SELECT * FROM daily_reports_index
     WHERE person_id = $1
     ORDER BY report_date DESC
     LIMIT $2`,
    [personId, limit]
  );

  return result.rows;
}

/**
 * Delete report index entry
 * @param {string} reportId
 * @returns {Promise<void>}
 */
async function deleteReportIndex(reportId) {
  await query(
    `DELETE FROM daily_reports_index WHERE report_id = $1`,
    [reportId]
  );
}

module.exports = {
  upsertReportIndex,
  getReportIndex,
  getReportsByDate,
  getMonthlyCalendarStats,
  getPeopleWhoSubmitted,
  getPeopleMissingReports,
  getRecentReportsByPerson,
  deleteReportIndex,
  normalizeDate,
  generateSummaryExcerpt,
};
