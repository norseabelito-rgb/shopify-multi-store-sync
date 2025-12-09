// lib/tiktok.js
// Helper pentru TikTok Marketing API (Business API v1.3).
// IMPORTANT: e posibil ca unele endpoint-uri sau câmpuri să necesite
// ajustări minore după ce vezi răspunsurile reale din TikTok,
// dar arhitectura e gata de production.

const fetch = require('node-fetch');

const TIKTOK_BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3';

// Helper generic pentru POST la TikTok
async function tiktokPost(path, accessToken, body) {
  const url = `${TIKTOK_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    },
    body: JSON.stringify(body || {}),
  });

  const json = await res.json().catch(() => null);

  // TikTok de obicei folosește code === 0 pentru success
  if (!res.ok) {
    const err = new Error(`TikTok HTTP ${res.status}`);
    err.response = { status: res.status, body: json };
    throw err;
  }

  if (json && typeof json.code !== 'undefined' && json.code !== 0) {
    const err = new Error(`TikTok API error code=${json.code}, message=${json.message || ''}`);
    err.response = { status: res.status, body: json };
    throw err;
  }

  return json;
}

function formatDate(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRanges(now = new Date()) {
  // azi
  const todayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
  const todayEnd = todayStart; // același YYYY-MM-DD

  // început de săptămână (luni, în UTC)
  const dow = todayStart.getUTCDay(); // 0 = duminică
  const diffToMonday = (dow + 6) % 7;
  const weekStart = new Date(todayStart);
  weekStart.setUTCDate(todayStart.getUTCDate() - diffToMonday);
  const weekEnd = todayEnd;

  // început de lună
  const monthStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
    0, 0, 0, 0
  ));
  const monthEnd = todayEnd;

  // început de an
  const yearStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    0,
    1,
    0, 0, 0, 0
  ));
  const yearEnd = todayEnd;

  return {
    today: {
      start: formatDate(todayStart),
      end: formatDate(todayEnd),
    },
    week: {
      start: formatDate(weekStart),
      end: formatDate(weekEnd),
    },
    month: {
      start: formatDate(monthStart),
      end: formatDate(monthEnd),
    },
    year: {
      start: formatDate(yearStart),
      end: formatDate(yearEnd),
    },
  };
}

// Citește statistici agregate pentru un advertiser (spend + results)
// pentru: azi, săptămână, lună, an.
// NOTE: structura `metrics` poate fi ajustată după ce vezi răspunsul real.
async function fetchAdvertiserAggregatedStats(accessToken, advertiserId) {
  const ranges = getDateRanges(new Date());

  async function fetchRange(range) {
    const body = {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: 'AUCTION_ADVERTISER',
      dimensions: [], // agregat pe advertiser
      metrics: ['spend', 'conversions'], // ajustabil
      start_date: range.start,
      end_date: range.end,
      time_granularity: 'TOTAL',
      page: 1,
      page_size: 1,
    };

    const json = await tiktokPost('/report/integrated/get/', accessToken, body);

    const list =
      json &&
      json.data &&
      Array.isArray(json.data.list)
        ? json.data.list
        : [];

    const metrics =
      list[0] && list[0].metrics
        ? list[0].metrics
        : {};

    const spend = Number(metrics.spend || 0);
    const results = Number(
      metrics.conversions ||
      metrics.result ||
      metrics.events ||
      0
    );

    return { spend, results, raw: metrics };
  }

  const [today, week, month, year] = await Promise.all([
    fetchRange(ranges.today),
    fetchRange(ranges.week),
    fetchRange(ranges.month),
    fetchRange(ranges.year),
  ]);

  return { today, week, month, year };
}

// Citește campaniile pentru un advertiser
// NOTE: câmpurile mapate pot fi ajustate după structura reală a răspunsului.
async function fetchCampaigns(accessToken, advertiserId) {
  const body = {
    advertiser_id: advertiserId,
    page: 1,
    page_size: 100,
  };

  const json = await tiktokPost('/campaign/get/', accessToken, body);

  const list =
    json &&
    json.data &&
    Array.isArray(json.data.list)
      ? json.data.list
      : [];

  return list.map((c) => {
    const metrics = c.metrics || {};

    return {
      id: c.campaign_id || c.id,
      name: c.campaign_name || c.name || '(fără nume)',
      status: c.campaign_status || c.status || 'UNKNOWN',
      objective: c.objective_type || c.objective || '',
      daily_budget:
        typeof c.budget === 'number'
          ? c.budget
          : (typeof c.daily_budget === 'number' ? c.daily_budget : null),
      currency: c.currency || null,
      today_spend: metrics.spend != null ? Number(metrics.spend) : null,
      today_results: metrics.conversions != null ? Number(metrics.conversions) : null,
      cpa:
        metrics.spend != null && metrics.conversions
          ? Number(metrics.spend) / Number(metrics.conversions || 1)
          : null,
      raw: c,
    };
  });
}

// Aplică acțiuni pe o campanie: pauză / pornește / modifică buget
// ATENȚIE: endpoint-urile pot avea nevoie de ajustări după doc-urile actuale.
async function applyCampaignAction(accessToken, advertiserId, campaignId, action, value) {
  if (action === 'pause' || action === 'resume') {
    const operation = action === 'pause' ? 'DISABLE' : 'ENABLE';

    const body = {
      advertiser_id: advertiserId,
      campaign_ids: [campaignId],
      operation,
    };

    const json = await tiktokPost('/campaign/update/status/', accessToken, body);
    return { ok: true, raw: json };
  }

  if (action === 'set_budget' || action === 'budget_up_20') {
    let newBudget = Number(value);

    if (action === 'budget_up_20') {
      if (!value) {
        throw new Error('Missing current budget value for budget_up_20');
      }
      newBudget = Math.round(Number(value) * 1.2);
    }

    const body = {
      advertiser_id: advertiserId,
      campaign_id: campaignId,
      // În funcție de API, poate fi nevoie de altă structură.
      // Aici presupunem că putem updata bugetul direct:
      budget: newBudget,
    };

    const json = await tiktokPost('/campaign/update/', accessToken, body);
    return { ok: true, raw: json, newBudget };
  }

  throw new Error(`Unknown campaign action: ${action}`);
}

module.exports = {
  fetchAdvertiserAggregatedStats,
  fetchCampaigns,
  applyCampaignAction,
};