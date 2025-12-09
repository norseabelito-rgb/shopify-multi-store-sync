// ui/marketingPage.js

function marketingPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Marketing – TikTok Ads Control</title>
  <style>
    :root {
      --bg: #05060c;
      --panel: rgba(15, 17, 26, 0.92);
      --border: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.14);
      --text: #eef2ff;
      --muted: #9aa4b5;
      --accent: #5c8bff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 28px;
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(1200px at 20% 20%, rgba(92, 139, 255, 0.08), transparent 45%),
        radial-gradient(1000px at 80% 10%, rgba(73, 199, 255, 0.07), transparent 40%),
        linear-gradient(180deg, #06070f, #05060c);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }
    h2 { margin: 0 0 4px; font-size: 15px; letter-spacing: -0.01em; }
    p  { margin: 0 0 10px; color: var(--muted); }

    .page-shell {
      max-width: 1200px;
      margin: 0 auto 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .hero-sub {
      font-size: 12px;
      color: var(--muted);
    }

    .badge-pill {
      border-radius: 999px;
      border: 1px solid rgba(92, 139, 255, 0.45);
      padding: 6px 12px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: radial-gradient(circle at 0% 0%, rgba(92, 139, 255, 0.25), transparent 55%);
      color: #dbe4ff;
    }

    .panel {
      background: var(--panel);
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.5);
    }

    .panel::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(92, 139, 255, 0.08), transparent 40%);
      opacity: 0.7;
      pointer-events: none;
    }

    .panel > * {
      position: relative;
      z-index: 1;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .muted {
      color: var(--muted);
      font-size: 12px;
      margin: 2px 0 0;
    }

    /* GRID CONTURI */
    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 8px;
    }

    .account-card {
      background: linear-gradient(145deg, rgba(22, 27, 38, 0.95), rgba(10, 14, 24, 0.95));
      border-radius: 12px;
      padding: 12px 12px 10px;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease;
    }

    .account-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-strong);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    }

    .account-label {
      font-size: 14px;
      font-weight: 600;
    }

    .account-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .account-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
    }

    .account-stat {
      padding: 6px 7px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .account-stat-label {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .account-stat-value {
      font-size: 12px;
      font-weight: 500;
      color: #e4ecff;
    }

    .account-actions {
      margin-top: 6px;
    }

    .account-actions button {
      border-radius: 8px;
      padding: 5px 9px;
      cursor: pointer;
      margin-right: 6px;
      margin-top: 4px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: linear-gradient(130deg, #111827, #020617);
      color: #e5e7eb;
      font-size: 11px;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
      transition: transform 0.14s ease, box-shadow 0.18s ease, filter 0.14s ease, opacity 0.18s ease;
    }

    .account-actions button.primary {
      background: linear-gradient(130deg, #5c8bff, #49c7ff);
      color: #020617;
      box-shadow: 0 6px 18px rgba(92, 139, 255, 0.35);
    }

    .account-actions button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55);
      filter: brightness(1.02);
    }

    .account-actions button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* PANEL AGREGATE */
    .totals-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-top: 6px;
      font-size: 12px;
    }

    .totals-item {
      padding: 7px 9px;
      border-radius: 9px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .totals-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .totals-value {
      font-size: 13px;
      font-weight: 600;
      color: #e5e7eb;
    }

    .small-pill {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      font-size: 10px;
      color: #c7d2fe;
      background: rgba(15, 23, 42, 0.9);
      margin-left: 6px;
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="hero">
      <div>
        <h1>Marketing – TikTok Ads Control</h1>
        <p class="hero-sub">Vizualizezi rapid performanța pe conturi și rulezi acțiuni în masă (pauză, reactivare, ajustare bugete).</p>
      </div>
      <div class="badge-pill">Marketing module</div>
    </header>

    <!-- PANOU AGREGAT -->
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>Sumar cheltuieli</h2>
          <p class="muted">Total spend cumulat pe toate conturile TikTok conectate.</p>
        </div>
        <div style="font-size:11px;color:#9ca3af;">
          <span>Refreshed automat la 60s</span>
        </div>
      </div>
      <div class="totals-grid">
        <div class="totals-item">
          <div class="totals-label">Azi</div>
          <div class="totals-value" id="totals-today">—</div>
        </div>
        <div class="totals-item">
          <div class="totals-label">Ultimele 7 zile</div>
          <div class="totals-value" id="totals-week">—</div>
        </div>
        <div class="totals-item">
          <div class="totals-label">Luna curentă</div>
          <div class="totals-value" id="totals-month">—</div>
        </div>
        <div class="totals-item">
          <div class="totals-label">Anul curent</div>
          <div class="totals-value" id="totals-year">—</div>
        </div>
      </div>
    </section>

    <!-- CONTURI -->
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>Conturi TikTok Ads conectate</h2>
          <p class="muted">Fiecare card reprezintă un advertiser TikTok configurat în sheet-ul <code>TikTokAccounts</code>.</p>
        </div>
      </div>

      <div id="accounts" class="accounts-grid"></div>
    </section>
  </div>

  <script>
    var accountsContainer = document.getElementById('accounts');
    var totalsTodayEl  = document.getElementById('totals-today');
    var totalsWeekEl   = document.getElementById('totals-week');
    var totalsMonthEl  = document.getElementById('totals-month');
    var totalsYearEl   = document.getElementById('totals-year');

    async function loadAccountsAndStats() {
      try {
        const res = await fetch('/tiktok/accounts');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const accounts = await res.json();

        accountsContainer.innerHTML = '';
        var aggregate = {
          haveData: false,
          currency: null,
          today: 0,
          week: 0,
          month: 0,
          year: 0
        };

        for (const acc of accounts) {
          const card = document.createElement('div');
          card.className = 'account-card';
          const safeId = acc.account_id;

          card.innerHTML = \`
            <div>
              <div class="account-label">\${acc.label || acc.account_id}</div>
              <div class="account-sub">Advertiser ID: \${acc.advertiser_id || '—'}</div>
            </div>
            <div class="account-stats">
              <div class="account-stat">
                <span class="account-stat-label">Azi</span>
                <span class="account-stat-value" id="stat-today-\${safeId}">—</span>
              </div>
              <div class="account-stat">
                <span class="account-stat-label">7 zile</span>
                <span class="account-stat-value" id="stat-week-\${safeId}">—</span>
              </div>
              <div class="account-stat">
                <span class="account-stat-label">Lună</span>
                <span class="account-stat-value" id="stat-month-\${safeId}">—</span>
              </div>
              <div class="account-stat">
                <span class="account-stat-label">An</span>
                <span class="account-stat-value" id="stat-year-\${safeId}">—</span>
              </div>
            </div>
            <div class="account-actions">
              <button class="primary" data-type="INCREASE_BUDGET" data-account-id="\${safeId}">+20% buget azi</button>
              <button data-type="PAUSE_ALL" data-account-id="\${safeId}">Pauză toate campaniile</button>
              <button data-type="RESUME_ALL" data-account-id="\${safeId}">Repornește campaniile</button>
            </div>
          \`;

          accountsContainer.appendChild(card);

          // încărcăm stats pentru contul curent
          try {
            const statsRes = await fetch('/tiktok/stats?account_id=' + encodeURIComponent(acc.account_id));
            if (!statsRes.ok) throw new Error('HTTP ' + statsRes.status);
            const stats = await statsRes.json();

            const curr = stats.currency || acc.currency || '';

            updateStatLabel('stat-today-' + safeId,  stats.today  && stats.today.spend,  curr);
            updateStatLabel('stat-week-' + safeId,   stats.week   && stats.week.spend,   curr);
            updateStatLabel('stat-month-' + safeId,  stats.month  && stats.month.spend,  curr);
            updateStatLabel('stat-year-' + safeId,   stats.year   && stats.year.spend,   curr);

            if (!aggregate.currency && curr) aggregate.currency = curr;
            if (typeof stats.today?.spend  === 'number') { aggregate.today  += stats.today.spend;  aggregate.haveData = true; }
            if (typeof stats.week?.spend   === 'number') { aggregate.week   += stats.week.spend;   aggregate.haveData = true; }
            if (typeof stats.month?.spend  === 'number') { aggregate.month  += stats.month.spend;  aggregate.haveData = true; }
            if (typeof stats.year?.spend   === 'number') { aggregate.year   += stats.year.spend;   aggregate.haveData = true; }
          } catch (err) {
            console.error('load stats error for', acc.account_id, err);
          }
        }

        // actualizăm panoul agregat
        if (aggregate.haveData) {
          const cur = aggregate.currency || '';
          totalsTodayEl.textContent = aggregate.today.toFixed(2) + ' ' + cur;
          totalsWeekEl.textContent  = aggregate.week.toFixed(2)  + ' ' + cur;
          totalsMonthEl.textContent = aggregate.month.toFixed(2) + ' ' + cur;
          totalsYearEl.textContent  = aggregate.year.toFixed(2)  + ' ' + cur;
        } else {
          totalsTodayEl.textContent = '—';
          totalsWeekEl.textContent  = '—';
          totalsMonthEl.textContent = '—';
          totalsYearEl.textContent  = '—';
        }
      } catch (err) {
        console.error('loadAccountsAndStats error', err);
      }
    }

    function updateStatLabel(id, value, currency) {
      var el = document.getElementById(id);
      if (!el) return;
      if (typeof value === 'number') {
        el.textContent = value.toFixed(2) + ' ' + (currency || '');
      } else {
        el.textContent = '—';
      }
    }

    // delegare acțiuni butoane
    accountsContainer.addEventListener('click', async function (e) {
      var btn = e.target;
      if (!(btn instanceof HTMLButtonElement)) return;

      var accountId = btn.getAttribute('data-account-id');
      var type = btn.getAttribute('data-type');
      if (!accountId || !type) return;

      btn.disabled = true;
      try {
        await fetch('/tiktok/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: accountId, type: type })
        });
        alert('Acțiune trimisă: ' + type + ' pentru ' + accountId);
      } catch (err) {
        console.error('tiktok action error', err);
        alert('Eroare la acțiune: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    });

    // init + auto-refresh la 60s
    loadAccountsAndStats();
    setInterval(loadAccountsAndStats, 60000);
  </script>
</body>
</html>
  `;
}

module.exports = marketingPage;