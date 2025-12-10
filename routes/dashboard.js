// routes/dashboard.js
const express = require('express');
const router = express.Router();

const dashboardPage = require('../ui/dashboardPage');

// Root-ul aplicației: app shell (burger + meniu + module)
router.get('/', (req, res) => {
  res.send(dashboardPage());
});

module.exports = router;