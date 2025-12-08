// routes/dashboard.js
const express = require('express');
const { SCRIPT_TAG } = require('../config');
const { renderDashboard } = require('../ui/dashboardPage');

const router = express.Router();

router.get('/', (req, res) => {
  const html = renderDashboard(SCRIPT_TAG);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = router;