// jobs/productsPush.js
// Background job system for bulk product push to Shopify stores
// Handles large batch operations with progress tracking and resumable state

const { query } = require('../lib/db');
const { loadStoresRows } = require('../lib/stores');
const { getMasterProducts } = require('../services/productsService');
const { pushProductToStore } = require('../services/productsPushService');
const config = require('../config');
const { createLogger } = require('../lib/logger');

const logger = createLogger('push-job');

// Configuration from centralized config
const BATCH_SIZE = config.JOB_BATCH_SIZE;
const RATE_LIMIT_DELAY_MS = config.JOB_RATE_LIMIT_DELAY_MS;
const MAX_RETRIES = config.JOB_MAX_RETRIES;
const CANCELLATION_CHECK_INTERVAL = config.JOB_CANCELLATION_CHECK_INTERVAL;

/**
 * Create a new push job in the database
 * @param {string} storeId - Target store
 * @param {Array<string>} skus - Products to push
 * @param {string} createdBy - User/system identifier
 * @returns {Promise<object>} Created job
 */
async function createPushJob(storeId, skus, createdBy = 'system') {
  const result = await query(
    `INSERT INTO products_push_jobs (store_id, status, total_products, sku_list, created_by)
     VALUES ($1, 'pending', $2, $3, $4)
     RETURNING *`,
    [storeId, skus.length, JSON.stringify(skus), createdBy]
  );

  logger.info(`Created job ${result.rows[0].id} for ${skus.length} products to ${storeId}`);
  return result.rows[0];
}

/**
 * Get job by ID
 * @param {string} jobId - Job UUID
 * @returns {Promise<object|null>} Job or null
 */
async function getJob(jobId) {
  const result = await query(
    `SELECT * FROM products_push_jobs WHERE id = $1`,
    [jobId]
  );
  return result.rows[0] || null;
}

/**
 * Update job progress
 * @param {string} jobId - Job UUID
 * @param {object} updates - Fields to update
 */
