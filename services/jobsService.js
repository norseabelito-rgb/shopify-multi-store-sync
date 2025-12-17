// services/jobsService.js
// Manages bulk jobs for import, push, and other async operations
// Provides progress tracking and error collection

const { query } = require('../lib/db');

/**
 * Create a new bulk job
 * @param {object} params - Job parameters
 * @param {string} params.type - Job type: 'import', 'push', 'push_all', 'push_selected'
 * @param {string} params.storeId - Store ID (optional for import jobs)
 * @param {number} params.total - Total items to process
 * @param {object} params.metadata - Additional metadata
 * @returns {Promise<object>} - Created job
 */
async function createJob({ type, storeId = null, total = 0, metadata = {} }) {
  const result = await query(
    `INSERT INTO bulk_jobs (type, store_id, total, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [type, storeId, total, JSON.stringify(metadata)]
  );

  console.log(`[jobs] Created job ${result.rows[0].id} - type: ${type}, total: ${total}`);
  return result.rows[0];
}

/**
 * Get a job by ID
 * @param {string} jobId - Job UUID
 * @returns {Promise<object|null>} - Job or null
 */
async function getJob(jobId) {
  const result = await query(
    `SELECT * FROM bulk_jobs WHERE id = $1`,
    [jobId]
  );
  return result.rows[0] || null;
}

/**
 * Get active (running) jobs
 * @param {string} type - Optional job type filter
 * @returns {Promise<Array>} - Array of running jobs
 */
async function getActiveJobs(type = null) {
  let sql = `SELECT * FROM bulk_jobs WHERE status IN ('pending', 'running') ORDER BY created_at DESC`;
  const params = [];

  if (type) {
    sql = `SELECT * FROM bulk_jobs WHERE status IN ('pending', 'running') AND type = $1 ORDER BY created_at DESC`;
    params.push(type);
  }

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get recent jobs
 * @param {object} options - Query options
 * @param {number} options.limit - Max jobs to return
 * @param {string} options.type - Filter by type
 * @param {string} options.storeId - Filter by store
 * @returns {Promise<Array>} - Array of jobs
 */
async function getRecentJobs({ limit = 20, type = null, storeId = null } = {}) {
  let sql = `SELECT * FROM bulk_jobs WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (type) {
    sql += ` AND type = $${paramIndex++}`;
    params.push(type);
  }

  if (storeId) {
    sql += ` AND store_id = $${paramIndex++}`;
    params.push(storeId);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Start a job (set status to running)
 * @param {string} jobId - Job UUID
 * @returns {Promise<object>} - Updated job
 */
async function startJob(jobId) {
  const result = await query(
    `UPDATE bulk_jobs
     SET status = 'running', started_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId]
  );

  console.log(`[jobs] Started job ${jobId}`);
  return result.rows[0];
}

/**
 * Update job progress
 * @param {string} jobId - Job UUID
 * @param {object} progress - Progress data
 * @param {number} progress.processed - Items processed
 * @param {number} progress.success - Successful items
 * @param {number} progress.failed - Failed items
 * @param {string} progress.currentItem - Current item being processed
 * @returns {Promise<object>} - Updated job
 */
async function updateJobProgress(jobId, { processed, success, failed, currentItem }) {
  const updates = ['updated_at = NOW()'];
  const params = [jobId];
  let paramIndex = 2;

  if (processed !== undefined) {
    updates.push(`processed = $${paramIndex++}`);
    params.push(processed);
  }

  if (success !== undefined) {
    updates.push(`success = $${paramIndex++}`);
    params.push(success);
  }

  if (failed !== undefined) {
    updates.push(`failed = $${paramIndex++}`);
    params.push(failed);
  }

  if (currentItem !== undefined) {
    updates.push(`current_item = $${paramIndex++}`);
    params.push(currentItem);
  }

  const result = await query(
    `UPDATE bulk_jobs SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );

  return result.rows[0];
}

/**
 * Add an error to a job
 * @param {string} jobId - Job UUID
 * @param {object} error - Error object {item, message, details}
 * @returns {Promise<object>} - Updated job
 */
async function addJobError(jobId, error) {
  const result = await query(
    `UPDATE bulk_jobs
     SET errors = errors || $2::jsonb, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [jobId, JSON.stringify([error])]
  );

  return result.rows[0];
}

/**
 * Complete a job
 * @param {string} jobId - Job UUID
 * @param {string} status - Final status: 'completed', 'failed', 'cancelled'
 * @returns {Promise<object>} - Updated job
 */
async function completeJob(jobId, status = 'completed') {
  const result = await query(
    `UPDATE bulk_jobs
     SET status = $2, finished_at = NOW(), updated_at = NOW(), current_item = NULL
     WHERE id = $1
     RETURNING *`,
    [jobId, status]
  );

  const job = result.rows[0];
  console.log(`[jobs] Completed job ${jobId} - status: ${status}, success: ${job.success}/${job.total}, failed: ${job.failed}`);
  return job;
}

/**
 * Cancel a job
 * @param {string} jobId - Job UUID
 * @returns {Promise<object>} - Updated job
 */
async function cancelJob(jobId) {
  return completeJob(jobId, 'cancelled');
}

/**
 * Fail a job with error message
 * @param {string} jobId - Job UUID
 * @param {string} errorMessage - Error message
 * @returns {Promise<object>} - Updated job
 */
async function failJob(jobId, errorMessage) {
  const result = await query(
    `UPDATE bulk_jobs
     SET status = 'failed', finished_at = NOW(), updated_at = NOW(), current_item = NULL,
         metadata = metadata || $2::jsonb
     WHERE id = $1
     RETURNING *`,
    [jobId, JSON.stringify({ error: errorMessage })]
  );

  console.log(`[jobs] Failed job ${jobId}: ${errorMessage}`);
  return result.rows[0];
}

/**
 * Get job progress as percentage
 * @param {object} job - Job object
 * @returns {number} - Progress percentage 0-100
 */
function getJobProgress(job) {
  if (!job || job.total === 0) return 0;
  return Math.round((job.processed / job.total) * 100);
}

/**
 * Get job summary for frontend
 * @param {object} job - Job object
 * @returns {object} - Summary object
 */
function getJobSummary(job) {
  if (!job) return null;

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    storeId: job.store_id,
    total: job.total,
    processed: job.processed,
    success: job.success,
    failed: job.failed,
    progress: getJobProgress(job),
    currentItem: job.current_item,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
    errors: job.errors || [],
    metadata: job.metadata || {},
    duration: job.started_at && job.finished_at
      ? Math.round((new Date(job.finished_at) - new Date(job.started_at)) / 1000)
      : job.started_at
        ? Math.round((Date.now() - new Date(job.started_at)) / 1000)
        : 0,
  };
}

/**
 * Clean up old completed jobs (retention: 7 days)
 * @returns {Promise<number>} - Number of deleted jobs
 */
async function cleanupOldJobs() {
  const result = await query(
    `DELETE FROM bulk_jobs
     WHERE status IN ('completed', 'failed', 'cancelled')
     AND created_at < NOW() - INTERVAL '7 days'
     RETURNING id`
  );

  console.log(`[jobs] Cleaned up ${result.rowCount} old jobs`);
  return result.rowCount;
}

module.exports = {
  createJob,
  getJob,
  getActiveJobs,
  getRecentJobs,
  startJob,
  updateJobProgress,
  addJobError,
  completeJob,
  cancelJob,
  failJob,
  getJobProgress,
  getJobSummary,
  cleanupOldJobs,
};
