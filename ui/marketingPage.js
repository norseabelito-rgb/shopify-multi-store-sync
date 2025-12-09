// ui/marketingPage.js

function marketingPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Marketing Control – TikTok Ads</title>
  <style>
    :root {
      --bg: #020617;
      --panel: rgba(15, 23, 42, 0.96);
      --border: rgba(148, 163, 184, 0.3);
      --border-soft: rgba(148, 163, 184, 0.18);
      --text: #e5e7eb;
      --muted: #94a3b8;
      --accent: #60a5fa;
      --accent-soft: rgba(56, 189, 248, 0.16);
      --danger: #f97373;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 28px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(1200px at 5% 0%, rgba(56, 189, 248, 0.2), transparent 55%),
        radial-gradient(1400px at 95% 0%, rgba(96, 165, 250, 0.2), transparent 55%),
        linear-gradient(180deg, #020617, #020617);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.03em; }
    h2 { margin: 0 0 6px; font-size: 18px; letter-spacing: -0.02em; }
    p  { margin: 4px 0 10px; color: var(--muted); }

    .page-shell {
      max-width: 1240px;
      margin: 0 auto 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 10px;
      color: var(--muted);
      margin: 0 0 8px;
    }

    .status-pill {
      border-radius: 999px;
      padding: 6px 14px;
      border: 1px solid rgba(34, 197, 94, 0.6);
      color: #bbf7d0;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: radial-gradient(circle at 0% 0%, rgba(22, 163, 74, 0.35), transparent 60%);
    }

    .panel {
      background: var(--panel);
      border-radius: 14px;
      border: 1px solid var(--border-soft);
      padding: 16px 16px 14px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 70px rgba(15, 23, 42, 0.9);
    }

    .panel::before {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.16), transparent 55%);
      pointer-events: none;
      opacity: 0.7;
    }

    .panel > * {
      position: relative;
      z-index: 1;
    }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .muted { color: var(--muted); font-size: 12px; }

    /* Accounts grid */
    .accounts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 6px;
    }

    .account-card {
      border-radius: 12px;
      border: 1px solid var(--border-soft);
      background: radial-gradient(circle at 0% 0%, var(--accent-soft), transparent 65%);
      padding: 12px 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: default;
      transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
    }

    .account-card:hover {
      transform: translateY(-2px);
      border-color: var(--border);
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.9);
    }

    .account-title {
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
    }

    .stat-chip {
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(15, 23, 42, 0.85);
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    .stat-value {
      font-size: 13px;
      font-weight: 600;
    }

    .stat-note {
      font-size: 10px;
      color: var(--muted);
    }

    .account-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 4px;
    }

    .tag {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      color: var(--muted);
    }

    button {
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      background: linear-gradient(135deg, #60a5fa, #38bdf8);
      color: #0b1120;
      font-size: 12px;
      padding: 5px 11px;
      cursor: pointer;
      letter-spacing: 0.01em;
      box-shadow: 0 8px 22px rgba(37, 99, 235, 0.45);
      transition: transform 0.13s ease, box-shadow 0.15s ease, filter 0.13s ease, opacity 0.15s ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.05);
      box-shadow: 0 12px 28px rgba(37, 99, 235, 0.6);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    button.secondary {
      background: rgba(15, 23, 42, 0.95);
      color: var(--text);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.9);
    }

    button.danger {
      background: linear-gradient(135deg, #f97373, #fb7185);
      border-color: rgba(248, 113, 113, 0.7);
      box-shadow: 0 8px 22px rgba(190, 24, 93, 0.5);
    }

    /* Campaigns table */

    .campaign-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .campaign-current-account {
      font-size: 12px;
      color: var(--muted);
    }

    .campaign-current-account strong {
      color: #e5e7eb;
    }

    .campaigns-wrapper {
      max-height: 420px;
      overflow: auto;
      border-radius: 10px;
      border: 1px solid var(--border-soft);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    thead {
      position: sticky;
      top: 0;
      background: rgba(15, 23, 42, 0.98);
      z-index: 1;
      backdrop-filter: blur(12px);
    }

    th, td {
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      padding: 8px 10px;
      vertical-align: middle;
    }

    th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.8);
    }

    tbody tr:hover {
      background: rgba(30, 64, 175, 0.35);
    }

    .status-pill {
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 10px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .status-active {
      border-color: rgba(74, 222, 128, 0.7);
      color: #bbf7d0;
      background: rgba(22, 163, 74, 0.2);
    }

    .status-paused {
      border-color: rgba(251, 191, 36, 0.7);
      color: #fef3c7;
      background: rgba(180, 83, 9, 0.3);
    }

    .status-unknown {
      border-color: rgba(148, 163, 184, 0.7);
      color: #e5e7eb;
      background: rgba(30, 64, 175, 0.3);
    }

    .metric-strong {
      font-weight: 600;
    }

    .metric-muted {
      color: var(--muted);
    }

    .campaign-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* Log */

    #log {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11px;
      white-space: pre-wrap;
      background: rgba(15, 23, 42, 0.96);
      border-radius: 10px;
      padding: 10px;
      border: 1px solid var(--border-soft);
      max-height: 220px;
      overflow: auto;
      color: #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Marketing Control</p>
        <h1>TikTok Ads – Multi-Account</h1>
        <p>Vizualizezi rapid performanța pe conturi & controlezi campaniile (pauză/pornește/buget) dintr-un singur loc.</p>
      </div>
      <div class="status-pill">
        TikTok API – Ready (tokens via ENV)
      </div>
    </header>

    <!-- Accounts -->
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>Conturi TikTok Ads</h2>
          <p class="muted">Date reale atunci când adaugi token-urile în ENV (<code style="font-size:11px;">TIKTOK_TOKEN_*</code>).</p>
        </div>
        <button id="refresh-accounts" class="secondary">Reîncarcă</button>
      </div>
      <div id="accounts" class="accounts-grid"></div>
    </section>

    <!-- Campaigns -->
    <section class="panel">
      <div class="section-heading">
        <div class="campaign-header">
          <h2>Campanii</h2>
        </div>
        <div class="campaign-current-account" id="current-account-label">
          Niciun cont selectat încă.
        </div>
      </div>

      <div class="campaigns-wrapper" id="campaigns-wrapper">
        <!-- tabelul se randează din JS -->
      </div>
    </section>

    <!-- Log -->
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>Log acțiuni</h2>
          <p class="muted">Aici vezi ce apeluri & acțiuni ai trimis către TikTok API.</p>
        </div>
      </div>
      <div id="log">Ready. Încarcă conturile TikTok sau selectează un cont pentru a vedea campaniile.</div>
    </section>
  </div>

  <script>
    var accountsEl = document.getElementById('accounts');
    var refreshAccountsBtn = document.getElementById('refresh-accounts');
    var campaignsWrapperEl = document.getElementById('campaigns-wrapper');
    var currentAccountLabelEl = document.getElementById('current-account-label');
    var logEl = document.getElementById('log');

    var currentAccount = null;

    function appendLog(msg) {
      var ts = new Date().toISOString();
      logEl.textContent = '[' + ts + '] ' + msg + '\\n' + logEl.textContent;
    }

    function formatMoney(value, currency) {
      if (value == null || isNaN(value)) return '–';
      var v = Number(value);
      return v.toFixed(2) + ' ' + (currency || '');
    }

    function formatInt(val) {
      if (val == null || isNaN(val)) return '–';
      return String(Math.round(Number(val)));
    }

    function statusClass(status) {
      var s = String(status || '').toUpperCase();
      if (s.includes('ACTIVE')) return 'status-pill status-active';
      if (s.includes('PAUSE')) return 'status-pill status-paused';
      return 'status-pill status-unknown';
    }

    async function loadAccounts() {
      try {
        refreshAccountsBtn.disabled = true;
        accountsEl.innerHTML = '<div class="muted">Încarc conturile TikTok...</div>';

        const res = await fetch('/api/marketing/accounts');
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }

        const data = await res.json();
        const accounts = data.accounts || [];

        if (!accounts.length) {
          accountsEl.innerHTML = '<div class="muted">Nu există încă rânduri în sheet-ul <strong>TikTokAccounts</strong>.</div>';
          return;
        }

        accountsEl.innerHTML = '';

        accounts.forEach(function (acc) {
          var card = document.createElement('div');
          card.className = 'account-card';

          var debugInfo = acc._debug || null;

          var today = acc.today || {};
          var week = acc.week || {};
          var month = acc.month || {};
          var year = acc.year || {};

          card.innerHTML =
            '<div>' +
              '<div class="account-title">' + (acc.display_name || acc.account_id) + '</div>' +
              '<div class="account-sub">Advertiser ID: ' + (acc.advertiser_id || '–') + '</div>' +
            '</div>' +
            '<div class="account-stats">' +
              '<div class="stat-chip">' +
                '<div class="stat-label">Azi</div>' +
                '<div class="stat-value">' + formatMoney(today.spend, acc.currency) + '</div>' +
                '<div class="stat-note">Rezultate: ' + formatInt(today.results) + '</div>' +
              '</div>' +
              '<div class="stat-chip">' +
                '<div class="stat-label">Săptămână</div>' +
                '<div class="stat-value">' + formatMoney(week.spend, acc.currency) + '</div>' +
                '<div class="stat-note">Rezultate: ' + formatInt(week.results) + '</div>' +
              '</div>' +
              '<div class="stat-chip">' +
                '<div class="stat-label">Lună</div>' +
                '<div class="stat-value">' + formatMoney(month.spend, acc.currency) + '</div>' +
                '<div class="stat-note">Rezultate: ' + formatInt(month.results) + '</div>' +
              '</div>' +
              '<div class="stat-chip">' +
                '<div class="stat-label">An</div>' +
                '<div class="stat-value">' + formatMoney(year.spend, acc.currency) + '</div>' +
                '<div class="stat-note">Rezultate: ' + formatInt(year.results) + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="account-footer">' +
              '<span class="tag">' + (debugInfo ? debugInfo : ('Token OK · ' + (acc.currency || ''))) + '</span>' +
              '<button class="btn-view-campaigns" data-account-id="' + acc.account_id + '">Vezi campanii</button>' +
            '</div>';

          accountsEl.appendChild(card);
        });

        appendLog('Conturi TikTok încărcate (' + accounts.length + ').');
      } catch (err) {
        appendLog('Eroare la loadAccounts: ' + err.message);
        accountsEl.innerHTML = '<div class="muted">Eroare la încărcarea conturilor TikTok.</div>';
      } finally {
        refreshAccountsBtn.disabled = false;
      }
    }

    async function loadCampaignsForAccount(accountId) {
      try {
        currentAccount = accountId;
        campaignsWrapperEl.innerHTML = '<div class="muted" style="padding:8px 10px;">Încarc campaniile pentru ' + accountId + '...</div>';
        currentAccountLabelEl.innerHTML = 'Cont selectat: <strong>' + accountId + '</strong>';

        const res = await fetch('/api/marketing/accounts/' + encodeURIComponent(accountId) + '/campaigns');
        if (!res.ok) {
          const txt = await res.text();
          appendLog('Eroare la loadCampaigns (' + accountId + '): HTTP ' + res.status + ' ' + txt);
          campaignsWrapperEl.innerHTML = '<div class="muted" style="padding:8px 10px;">Eroare la încărcarea campaniilor.</div>';
          return;
        }

        const data = await res.json();
        const campaigns = data.campaigns || [];

        if (!campaigns.length) {
          campaignsWrapperEl.innerHTML = '<div class="muted" style="padding:8px 10px;">Nu există campanii pentru acest cont.</div>';
          appendLog('Nicio campanie retur pentru account ' + accountId);
          return;
        }

        var rowsHtml = campaigns.map(function (c) {
          var statusUpper = String(c.status || '').toUpperCase();
          var isActive = statusUpper.includes('ACTIVE');

          return (
            '<tr>' +
              '<td>' +
                '<div class="metric-strong">' + (c.name || '(fără nume)') + '</div>' +
                '<div class="metric-muted">ID: ' + (c.id || '–') + '</div>' +
              '</td>' +
              '<td>' +
                '<span class="' + statusClass(c.status) + '">' + (c.status || 'UNKNOWN') + '</span>' +
              '</td>' +
              '<td>' + (c.objective || '–') + '</td>' +
              '<td>' + (c.daily_budget != null ? c.daily_budget : '–') + '</td>' +
              '<td>' + (c.today_spend != null ? c.today_spend.toFixed(2) : '–') + '</td>' +
              '<td>' + (c.today_results != null ? c.today_results : '–') + '</td>' +
              '<td>' + (c.cpa != null ? c.cpa.toFixed(2) : '–') + '</td>' +
              '<td>' +
                '<div class="campaign-actions">' +
                  '<button ' +
                    'class="secondary btn-act" ' +
                    'data-campaign-id="' + c.id + '" ' +
                    'data-action="' + (isActive ? 'pause' : 'resume') + '"' +
                  '>' + (isActive ? 'Pauză' : 'Pornește') + '</button>' +
                  '<button ' +
                    'class="secondary btn-act" ' +
                    'data-campaign-id="' + c.id + '" ' +
                    'data-action="budget_up_20" ' +
                    'data-current-budget="' + (c.daily_budget != null ? c.daily_budget : '') + '"' +
                  '>+20% buget</button>' +
                '</div>' +
              '</td>' +
            '</tr>'
          );
        }).join('');

        var tableHtml =
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Campanie</th>' +
                '<th>Status</th>' +
                '<th>Obiectiv</th>' +
                '<th>Buget zilnic</th>' +
                '<th>Spend azi</th>' +
                '<th>Rezultate azi</th>' +
                '<th>CPA (approx)</th>' +
                '<th>Acțiuni</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>';

        campaignsWrapperEl.innerHTML = tableHtml;

        appendLog('Campanii încărcate pentru account ' + accountId + ' (' + campaigns.length + ').');
      } catch (err) {
        appendLog('Eroare la loadCampaignsForAccount: ' + err.message);
        campaignsWrapperEl.innerHTML = '<div class="muted" style="padding:8px 10px;">Eroare la încărcarea campaniilor.</div>';
      }
    }

    // delegare click pe conturi
    accountsEl.addEventListener('click', function (e) {
      var btn = e.target;
      if (!(btn instanceof HTMLButtonElement)) return;
      if (!btn.classList.contains('btn-view-campaigns')) return;

      var accountId = btn.getAttribute('data-account-id');
      if (!accountId) return;

      loadCampaignsForAccount(accountId);
    });

    // delegare click pe acțiuni campanie
    campaignsWrapperEl.addEventListener('click', async function (e) {
      var btn = e.target;
      if (!(btn instanceof HTMLButtonElement)) return;
      if (!btn.classList.contains('btn-act')) return;

      if (!currentAccount) {
        appendLog('Nu există cont selectat pentru acțiuni campanii.');
        return;
      }

      var campaignId = btn.getAttribute('data-campaign-id');
      var action = btn.getAttribute('data-action');
      var currentBudgetStr = btn.getAttribute('data-current-budget');
      var currentBudget = currentBudgetStr ? Number(currentBudgetStr) : null;

      btn.disabled = true;

      try {
        var body = {
          account_id: currentAccount,
          action: action,
        };

        if (action === 'budget_up_20') {
          body.value = currentBudget;
        }

        appendLog('Aplic acțiune "' + action + '" pe campanie ' + campaignId + ' (account ' + currentAccount + ').');

        var res = await fetch('/api/marketing/campaigns/' + encodeURIComponent(campaignId) + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        var txt = await res.text();
        if (!res.ok) {
          appendLog('Eroare la acțiune campanie: HTTP ' + res.status + ' ' + txt);
          return;
        }

        appendLog('Acțiune campanie OK: ' + txt);

        // după acțiune, reîncărcăm campaniile pentru contul curent
        loadCampaignsForAccount(currentAccount);
      } catch (err) {
        appendLog('Eroare la aplicarea acțiunii: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    });

    refreshAccountsBtn.addEventListener('click', loadAccounts);

    // init
    loadAccounts();
  </script>
</body>
</html>
  `;
}

module.exports = marketingPage;