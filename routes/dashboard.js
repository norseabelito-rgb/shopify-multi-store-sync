// routes/dashboard.js
const express = require('express');
const router = express.Router();

const { SCRIPT_TAG } = require('../config');
const getDashboardPageHtml = require('../ui/dashboardPage');

router.get('/', (req, res) => {
  const html = getDashboardPageHtml(SCRIPT_TAG);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

module.exports = router;