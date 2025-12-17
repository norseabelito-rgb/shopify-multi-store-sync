// routes/jobs.js
// Job management API endpoints for tracking async operations

const express = require('express');
const router = express.Router();
const {
  getJob,
  getActiveJobs,
  getRecentJobs,
  cancelJob,
  getJobSummary,
} = require('../services/jobsService');

// GET /jobs/:id - Get job status and progress
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(getJobSummary(job));
  } catch (err) {
    console.error('[jobs] GET /:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /jobs - List jobs
router.get('/', async (req, res) => {
  try {
    const { type, storeId, limit = 20, active } = req.query;

    let jobs;
    if (active === 'true') {
      jobs = await getActiveJobs(type || null);
    } else {
      jobs = await getRecentJobs({
        type: type || null,
        storeId: storeId || null,
        limit: parseInt(limit) || 20,
      });
    }

    res.json({
      jobs: jobs.map(getJobSummary),
      count: jobs.length,
    });
  } catch (err) {
    console.error('[jobs] GET / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /jobs/:id/cancel - Cancel a running job
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getJob(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'pending' && job.status !== 'running') {
      return res.status(400).json({ error: 'Job cannot be cancelled', status: job.status });
    }

    const cancelled = await cancelJob(id);
    res.json(getJobSummary(cancelled));
  } catch (err) {
    console.error('[jobs] POST /:id/cancel error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
