// routes/marketing.js

const express = require('express');
const router = express.Router();

const marketingPage = require('../ui/marketingPage');
const { loadSheet } = require('../services/googleSheets');

// helper: încarcă config pentru un cont TikTok din sheet-ul TikTokAccounts
async function getTiktokAccountConfig(accountId) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_ID env var');
  }

  const sheet = await loadSheet(spreadsheetId, 'TikTokAccounts');
  const rows = sheet.rows || [];
  const row = rows.find(r => r.account_id === accountId);

  if (!row) {
    throw new Error('Unknown TikTok account_id: ' + accountId);
  }
  return row;
}

/**
 * GET /marketing
 * Returnează pagina HTML pentru modulul de marketing.
 */
router.get('/marketing', (req, res) => {
  res.send(marketingPage());
});

/**
 * GET /tiktok/accounts
 * Returnează lista conturilor TikTok active din sheet-ul TikTokAccounts.
 */
router.get('/tiktok/accounts', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const sheet = await loadSheet(spreadsheetId, 'TikTokAccounts');
    const rows = sheet.rows || [];

    const accounts = rows
      .filter(r => String(r.active || '').toLowerCase() === 'true')
      .map(r => ({
        account_id: r.account_id,
        label: r.label,
        advertiser_id: r.advertiser_id,
        business_center_id: r.business_center_id || null,
        timezone: r.timezone || 'Europe/Bucharest',
        currency: r.currency || 'RON',
      }));

    res.json(accounts);
  } catch (err) {
    console.error('/tiktok/accounts error', err);
    res.status(500).json({ error: 'Failed to load TikTok accounts', message: err.message });
  }
});

/**
 * GET /tiktok/stats?account_id=TT_X
 * MVP: întoarce structura de stats; momentan cu valori 0 (placeholder),
 * ca să putem dezvolta UI-ul. Ulterior aici chemăm TikTok Business API.
 */
router.get('/tiktok/stats', async (req, res) => {
  try {
    const accountId = req.query.account_id;
    if (!accountId) {
      return res.status(400).json({ error: 'Missing account_id' });
    }

    const cfg = await getTiktokAccountConfig(accountId);

    const data = {
      account_id: accountId,
      label: cfg.label,
      currency: cfg.currency || 'RON',
      today: { spend: 0, conversions: 0, impressions: 0, clicks: 0 },
      week:  { spend: 0, conversions: 0, impressions: 0, clicks: 0 },
      month: { spend: 0, conversions: 0, impressions: 0, clicks: 0 },
      year:  { spend: 0, conversions: 0, impressions: 0, clicks: 0 },
      // flag, ca să știm că încă nu e conectat la TikTok real:
      placeholder: true,
    };

    res.json(data);
  } catch (err) {
    console.error('/tiktok/stats error', err);
    res.status(500).json({ error: 'Failed to load TikTok stats', message: err.message });
  }
});

/**
 * POST /tiktok/action
 * body: { account_id, type, payload? }
 * Deocamdată doar log + răspuns OK. Ulterior conectăm la TikTok API (campaign update).
 */
router.post('/tiktok/action', async (req, res) => {
  try {
    const { account_id, type, payload } = req.body || {};
    if (!account_id || !type) {
      return res.status(400).json({ error: 'Missing account_id or type' });
    }

    const cfg = await getTiktokAccountConfig(account_id);

    console.log('TikTok action requested', {
      account_id,
      type,
      payload: payload || null,
      advertiser_id: cfg.advertiser_id,
    });

    // TODO: aici se vor face apelurile reale către TikTok (campaign pause/resume/budget)
    res.json({ ok: true, account_id, type });
  } catch (err) {
    console.error('/tiktok/action error', err);
    res.status(500).json({ error: 'Failed to perform TikTok action', message: err.message });
  }
});

module.exports = router;