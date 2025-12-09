// routes/marketing.js
const express = require('express');
const { loadSheet } = require('../lib/google');
const {
  fetchAdvertiserAggregatedStats,
  fetchCampaigns,
  applyCampaignAction,
} = require('../lib/tiktok');

const router = express.Router();

// ca să putem citi JSON din body (POST /campaigns/:id/action)
router.use(express.json());

// helper: construiește numele variabilei de mediu pentru token
function envKeyForAccount(accountId) {
  return (
    'TIKTOK_TOKEN_' +
    String(accountId || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
  );
}

// citește toate conturile din sheet-ul TikTokAccounts
async function loadTikTokAccounts() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_ID env var');
  }

  const sheet = await loadSheet(spreadsheetId, 'TikTokAccounts');
  const rows = sheet.rows || [];

  // așteptăm să existe coloană account_id, display_name, advertiser_id, currency (opțional), timezone (opțional)
  return rows.map((r) => ({
    account_id: r.account_id,
    display_name: r.display_name || r.account_id,
    advertiser_id: r.advertiser_id,
    currency: r.currency || 'RON',
    timezone: r.timezone || 'Europe/Bucharest',
  }));
}

// GET /api/marketing/accounts
// -> listă de conturi + statistici (azi / săptămână / lună / an)
// dacă lipsesc token-urile, primești statistici null + _debug
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await loadTikTokAccounts();

    const enriched = await Promise.all(
      accounts.map(async (acc) => {
        const envKey = envKeyForAccount(acc.account_id);
        const token = process.env[envKey];

        if (!token) {
          return {
            ...acc,
            today: null,
            week: null,
            month: null,
            year: null,
            _debug: `NO_TOKEN (${envKey})`,
          };
        }

        try {
          const stats = await fetchAdvertiserAggregatedStats(token, acc.advertiser_id);
          return {
            ...acc,
            today: {
              spend: stats.today.spend,
              results: stats.today.results,
            },
            week: {
              spend: stats.week.spend,
              results: stats.week.results,
            },
            month: {
              spend: stats.month.spend,
              results: stats.month.results,
            },
            year: {
              spend: stats.year.spend,
              results: stats.year.results,
            },
            _debug: null,
          };
        } catch (err) {
          console.error('[TikTok] fetchAdvertiserAggregatedStats error', {
            account_id: acc.account_id,
            advertiser_id: acc.advertiser_id,
            error: err.message,
          });

          return {
            ...acc,
            today: null,
            week: null,
            month: null,
            year: null,
            _debug: `ERROR_STATS: ${err.message}`,
          };
        }
      })
    );

    res.json({ accounts: enriched });
  } catch (err) {
    console.error('/api/marketing/accounts error', err);
    res.status(500).json({
      error: 'Failed to load TikTok accounts',
      message: err.message,
    });
  }
});

// GET /api/marketing/accounts/:accountId/campaigns
router.get('/accounts/:accountId/campaigns', async (req, res) => {
  try {
    const { accountId } = req.params;
    const accounts = await loadTikTokAccounts();
    const acc = accounts.find((a) => a.account_id === accountId);

    if (!acc) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const envKey = envKeyForAccount(acc.account_id);
    const token = process.env[envKey];

    if (!token) {
      return res.status(400).json({
        error: 'Missing TikTok token for this account',
        envKey,
      });
    }

    const campaigns = await fetchCampaigns(token, acc.advertiser_id);

    res.json({
      account_id: acc.account_id,
      advertiser_id: acc.advertiser_id,
      campaigns,
    });
  } catch (err) {
    console.error('/api/marketing/accounts/:accountId/campaigns error', err);
    res.status(500).json({
      error: 'Failed to load TikTok campaigns',
      message: err.message,
    });
  }
});

// POST /api/marketing/campaigns/:campaignId/action
// body: { account_id: 'BF24H_MAIN', action: 'pause'|'resume'|'set_budget'|'budget_up_20', value?: number }
router.post('/campaigns/:campaignId/action', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { account_id: accountId, action, value } = req.body || {};

    if (!accountId) {
      return res.status(400).json({ error: 'Missing account_id in body' });
    }
    if (!action) {
      return res.status(400).json({ error: 'Missing action in body' });
    }

    const accounts = await loadTikTokAccounts();
    const acc = accounts.find((a) => a.account_id === accountId);

    if (!acc) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const envKey = envKeyForAccount(acc.account_id);
    const token = process.env[envKey];

    if (!token) {
      return res.status(400).json({
        error: 'Missing TikTok token for this account',
        envKey,
      });
    }

    const result = await applyCampaignAction(
      token,
      acc.advertiser_id,
      campaignId,
      action,
      value
    );

    res.json({
      ok: true,
      account_id: acc.account_id,
      advertiser_id: acc.advertiser_id,
      campaign_id: campaignId,
      applied_action: action,
      value: value ?? null,
      result,
    });
  } catch (err) {
    console.error('/api/marketing/campaigns/:campaignId/action error', err);
    res.status(500).json({
      error: 'Failed to apply campaign action',
      message: err.message,
    });
  }
});

module.exports = router;