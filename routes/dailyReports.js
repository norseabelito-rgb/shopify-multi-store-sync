// routes/dailyReports.js
// Day-centric Daily Reports API endpoints

const express = require('express');
const router = express.Router();

const dailyPeopleService = require('../services/dailyPeopleService');
const dailyProjectsService = require('../services/dailyProjectsService');
const dailyReportsService = require('../services/dailyReportsService');

// ==================== PEOPLE MANAGEMENT ====================

// GET /daily-reports/people - Get all people
router.get('/people', async (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';
    const search = req.query.q || '';

    const people = await dailyPeopleService.getAllPeople({ activeOnly, search });

    res.json({ people });
  } catch (err) {
    console.error('[daily-reports/people] error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /daily-reports/people - Create new person
router.post('/people', async (req, res) => {
  try {
    const { display_name, email, phone } = req.body;

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: 'display_name is required' });
    }

    const person = await dailyPeopleService.createPerson({ display_name, email, phone });

    res.json({ person });
  } catch (err) {
    console.error('[daily-reports/people/create] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// PATCH /daily-reports/people/:id - Update person
router.patch('/people/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, email, phone } = req.body;

    const person = await dailyPeopleService.updatePerson(id, { display_name, email, phone });

    res.json({ person });
  } catch (err) {
    console.error('[daily-reports/people/update] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// DELETE /daily-reports/people/:id - Deactivate person
router.delete('/people/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await dailyPeopleService.deactivatePerson(id);

    res.json({ ok: true });
  } catch (err) {
    console.error('[daily-reports/people/delete] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// ==================== PROJECTS MANAGEMENT ====================

// GET /daily-reports/projects - Get all projects
router.get('/projects', async (req, res) => {
  try {
    const activeOnly = req.query.active !== 'false';

    const projects = await dailyProjectsService.getAllProjects({ activeOnly });

    res.json({ projects });
  } catch (err) {
    console.error('[daily-reports/projects] error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /daily-reports/projects - Create new project
router.post('/projects', async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const project = await dailyProjectsService.createProject({ name, color });

    res.json({ project });
  } catch (err) {
    console.error('[daily-reports/projects/create] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// ==================== DAILY REPORTS ====================

// GET /daily-reports - Get all reports for a date with filters
router.get('/', async (req, res) => {
  try {
    const { date, project_id, q } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date parameter (YYYY-MM-DD) is required' });
    }

    // Get reports for the date
    const reports = await dailyReportsService.getReportsByDate(date, {
      projectId: project_id,
      search: q,
    });

    // Get summary stats
    const summary = await dailyReportsService.getDateSummary(date);

    res.json({
      date,
      reports,
      summary,
    });
  } catch (err) {
    console.error('[daily-reports] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// POST /daily-reports/save - Upsert a daily report
router.post('/save', async (req, res) => {
  try {
    const { person_id, date, did, next, blockers, project_ids, edited_by_person_id } = req.body;

    if (!person_id || !date) {
      return res.status(400).json({ error: 'person_id and date are required' });
    }

    const report = await dailyReportsService.upsertReportEntry({
      personId: person_id,
      date,
      did,
      next,
      blockers,
      projectIds: project_ids || [],
      editedByPersonId: edited_by_person_id || person_id,
    });

    res.json({ report });
  } catch (err) {
    console.error('[daily-reports/save] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// GET /daily-reports/revisions/:entry_id - Get revision history
router.get('/revisions/:entry_id', async (req, res) => {
  try {
    const { entry_id } = req.params;

    const revisions = await dailyReportsService.getRevisions(entry_id);

    res.json({ revisions });
  } catch (err) {
    console.error('[daily-reports/revisions] error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /daily-reports/calendar - Get monthly calendar stats
router.get('/calendar', async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'year and month parameters are required' });
    }

    const stats = await dailyReportsService.getMonthlyCalendarStats(
      parseInt(year, 10),
      parseInt(month, 10)
    );

    res.json({ year: parseInt(year, 10), month: parseInt(month, 10), stats });
  } catch (err) {
    console.error('[daily-reports/calendar] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

module.exports = router;
