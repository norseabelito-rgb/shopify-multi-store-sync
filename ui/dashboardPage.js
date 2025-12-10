// ui/dashboardPage.js

function dashboardPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Multi-Store Hub</title>
  <style>
    :root {
      --bg: #020617;
      --bg-deep: #020617;
      --sidebar: #020617;
      --panel: rgba(11, 15, 25, 0.96);
      --panel-soft: rgba(15, 23, 42, 0.96);
      --border: rgba(148, 163, 184, 0.2);
      --border-soft: rgba(148, 163, 184, 0.12);
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #4f8cff;
      --accent-soft: rgba(79, 140, 255, 0.18);
      --danger: #fb7185;
      --success: #22c55e;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text",
        "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.25), transparent 55%),
        radial-gradient(circle at 130% -10%, rgba(45, 212, 191, 0.18), transparent 55%),
        linear-gradient(150deg, #020617, #020617 40%, #020617);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    .app-shell {
      display: flex;
      min-height: 100vh;
    }

    /* SIDEBAR */

    .sidebar {
      width: 260px;
      padding: 18px 18px 14px;
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.36), transparent 60%),
        linear-gradient(180deg, #020617, #030712 50%, #020617);
      border-right: 1px solid rgba(15, 23, 42, 0.9);
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }

    .brand {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .brand-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .brand-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .beta-pill {
      font-size: 10px;
      padding: 3px 6px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .sidebar-section-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin: 10px 0 4px;
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      border-radius: 10px;
      border: 1px solid transparent;
      padding: 7px 9px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e5e7eb;
      cursor: pointer;
      background: transparent;
      text-align: left;
    }

    .nav-item span {
      flex: 1;
    }

    .nav-item small {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
    }

    .nav-item.active {
      border-color: rgba(79, 140, 255, 0.7);
      background: radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.3), rgba(15, 23, 42, 0.96));
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.9);
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid rgba(15, 23, 42, 0.9);
    }

    .sidebar-footer-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .context-select {
      width: 100%;
      padding: 7px 9px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.96);
      color: var(--text);
      font-size: 12px;
    }

    .sidebar-footer-hint {
      margin-top: 4px;
      font-size: 10px;
      color: var(--muted);
    }

    .sidebar-footer-env {
      margin-top: 8px;
      font-size: 10px;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
    }

    /* MAIN */

    .main {
      flex: 1;
      padding: 20px 26px 26px;
    }

    .main-inner {
      max-width: 1600px; /* mai întins, mai puțin spațiu mort */
      margin: 0 auto;
    }

    .top-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .top-title-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 10px;
      color: var(--muted);
    }

    .page-title {
      margin: 0;
      font-size: 18px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .page-subtitle {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }

    .context-pill {
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.2), transparent 55%);
      color: #e5e7eb;
    }

    .context-pill span:first-child {
      opacity: 0.6;
      margin-right: 6px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 9px;
    }

    /* STAT CARDS (top) */

    .grid-top {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: var(--panel);
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 11px 12px;
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .stat-main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px;
    }

    .stat-value {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    .stat-chip {
      align-self: flex-start;
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .stat-desc {
      margin-top: 4px;
      font-size: 11px;
      color: var(--muted);
    }

    /* PANELS */

    .panel {
      background: var(--panel-soft);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 14px 16px 12px;
      margin-bottom: 16px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .panel-title-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #cbd5f5;
    }

    .panel-subtitle {
      font-size: 11px;
      color: var(--muted);
    }

    .badge-soft {
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: rgba(15, 23, 42, 0.9);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    /* TABLE HOME */

    .table-wrapper {
      border-radius: 12px;
      border: 1px solid rgba(15, 23, 42, 0.9);
      overflow: hidden;
      background: radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.98));
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: #e5e7eb;
    }

    thead {
      background: rgba(15, 23, 42, 0.98);
    }

    th,
    td {
      padding: 9px 10px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.9);
    }

    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #9ca3af;
      text-align: left;
    }

    th.numeric,
    td.numeric {
      text-align: center; /* cifre centrate */
    }

    tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.9);
    }

    tbody tr:hover {
      background: rgba(30, 64, 175, 0.55);
    }

    .store-name-cell {
      font-weight: 500;
    }

    .muted {
      color: var(--muted);
      font-size: 11px;
    }

    .empty-state {
      text-align: center;
      padding: 30px 12px 32px;
      color: var(--muted);
      font-size: 13px;
    }

    .empty-state strong {
      display: block;
      margin-bottom: 4px;
      color: #e5e7eb;
      font-size: 14px;
    }

    /* MY STORES – cards */

    .stores-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    @media (max-width: 1200px) {
      .stores-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 900px) {
      .stores-grid { grid-template-columns: minmax(0, 1fr); }
    }

    .store-card {
      border-radius: 14px;
      border: 1px solid var(--border-soft);
      background: radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.98));
      padding: 12px 13px 11px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .store-card-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: baseline;
    }

    .store-name {
      font-size: 13px;
      font-weight: 600;
    }

    .store-domain {
      font-size: 11px;
      color: var(--muted);
    }

    .store-stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .stat-chip-store {
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.96);
      padding: 6px 7px;
    }

    .stat-chip-label {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 3px;
    }

    .stat-chip-value {
      font-size: 13px;
      font-weight: 600;
      text-align: center;
    }

    /* EXEC header single store */

    .exec-store-header {
      display: none;
      justify-content: space-between;
      align-items: center;
      border-radius: 16px;
      border: 1px solid var(--border);
      background:
        radial-gradient(circle at 0% 0%, rgba(79, 140, 255, 0.4), rgba(15, 23, 42, 0.98));
      padding: 14px 16px;
      margin-bottom: 12px;
    }

    .exec-left h2 {
      margin: 0 0 4px;
      font-size: 18px;
    }

    .exec-left p {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
    }

    .exec-right {
      display: flex;
      gap: 10px;
    }

    .exec-kpi {
      min-width: 100px;
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid var(--border-soft);
      text-align: center;
    }

    .exec-kpi-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 3px;
    }

    .exec-kpi-value {
      font-size: 15px;
      font-weight: 600;
    }

    /* BUTTONS */

    .btn {
      border-radius: 999px;
      border: 1px solid var(--border);
      padding: 7px 14px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      background: rgba(15, 23, 42, 0.92);
      color: #e5e7eb;
      cursor: pointer;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), #22c1c3);
      color: #020617;
      border-color: transparent;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* VIEWS */

    .view {
      display: none;
    }
    .view.active {
      display: block;
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <header class="sidebar-header">
        <div class="brand">
          <div class="brand-title">Multi-Store Hub</div>
          <div class="brand-sub">Sync · Ads · Ops</div>
        </div>
        <div class="beta-pill">Beta</div>
      </header>

      <div>
        <div class="sidebar-section-label">Main</div>
        <div class="nav-list">
          <button class="nav-item" data-view="home">
            <span>Home</span>
          </button>
          <button class="nav-item" data-view="stores">
            <span>My Stores</span>
          </button>
        </div>
      </div>

      <div>
        <div class="sidebar-section-label">Marketing</div>
        <div class="nav-list">
          <button class="nav-item" data-view="ads-overview">
            <span>Ads Overview</span>
            <small>Coming soon</small>
          </button>
          <button class="nav-item" data-view="tiktok">
            <span>TikTok Ads</span>
          </button>
          <button class="nav-item" data-view="meta">
            <span>Meta Ads</span>
          </button>
          <button class="nav-item" data-view="google">
            <span>Google Ads</span>
          </button>
        </div>
      </div>

      <div>
        <div class="sidebar-section-label">Ops</div>
        <div class="nav-list">
          <button class="nav-item" data-view="orders">
            <span>Orders</span>
          </button>
          <button class="nav-item" data-view="shipping">
            <span>Shipping</span>
          </button>
          <button class="nav-item" data-view="inventory">
            <span>Inventory</span>
          </button>
        </div>
      </div>

      <div>
        <div class="sidebar-section-label">Support</div>
        <div class="nav-list">
          <button class="nav-item" data-view="helpdesk">
            <span>Helpdesk</span>
          </button>
          <button class="nav-item" data-view="settings">
            <span>Settings</span>
          </button>
        </div>
      </div>

      <footer class="sidebar-footer">
        <div class="sidebar-footer-label">Store context</div>
        <select id="store-context-select" class="context-select">
          <option value="all">All stores</option>
        </select>
        <p class="sidebar-footer-hint">
          Orice view (Home, My Stores, Ads etc.) va afișa date doar pentru magazinul ales aici.
        </p>
        <div class="sidebar-footer-env">
          <span>Env: Railway</span>
          <span id="store-context-live">All stores</span>
        </div>
      </footer>
    </aside>

    <!-- MAIN CONTENT -->
    <main class="main">
      <div class="main-inner">
        <header class="top-line">
          <div class="top-title-block">
            <div class="eyebrow">Operational overview</div>
            <h1 class="page-title" id="page-title">Home</h1>
            <p class="page-subtitle" id="page-subtitle">
              Acum vezi date pentru <strong>toate magazinele</strong>.
            </p>
          </div>
          <div class="context-pill">
            <span>Context</span>
            <span id="context-label">All stores</span>
          </div>
        </header>

        <!-- HOME VIEW -->
        <section id="view-home" class="view active">
          <section class="grid-top">
            <article class="stat-card">
              <div class="stat-label">Produse active</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-active-home">–</div>
                <div class="stat-chip">Catalog</div>
              </div>
              <p class="stat-desc">
                Total produse active în Shopify (conform Stores + API).
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Produse draft</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-draft-home">–</div>
                <div class="stat-chip">Pregătite</div>
              </div>
              <p class="stat-desc">
                Produse pregătite pentru listare în magazine.
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi azi</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-today-home">–</div>
                <div class="stat-chip">Azi</div>
              </div>
              <p class="stat-desc">
                Comenzi înregistrate în ultimele 24h pentru contextul curent.
              </p>
            </article>
            <article class="stat-card">
              <div class="stat-label">Comenzi în acest an</div>
              <div class="stat-main">
                <div class="stat-value" id="stat-year-home">–</div>
                <div class="stat-chip">YTD</div>
              </div>
              <p class="stat-desc">
                Total comenzi cumulate în anul curent (context curent).
              </p>
            </article>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Stores snapshot</div>
                <p class="panel-subtitle">
                  Detalii rapide pentru fiecare magazin din context.
                </p>
              </div>
              <div class="badge-soft" id="stores-count-home">0 stores</div>
            </div>

            <div id="home-table-wrapper" class="table-wrapper">
              <div class="empty-state" id="home-empty">
                <strong>Nu sunt magazine încărcate.</strong>
                Adaugă magazine în foaia <code>Stores</code> și verifică endpoint-ul
                <code>/stores</code>.
              </div>
            </div>
          </section>
        </section>

        <!-- MY STORES VIEW -->
        <section id="view-stores" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">General overview</div>
                <p class="panel-subtitle">
                  Sumare pentru toate magazinele conectate (în context).
                </p>
              </div>
              <div class="badge-soft" id="stores-count-mystores">0 stores</div>
            </div>

            <div id="exec-store-header" class="exec-store-header"></div>

            <div id="mystores-grid-wrapper">
              <div class="empty-state" id="mystores-empty">
                <strong>Nu sunt magazine încărcate.</strong>
                Adaugă magazine în foaia <code>Stores</code>.
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Shopify Multi-Store Sync</div>
                <p class="panel-subtitle">
                  Funcționalitatea de sincronizare Shopify existentă, reutilizată aici (fără iframe).
                </p>
              </div>
              <div class="badge-soft" id="sync-context-label">
                Context: toate magazinele
              </div>
            </div>
            <div>
              <p class="muted">
                De aici vei putea rula verificări și sincronizări pentru produse (create / update / delete)
                pe baza datelor din Google Sheets + Shopify.
              </p>
              <p class="muted">
                Momentan, consola completă este disponibilă într-o pagină dedicată.
                Poți deschide consola veche într-un tab nou; ulterior o putem integra nativ aici.
              </p>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                <a href="/shopify" target="_blank" rel="noopener" class="btn btn-primary">
                  Deschide consola de sincronizare
                </a>
                <button class="btn" type="button" disabled>
                  Preview & sync direct aici (coming soon)
                </button>
              </div>
            </div>
          </section>
        </section>

        <!-- PLACEHOLDER VIEWS pentru restul meniului (deocamdată) -->
        <section id="view-ads-overview" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Ads Overview</div>
                <p class="panel-subtitle">
                  Rezumat cross-channel (TikTok / Meta / Google) – în curând.
                </p>
              </div>
            </div>
            <div class="empty-state">
              <strong>Coming soon.</strong>
              Acest view va centraliza KPI de marketing din toate conturile conectate.
            </div>
          </section>
        </section>

        <section id="view-tiktok" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">TikTok Ads</div>
                <p class="panel-subtitle">
                  Modulul detaliat de TikTok Ads trăiește în prezent pe ruta <code>/marketing</code>.
                </p>
              </div>
            </div>
            <div class="empty-state">
              <strong>Redirect manual pentru moment.</strong>
              <a href="/marketing" target="_blank" rel="noopener" style="color:#93c5fd;text-decoration:none;">
                Deschide pagina de TikTok Ads
              </a>
            </div>
          </section>
        </section>

        <!-- celelalte view-uri (meta, google, orders etc.) pot fi umplute ulterior -->
        <section id="view-meta" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Meta Ads</div>
                <p class="panel-subtitle">Integrare viitoare cu Meta Ads Manager.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-google" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Google Ads</div>
                <p class="panel-subtitle">Integrare viitoare cu Google Ads.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-orders" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Orders</div>
                <p class="panel-subtitle">Overview comenzi – modul viitor.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-shipping" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Shipping</div>
                <p class="panel-subtitle">Integrare viitoare cu curieri.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-inventory" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Inventory</div>
                <p class="panel-subtitle">Stocuri cross-store – modul viitor.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-helpdesk" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Helpdesk</div>
                <p class="panel-subtitle">Centralizare tichete suport – în curând.</p>
              </div>
            </div>
            <div class="empty-state"><strong>Coming soon.</strong></div>
          </section>
        </section>

        <section id="view-settings" class="view">
          <section class="panel">
            <div class="panel-header">
              <div class="panel-title-block">
                <div class="panel-title">Settings</div>
                <p class="panel-subtitle">Configurări generale pentru hub.</p>
              </div>
            </div>
            <div class="empty-state">
              <strong>Settings framework.</strong>
              Aici vom adăuga editor pentru variabile (inclusiv ENV mirror), parole etc.
            </div>
          </section>
        </section>

      </div>
    </main>
  </div>

  <script>
    (function () {
      const params = new URLSearchParams(window.location.search);
      let currentView = params.get('view') || 'home';
      let selectedStoreId = params.get('store_id') || 'all';

      const contextLabelEl = document.getElementById('context-label');
      const pageTitleEl = document.getElementById('page-title');
      const pageSubtitleEl = document.getElementById('page-subtitle');
      const storeContextSelect = document.getElementById('store-context-select');
      const storeContextLive = document.getElementById('store-context-live');

      const navItems = document.querySelectorAll('.nav-item');
      const views = document.querySelectorAll('.view');

      const statActiveHome = document.getElementById('stat-active-home');
      const statDraftHome = document.getElementById('stat-draft-home');
      const statTodayHome = document.getElementById('stat-today-home');
      const statYearHome = document.getElementById('stat-year-home');
      const storesCountHome = document.getElementById('stores-count-home');
      const homeTableWrapper = document.getElementById('home-table-wrapper');
      const homeEmpty = document.getElementById('home-empty');

      const storesCountMy = document.getElementById('stores-count-mystores');
      const myGridWrapper = document.getElementById('mystores-grid-wrapper');
      const myEmpty = document.getElementById('mystores-empty');
      const execHeader = document.getElementById('exec-store-header');
      const syncContextLabel = document.getElementById('sync-context-label');

      function formatNumber(n) {
        if (n == null || isNaN(n)) return '–';
        return n.toLocaleString('ro-RO');
      }

      function setView(view) {
        currentView = view;
        views.forEach((v) => v.classList.remove('active'));
        const activeView = document.getElementById('view-' + view);
        if (activeView) activeView.classList.add('active');

        navItems.forEach((n) =>
          n.classList.toggle('active', n.getAttribute('data-view') === view)
        );

        if (view === 'home') {
          pageTitleEl.textContent = 'Home';
        } else if (view === 'stores') {
          pageTitleEl.textContent = 'My Stores';
        } else if (view === 'tiktok') {
          pageTitleEl.textContent = 'TikTok Ads';
        } else {
          pageTitleEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);
        }

        const label =
          selectedStoreId === 'all' ? 'toate magazinele' : 'store-ul selectat';
        pageSubtitleEl.innerHTML =
          'Acum vezi date pentru <strong>' + label + '</strong>.';

        const contextText =
          selectedStoreId === 'all' ? 'All stores' : selectedStoreId;
        contextLabelEl.textContent = contextText;
        storeContextLive.textContent = contextText;

        params.set('view', view);
        params.set('store_id', selectedStoreId);
        const newUrl =
          window.location.pathname + '?' + params.toString() + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }

      navItems.forEach((btn) => {
        btn.addEventListener('click', () => {
          const v = btn.getAttribute('data-view');
          setView(v);
        });
      });

      function buildHomeTable(stores) {
        if (!stores.length) {
          homeEmpty.style.display = 'block';
          homeTableWrapper.innerHTML = '';
          homeTableWrapper.appendChild(homeEmpty);
          return;
        }
        homeEmpty.style.display = 'none';

        const rowsHtml = stores
          .map((s) => {
            return (
              '<tr>' +
                '<td class="store-name-cell">' +
                  (s.store_name || s.store_id || 'Store') +
                '</td>' +
                '<td class="numeric">' + formatNumber(s.active_products) + '</td>' +
                '<td class="numeric">' + formatNumber(s.draft_products) + '</td>' +
                '<td class="numeric">' + formatNumber(s.today_orders) + '</td>' +
                '<td class="numeric">' + formatNumber(s.week_orders) + '</td>' +
                '<td class="numeric">' + formatNumber(s.month_orders) + '</td>' +
                '<td class="numeric">' + formatNumber(s.year_orders) + '</td>' +
              '</tr>'
            );
          })
          .join('');

        const tableHtml =
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Store</th>' +
                '<th class="numeric">Active</th>' +
                '<th class="numeric">Draft</th>' +
                '<th class="numeric">Azi</th>' +
                '<th class="numeric">Săpt.</th>' +
                '<th class="numeric">Lună</th>' +
                '<th class="numeric">An</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>';

        homeTableWrapper.innerHTML = tableHtml;
      }

      function renderExecHeader(store) {
        if (!store) {
          execHeader.style.display = 'none';
          execHeader.innerHTML = '';
          return;
        }
        execHeader.style.display = 'flex';
        execHeader.innerHTML =
          '<div class="exec-left">' +
            '<h2>' + (store.store_name || store.store_id || 'Store') + '</h2>' +
            '<p>Shopify: ' + (store.shopify_domain || '—') + '</p>' +
          '</div>' +
          '<div class="exec-right">' +
            '<div class="exec-kpi">' +
              '<div class="exec-kpi-label">Active</div>' +
              '<div class="exec-kpi-value">' + formatNumber(store.active_products) + '</div>' +
            '</div>' +
            '<div class="exec-kpi">' +
              '<div class="exec-kpi-label">Draft</div>' +
              '<div class="exec-kpi-value">' + formatNumber(store.draft_products) + '</div>' +
            '</div>' +
            '<div class="exec-kpi">' +
              '<div class="exec-kpi-label">Comenzi azi</div>' +
              '<div class="exec-kpi-value">' + formatNumber(store.today_orders) + '</div>' +
            '</div>' +
          '</div>';
      }

            function renderMyStoresCards(stores) {
        if (!stores.length) {
          myEmpty.style.display = 'block';
          myGridWrapper.innerHTML = '';
          myGridWrapper.appendChild(myEmpty);
          renderExecHeader(null);
          return;
        }

        myEmpty.style.display = 'none';

        // Dacă avem UN singur magazin în context:
        // - afișăm DOAR header-ul executiv
        // - sub el lăsăm un placeholder pentru viitoare acțiuni
        if (stores.length === 1) {
          const store = stores[0];
          renderExecHeader(store);

          myGridWrapper.innerHTML = '';
          const info = document.createElement('div');
          info.className = 'muted';
          info.style.marginTop = '8px';
          info.textContent =
            'Aici vei putea adăuga acțiuni rapide pentru acest magazin (de ex. verificare produse, sync, marketing etc.).';
          myGridWrapper.appendChild(info);
          return;
        }

        // Mai multe magazine -> nu mai arătăm header-ul executiv, ci doar cardurile
        renderExecHeader(null);

        const grid = document.createElement('div');
        grid.className = 'stores-grid';

        stores.forEach((s) => {
          const card = document.createElement('article');
          card.className = 'store-card';
          card.innerHTML =
            '<div class="store-card-header">' +
              '<div>' +
                '<div class="store-name">' + (s.store_name || s.store_id || 'Store') + '</div>' +
                '<div class="store-domain">' + (s.shopify_domain || '—') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="store-stats-row">' +
              '<div class="stat-chip-store">' +
                '<div class="stat-chip-label">Active</div>' +
                '<div class="stat-chip-value">' + formatNumber(s.active_products) + '</div>' +
              '</div>' +
              '<div class="stat-chip-store">' +
                '<div class="stat-chip-label">Draft</div>' +
                '<div class="stat-chip-value">' + formatNumber(s.draft_products) + '</div>' +
              '</div>' +
              '<div class="stat-chip-store">' +
                '<div class="stat-chip-label">Comenzi azi</div>' +
                '<div class="stat-chip-value">' + formatNumber(s.today_orders) + '</div>' +
              '</div>' +
            '</div>';
          grid.appendChild(card);
        });

        myGridWrapper.innerHTML = '';
        myGridWrapper.appendChild(grid);
      }

            async function loadStores() {
        try {
          const res = await fetch('/stores');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const allStores = Array.isArray(data) ? data : [];

          // --- REBUILD dropdown-ul de context, fără să duplicăm opțiunile ---
          storeContextSelect.innerHTML = '';
          const optAll = document.createElement('option');
          optAll.value = 'all';
          optAll.textContent = 'All stores';
          storeContextSelect.appendChild(optAll);

          allStores.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s.store_id;
            opt.textContent = s.store_name || s.store_id;
            storeContextSelect.appendChild(opt);
          });

          // dacă store-ul selectat nu mai există, revenim la "all"
          if (
            !selectedStoreId ||
            (selectedStoreId !== 'all' &&
              !allStores.some(
                (s) => String(s.store_id) === String(selectedStoreId)
              ))
          ) {
            selectedStoreId = 'all';
          }

          storeContextSelect.value = selectedStoreId;

          let visibleStores = allStores;
          let contextText = 'All stores';
          if (selectedStoreId !== 'all') {
            visibleStores = allStores.filter(
              (s) => String(s.store_id) === String(selectedStoreId)
            );
            if (visibleStores.length) {
              contextText = visibleStores[0].store_name || selectedStoreId;
            } else {
              contextText = selectedStoreId;
            }
          }

          contextLabelEl.textContent = contextText;
          storeContextLive.textContent = contextText;
          syncContextLabel.textContent =
            'Context: ' +
            (selectedStoreId === 'all'
              ? 'toate magazinele'
              : 'magazin ' + contextText);

          // sort by name
          visibleStores.sort((a, b) => {
            const na = (a.store_name || a.store_id || '').toLowerCase();
            const nb = (b.store_name || b.store_id || '').toLowerCase();
            return na.localeCompare(nb);
          });

          // totals for home
          const totals = visibleStores.reduce(
            (acc, s) => {
              acc.active += s.active_products || 0;
              acc.draft += s.draft_products || 0;
              acc.today += s.today_orders || 0;
              acc.year += s.year_orders || 0;
              return acc;
            },
            { active: 0, draft: 0, today: 0, year: 0 }
          );

          statActiveHome.textContent = formatNumber(totals.active);
          statDraftHome.textContent = formatNumber(totals.draft);
          statTodayHome.textContent = formatNumber(totals.today);
          statYearHome.textContent = formatNumber(totals.year);

          storesCountHome.textContent =
            visibleStores.length + (visibleStores.length === 1 ? ' store' : ' stores');
          storesCountMy.textContent = storesCountHome.textContent;

          buildHomeTable(visibleStores);
          renderMyStoresCards(visibleStores);
        } catch (err) {
          console.error('Error /stores', err);
          homeEmpty.style.display = 'block';
          homeEmpty.innerHTML =
            '<strong>Eroare la încărcarea magazinelor.</strong><br />' +
            (err.message || String(err));
          myEmpty.style.display = 'block';
        }
      }

      // change context
      storeContextSelect.addEventListener('change', () => {
        selectedStoreId = storeContextSelect.value || 'all';
        loadStores();
        setView(currentView);
      });

      // init
      setView(currentView);
      loadStores();
    })();
  </script>
</body>
</html>
  `;
}

module.exports = dashboardPage;