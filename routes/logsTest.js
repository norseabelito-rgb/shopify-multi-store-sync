// routes/logsTest.js
const express = require('express');
const { appendTestOrdersLogRow } = require('../lib/googleLogs');

const router = express.Router();

router.post('/logs/test', async (req, res) => {
  console.log('[logsTest] HTTP trigger received');
  try {
    await appendTestOrdersLogRow();
    res.json({ success: true });
  } catch (err) {
    console.error('/logs/test error', err);
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

module.exports = router;
