// services/dailyReportsDetailService.js
// Service for full daily report JSONB storage and retrieval

const { query } = require('../lib/db');
const { normalizeDate } = require('./dailyReportsIndexService');

/**
 * Validate report structure
 * @param {Object} report
 * @returns {boolean}
 */
function validateReport(report) {
  if (!report || typeof report !== 'object') {
    throw new Error('Report must be an object');
  }

  // Summary is required
  if (!report.summary || typeof report.summary !== 'string') {
    throw new Error('Report summary is required');
  }

  // Blockers is optional but must be string if present
  if (report.blockers && typeof report.blockers !== 'string') {
    throw new Error('Blockers must be a string');
  }

  // Items must be an array if present
  if (report.items && !Array.isArray(report.items)) {
    throw new Error('Items must be an array');
  }

  // Validate each item
  if (report.items) {
    report.items.forEach((item, idx) => {
      if (!item.title) {
        throw new Error(`Item ${idx} must have a title`);
      }
      if (item.status && !['done', 'in-progress', 'blocked'].includes(item.status)) {
        throw new Error(`Item ${idx} status must be: done, in-progress, or blocked`);
      }
      if (item.links && !Array.isArray(item.links)) {
        throw new Error(`Item ${idx} links must be an array`);
      }
    });
  }

  return true;
}

/**
 * Upsert daily report detail
 * @param {string} reportId - Report UUID from index table
 * @param {string} personId - Person UUID
 * @param {string} reportDate - YYYY-MM-DD
 * @param {Object} reportData - Full report object
 * @returns {Promise<object>}
 */
async function upsertReportDetail(reportId, personId, reportDate, reportData) {
  const normalizedDate = normalizeDate(reportDate);

  // Validate report structure
  validateReport(reportData);

  // Normalize report data
  const fullReport = {
    summary: reportData.summary,
    blockers: reportData.blockers || '',
    items: (reportData.items || []).map(item => ({
      title: item.title,
      description: item.description || '',
      status: item.status || 'in-progress',
      links: item.links || [],
    })),
    metadata: {
      submitted_at: reportData.submitted_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  const result = await query(
    `INSERT INTO daily_reports_detail (report_id, person_id, report_date, raw_json, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (report_id) DO UPDATE
     SET raw_json = EXCLUDED.raw_json,
         updated_at = NOW()
     RETURNING *`,
    [reportId, personId, normalizedDate, JSON.stringify(fullReport)]
  );

  return {
    ...result.rows[0],
    raw_json: fullReport, // Return parsed object
  };
}

/**
 * Get full report detail
 * @param {string} reportId - Report UUID
 * @returns {Promise<object|null>}
 */
async function getReportDetail(reportId) {
  const result = await query(
    `SELECT * FROM daily_reports_detail WHERE report_id = $1`,
    [reportId]
  );

  if (!result.rows.length) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    raw_json: row.raw_json, // PostgreSQL auto-parses JSONB
  };
}

/**
 * Get report detail by person and date
 * @param {string} personId
 * @param {string} reportDate - YYYY-MM-DD
 * @returns {Promise<object|null>}
 */
async function getReportDetailByPersonAndDate(personId, reportDate) {
  const normalizedDate = normalizeDate(reportDate);

  const result = await query(
    `SELECT d.*, i.submitted_at
     FROM daily_reports_detail d
     JOIN daily_reports_index i ON d.report_id = i.report_id
     WHERE d.person_id = $1 AND d.report_date = $2`,
    [personId, normalizedDate]
  );

  if (!result.rows.length) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...row,
    raw_json: row.raw_json,
  };
}

/**
 * Get all report details for a specific date
 * @param {string} reportDate - YYYY-MM-DD
 * @returns {Promise<Array>}
 */
async function getReportDetailsByDate(reportDate) {
  const normalizedDate = normalizeDate(reportDate);

  const result = await query(
    `SELECT
       d.*,
       i.submitted_at,
       p.first_name,
       p.last_name,
       p.email,
       p.role
     FROM daily_reports_detail d
     JOIN daily_reports_index i ON d.report_id = i.report_id
     JOIN people p ON d.person_id = p.id
     WHERE d.report_date = $1
     ORDER BY p.last_name, p.first_name`,
    [normalizedDate]
  );

  return result.rows.map(row => ({
    ...row,
    raw_json: row.raw_json,
  }));
}

/**
 * Delete report detail
 * @param {string} reportId
 * @returns {Promise<void>}
 */
async function deleteReportDetail(reportId) {
  await query(
    `DELETE FROM daily_reports_detail WHERE report_id = $1`,
    [reportId]
  );
}

module.exports = {
  upsertReportDetail,
  getReportDetail,
  getReportDetailByPersonAndDate,
  getReportDetailsByDate,
  deleteReportDetail,
  validateReport,
};