async function updateJobProgress(jobId, updates) {
  const fields = [];
  const values = [];
  let paramIdx = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${paramIdx}`);
    values.push(value);
    paramIdx++;
  }

  fields.push(`updated_at = NOW()`);
  values.push(jobId);

  await query(
    `UPDATE products_push_jobs SET ${fields.join(', ')} WHERE id = $${paramIdx}`,
    values
  );
}

/**
 * Get recent push jobs
 * @param {object} options - Query options
 * @returns {Promise<Array>} Jobs list
 */
async function getRecentJobs(options = {}) {
  const { storeId, status, limit = 20 } = options;

  let sql = `SELECT * FROM products_push_jobs`;
  const params = [];
  const conditions = [];

  if (storeId) {
    params.push(storeId);
    conditions.push(`store_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get currently running job for a store
 * @param {string} storeId - Store ID
 * @returns {Promise<object|null>} Running job or null
 */
async function getRunningJob(storeId) {
  const result = await query(
    `SELECT * FROM products_push_jobs
     WHERE store_id = $1 AND status IN ('pending', 'running')
     ORDER BY created_at DESC
     LIMIT 1`,
    [storeId]
  );
  return result.rows[0] || null;
}

/**
 * Cancel a pending or running job
 * @param {string} jobId - Job UUID
 * @returns {Promise<boolean>} Success
 */
async function cancelJob(jobId) {
  const result = await query(
    `UPDATE products_push_jobs
     SET status = 'cancelled', finished_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'running')
     RETURNING *`,
    [jobId]
  );

  if (result.rows.length > 0) {
    console.log(`[push-job] Cancelled job ${jobId}`);
    return true;
  }
  return false;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a push job
 * @param {string} jobId - Job UUID
 * @param {object} options - Execution options
 * @returns {Promise<object>} Job result
 */
async function executePushJob(jobId, options = {}) {
  const { onProgress = null } = options;

  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  if (job.status !== 'pending') {
    throw new Error(`Job ${jobId} is not in pending state (current: ${job.status})`);
  }

  // Mark as running
  await updateJobProgress(jobId, {
    status: 'running',
    started_at: new Date().toISOString(),
  });

  logger.info(`Starting job ${jobId}: ${job.total_products} products to ${job.store_id}`);

  const skus = JSON.parse(job.sku_list);
  const results = {
    success: 0,
    failed: 0,
    created: 0,
    updated: 0,
    collisions_resolved: 0,
    errors: [],
  };

  let processed = 0;
  let isCancelled = false;

  for (let i = 0; i < skus.length; i++) {
    const sku = skus[i];

    // Check if job was cancelled every CANCELLATION_CHECK_INTERVAL items (fixes N+1 query issue)
    if (i % CANCELLATION_CHECK_INTERVAL === 0) {
      const currentJob = await getJob(jobId);
      if (currentJob.status === 'cancelled') {
        logger.info(`Job ${jobId} was cancelled, stopping at ${processed}/${skus.length}`);
        isCancelled = true;
        break;
      }
    }

    let retries = 0;
    let success = false;

    while (retries <= MAX_RETRIES && !success) {
      try {
        const result = await pushProductToStore(sku, job.store_id);

        if (result.success) {
          results.success++;
          if (result.action === 'created') results.created++;
          if (result.action === 'updated') results.updated++;
          if (result.collisionResolved) results.collisions_resolved++;
          success = true;
        } else {
          if (retries < MAX_RETRIES) {
            retries++;
            logger.warn(`Retry ${retries}/${MAX_RETRIES} for ${sku}: ${result.error}`);
            await sleep(RATE_LIMIT_DELAY_MS * 2);
          } else {
            results.failed++;
            results.errors.push({ sku, error: result.error || result.action });
          }
        }
      } catch (err) {
        if (retries < MAX_RETRIES) {
          retries++;
          logger.warn(`Retry ${retries}/${MAX_RETRIES} for ${sku}: ${err.message}`);
          await sleep(RATE_LIMIT_DELAY_MS * 2);
        } else {
          results.failed++;
          results.errors.push({ sku, error: err.message });
        }
      }
    }

    processed++;

    // Update progress every BATCH_SIZE products
    if (processed % BATCH_SIZE === 0 || processed === skus.length) {
      await updateJobProgress(jobId, {
        processed_products: processed,
        success_count: results.success,
        failed_count: results.failed,
        error_log: JSON.stringify(results.errors.slice(-50)), // Keep last 50 errors
      });

      if (onProgress) {
        onProgress({
          jobId,
          processed,
          total: skus.length,
          success: results.success,
          failed: results.failed,
        });
      }

      console.log(
        `[push-job] ${jobId} progress: ${processed}/${skus.length} ` +
        `(${results.success} success, ${results.failed} failed)`
      );
    }

    // Rate limiting
    if (i < skus.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // Final update
  const finalStatus = results.failed === 0 ? 'completed' :
                      results.success === 0 ? 'failed' : 'completed';

  await updateJobProgress(jobId, {
    status: finalStatus,
    processed_products: processed,
    success_count: results.success,
    failed_count: results.failed,
    error_log: JSON.stringify(results.errors),
    finished_at: new Date().toISOString(),
  });

  console.log(
    `[push-job] Job ${jobId} ${finalStatus}: ` +
    `${results.success} success, ${results.failed} failed, ` +
    `${results.created} created, ${results.updated} updated, ` +
    `${results.collisions_resolved} collisions resolved`
  );

  return {
    jobId,
    status: finalStatus,
    ...results,
    processed,
    total: skus.length,
  };
}

/**
 * Start a push job for all products to a store
 * @param {string} storeId - Target store
 * @param {object} options - Options
 * @returns {Promise<object>} Job info
 */
async function startPushAllProducts(storeId, options = {}) {
  const { createdBy = 'system', execute = true } = options;

  // Check for existing running job
  const running = await getRunningJob(storeId);
  if (running) {
    return {
      success: false,
      error: `Există deja un job în curs pentru ${storeId}`,
      existingJob: running,
    };
  }

  // Get all product SKUs
  const { products } = await getMasterProducts({ limit: 10000 });
  const skus = products.map(p => p.sku);

  if (skus.length === 0) {
    return {
      success: false,
      error: 'Nu există produse de trimis',
    };
  }

  // Create job
  const job = await createPushJob(storeId, skus, createdBy);

  if (execute) {
    // Execute in background (non-blocking)
    executePushJob(job.id).catch(err => {
      console.error(`[push-job] Job ${job.id} failed:`, err);
      updateJobProgress(job.id, {
        status: 'failed',
        error_log: JSON.stringify([{ error: err.message }]),
        finished_at: new Date().toISOString(),
      });
    });
  }

  return {
    success: true,
    job,
    message: `Job creat pentru ${skus.length} produse către ${storeId}`,
  };
}

/**
 * Start a push job for specific products
 * @param {string} storeId - Target store
 * @param {Array<string>} skus - Product SKUs
 * @param {object} options - Options
 * @returns {Promise<object>} Job info
 */
async function startPushSelectedProducts(storeId, skus, options = {}) {
  const { createdBy = 'system', execute = true } = options;

  if (!skus || skus.length === 0) {
    return {
      success: false,
      error: 'Lista de SKU-uri este goală',
    };
  }

  // Check for existing running job
  const running = await getRunningJob(storeId);
  if (running) {
    return {
      success: false,
      error: `Există deja un job în curs pentru ${storeId}`,
      existingJob: running,
    };
  }

  // Create job
  const job = await createPushJob(storeId, skus, createdBy);

  if (execute) {
    // Execute in background (non-blocking)
    executePushJob(job.id).catch(err => {
      console.error(`[push-job] Job ${job.id} failed:`, err);
      updateJobProgress(job.id, {
        status: 'failed',
        error_log: JSON.stringify([{ error: err.message }]),
        finished_at: new Date().toISOString(),
      });
    });
  }

  return {
    success: true,
    job,
    message: `Job creat pentru ${skus.length} produse către ${storeId}`,
  };
}

/**
 * Push all products to all stores
 * Creates one job per store
 * @param {object} options - Options
 * @returns {Promise<object>} Jobs summary
 */
async function startPushToAllStores(options = {}) {
  const { createdBy = 'system' } = options;

  const stores = await loadStoresRows();
  const { products } = await getMasterProducts({ limit: 10000 });
  const skus = products.map(p => p.sku);

  if (skus.length === 0) {
    return {
      success: false,
      error: 'Nu există produse de trimis',
    };
  }

  const jobs = [];

  for (const store of stores) {
    const storeId = store.store_id;
    const domain = String(store.shopify_domain || '').trim();

    if (!domain) {
      console.log(`[push-job] Skipping store ${storeId}: no shopify_domain`);
      continue;
    }

    // Check for existing running job
    const running = await getRunningJob(storeId);
    if (running) {
      console.log(`[push-job] Skipping store ${storeId}: job already running`);
      jobs.push({
        store_id: storeId,
        skipped: true,
        reason: 'job_running',
        existingJob: running.id,
      });
      continue;
    }

    // Create job (don't execute yet)
    const job = await createPushJob(storeId, skus, createdBy);
    jobs.push({
      store_id: storeId,
      job_id: job.id,
      products: skus.length,
    });
  }

  // Execute all jobs in sequence (one store at a time to avoid rate limits)
  const executeAll = async () => {
    for (const jobInfo of jobs) {
      if (jobInfo.skipped) continue;

      try {
        await executePushJob(jobInfo.job_id);
      } catch (err) {
        console.error(`[push-job] Job ${jobInfo.job_id} failed:`, err);
      }

      // Pause between stores
      await sleep(2000);
    }
  };

  // Start execution in background
  executeAll().catch(err => {
    console.error('[push-job] Multi-store push failed:', err);
  });

  return {
    success: true,
    jobs,
    message: `Pornit push pentru ${jobs.filter(j => !j.skipped).length} magazine, ${skus.length} produse fiecare`,
  };
}

module.exports = {
  createPushJob,
  getJob,
  getRecentJobs,
  getRunningJob,
  cancelJob,
  executePushJob,
  startPushAllProducts,
  startPushSelectedProducts,
  startPushToAllStores,
};
