// ui/dashboardPage.js
//
// Shell principal pentru platformă: meniu lateral + pagini interne (Home, My Stores, Ads etc.)

function dashboardPage() {
  const uiPassword = process.env.DASHBOARD_PASSWORD || "";

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Control Panel – Multi-Store</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #020617;
      --bg-soft: #030712;
      --panel: rgba(15,23,42,0.98);
      --panel-soft: rgba(15,23,42,0.92);
      --accent: #4f46e5;
      --accent-soft: rgba(79,70,229,0.18);
      --accent-strong: rgba(79,70,229,0.4);
      --border-soft: rgba(148,163,184,0.28);
      --border-subtle: rgba(148,163,184,0.12);
      --text: #e5e7eb;
      --muted: #9ca3af;
      --danger: #f97373;
      --success: #22c55e;
      --shadow-soft: 0 20px 60px rgba(15,23,42,0.9);
      --radius-lg: 18px;
      --radius-md: 12px;
      --radius-sm: 999px;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: radial-gradient(circle at 0% 0%, rgba(129,140,248,0.13), transparent 55%),
                  radial-gradient(circle at 100% 0%, rgba(56,189,248,0.12), transparent 55%),
                  linear-gradient(180deg,#020617,#020617 40%,#020617);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    body {
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 20px;
    }

    .app-frame {
      position: relative;
      width: 100%;
      max-width: 1340px;
      height: calc(100vh - 40px);
      border-radius: 26px;
      overflow: hidden;
      background: radial-gradient(circle at top left, rgba(79,70,229,0.25), transparent 55%),
                  radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 55%),
                  linear-gradient(135deg,#020617,#020617 40%,#020617);
      border: 1px solid rgba(148,163,184,0.35);
      box-shadow: var(--shadow-soft);
      display: flex;
    }

    .app-frame.blurred-main .app-main {
      filter: blur(2px) saturate(0.7);
      pointer-events: none;
      user-select: none;
    }

    .sidebar {
      position: relative;
      width: 260px;
      background: linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,0.97));
      border-right: 1px solid var(--border-soft);
      padding: 18px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      z-index: 20;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .sidebar-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar-eyebrow {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--muted);
    }

    .sidebar-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .sidebar-badge {
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(251,191,36,0.25);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #facc15;
      background: radial-gradient(circle at 0 0, rgba(251,191,36,0.18), transparent 60%);
    }

    .sidebar-nav {
      margin-top: 2px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-section-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
      margin: 4px 0 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 9px;
      border-radius: 10px;
      border: 1px solid transparent;
      cursor: pointer;
      font-size: 13px;
      color: #e5e7eb;
      background: transparent;
      transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
    }

    .nav-item span.icon {
      width: 18px;
      text-align: center;
      font-size: 14px;
      opacity: 0.9;
    }

    .nav-item span.label {
      flex: 1;
      text-align: left;
    }

    .nav-item small {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .nav-item:hover {
      background: rgba(15,23,42,0.96);
      border-color: var(--border-subtle);
      transform: translateY(-1px);
    }

    .nav-item.active {
      border-color: var(--accent-strong);
      background: radial-gradient(circle at 0 0, rgba(79,70,229,0.35), transparent 60%);
      box-shadow: 0 0 0 1px rgba(79,70,229,0.45), 0 12px 40px rgba(15,23,42,0.9);
    }

    .nav-item-sub {
      margin-left: 26px;
      padding-left: 6px;
      border-left: 1px dashed rgba(148,163,184,0.3);
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
    }

    .store-filter-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      margin-bottom: 3px;
    }

    .store-filter-select {
      width: 100%;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      padding: 6px 8px;
      background: rgba(15,23,42,0.96);
      color: var(--text);
      font-size: 12px;
    }

    .store-filter-note {
      font-size: 11px;
      color: var(--muted);
      line-height: 1.4;
    }

    .sidebar-footer-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 10px;
      color: var(--muted);
    }

    .sidebar-footer-meta span.key {
      padding: 3px 7px;
      border-radius: 999px;
      border: 1px dashed var(--border-subtle);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 10px;
    }

    .app-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 14px 18px 16px;
      position: relative;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .burger-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.45);
      background: rgba(15,23,42,0.92);
      cursor: pointer;
      margin-right: 8px;
      transition: background 0.16s ease, transform 0.12s ease, box-shadow 0.12s ease;
    }

    .burger-btn span {
      display: block;
      width: 14px;
      height: 2px;
      border-radius: 999px;
      background: #e5e7eb;
      position: relative;
    }

    .burger-btn span::before,
    .burger-btn span::after {
      content: "";
      position: absolute;
      left: 0;
      width: 14px;
      height: 2px;
      border-radius: 999px;
      background: #e5e7eb;
      transform-origin: center;
    }

    .burger-btn span::before {
      top: -4px;
    }

    .burger-btn span::after {
      top: 4px;
    }

    .burger-btn:hover {
      background: rgba(30,64,175,0.95);
      box-shadow: 0 0 0 1px rgba(129,140,248,0.5), 0 10px 30px rgba(15,23,42,0.9);
      transform: translateY(-1px);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .topbar-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .topbar-eyebrow {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--muted);
    }

    .topbar-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .topbar-subtitle {
      font-size: 11px;
      color: var(--muted);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--muted);
    }

    .pill {
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.3);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    .pill-accent {
      border-color: rgba(79,70,229,0.5);
      background: radial-gradient(circle at 0 0, rgba(79,70,229,0.35), transparent 65%);
      color: #e0e7ff;
    }

    .pill-soft {
      background: rgba(15,23,42,0.92);
    }

    .view-root {
      flex: 1;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
      background: radial-gradient(circle at top left, rgba(79,70,229,0.18), transparent 60%),
                  radial-gradient(circle at bottom right, rgba(56,189,248,0.1), transparent 60%),
                  linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.98));
      padding: 14px 14px 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .view-scroll {
      flex: 1;
      overflow: auto;
      padding-right: 4px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }

    .kpi-card {
      border-radius: 14px;
      padding: 10px 10px 9px;
      background: radial-gradient(circle at 0 0, rgba(15,23,42,0.9), transparent 65%),
                  linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98));
      border: 1px solid rgba(148,163,184,0.35);
      box-shadow: 0 10px 32px rgba(15,23,42,0.85);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .kpi-value {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
    }

    .kpi-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .kpi-tag {
      margin-left: auto;
      padding: 3px 6px;
      border-radius: 999px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      border: 1px solid rgba(52,211,153,0.4);
      color: #6ee7b7;
      background: rgba(6,78,59,0.35);
    }

    .kpi-tag-soft {
      border-color: rgba(148,163,184,0.35);
      color: var(--muted);
      background: rgba(15,23,42,0.85);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .section-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .section-subtitle {
      font-size: 11px;
      color: var(--muted);
    }

    .store-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      color: #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(15,23,42,0.98);
    }

    .store-table thead {
      background: linear-gradient(90deg,rgba(15,23,42,0.98),rgba(17,24,39,0.98));
    }

    .store-table th,
    .store-table td {
      padding: 7px 9px;
      border-bottom: 1px solid rgba(148,163,184,0.18);
      text-align: left;
      white-space: nowrap;
    }

    .store-table th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .store-table tbody tr:nth-child(even) {
      background: rgba(15,23,42,0.96);
    }

    .store-table tbody tr:hover {
      background: rgba(30,64,175,0.55);
    }

    .tag-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.35);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .view-empty {
      padding: 16px;
      border-radius: 14px;
      border: 1px dashed rgba(148,163,184,0.45);
      background: rgba(15,23,42,0.92);
      font-size: 12px;
      color: var(--muted);
    }

    .iframe-shell {
      margin-top: 10px;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(15,23,42,0.98);
      box-shadow: 0 14px 40px rgba(15,23,42,0.95);
    }

    .iframe-shell-header {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(148,163,184,0.25);
      font-size: 11px;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .iframe-shell-header strong {
      color: #e5e7eb;
      font-weight: 500;
    }

    .iframe-shell iframe {
      width: 100%;
      height: 340px;
      border: none;
      background: #020617;
    }

    .badge-store-context {
      font-size: 11px;
      color: var(--muted);
    }

    .badge-store-context strong {
      color: #e5e7eb;
      font-weight: 500;
    }

    /* Password gate */

    .pw-gate-backdrop {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 0 0, rgba(17,24,39,0.94), transparent 65%),
                  radial-gradient(circle at 100% 0, rgba(15,23,42,0.96), transparent 65%),
                  rgba(15,23,42,0.98);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }

    .pw-gate-card {
      width: 320px;
      max-width: 90vw;
      border-radius: 20px;
      border: 1px solid rgba(148,163,184,0.55);
      background: radial-gradient(circle at 0 0, rgba(79,70,229,0.3), transparent 60%),
                  radial-gradient(circle at 100% 100%, rgba(56,189,248,0.2), transparent 60%),
                  rgba(15,23,42,0.98);
      box-shadow: 0 22px 70px rgba(15,23,42,0.95);
      padding: 18px 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .pw-gate-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .pw-gate-sub {
      font-size: 12px;
      color: var(--muted);
    }

    .pw-input {
      width: 100%;
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,0.6);
      background: rgba(15,23,42,0.96);
      color: var(--text);
      padding: 8px 10px;
      font-size: 13px;
      margin-top: 4px;
    }

    .pw-btn {
      margin-top: 10px;
      width: 100%;
      border-radius: 999px;
      border: 1px solid rgba(79,70,229,0.8);
      background: radial-gradient(circle at 0 0, rgba(79,70,229,0.5), transparent 65%);
      color: #e0e7ff;
      padding: 7px 10px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 14px 40px rgba(15,23,42,0.95);
      transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
    }

    .pw-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.04);
      box-shadow: 0 18px 50px rgba(15,23,42,0.98);
    }

    .pw-error {
      margin-top: 6px;
      font-size: 11px;
      color: #fecaca;
    }

    .hidden {
      display: none !important;
    }

    /* Simple responsive: for small widths collapse sidebar visually (burger only) */

    @media (max-width: 980px) {
      .sidebar {
        position: absolute;
        inset: 0 auto 0 0;
        transform: translateX(-100%);
        transition: transform 0.2s ease-out;
      }
      .sidebar.open {
        transform: translateX(0);
      }
    }
  </style>
</head>
<body>
  <div class="app-frame" id="app-frame">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title-wrap">
          <div class="sidebar-eyebrow">Control Center</div>
          <div class="sidebar-title">Multi-Store Hub</div>
        </div>
        <div class="sidebar-badge">BETA</div>
      </div>

      <nav class="sidebar-nav" id="sidebar-nav">
        <div class="nav-section-label">Main</div>
        <button class="nav-item active" data-view="home">
          <span class="icon">🏠</span>
          <span class="label">Home</span>
        </button>
        <button class="nav-item" data-view="my-stores">
          <span class="icon">🛒</span>
          <span class="label">My Stores</span>
        </button>

        <div class="nav-section-label">Marketing</div>
        <button class="nav-item" data-view="ads">
          <span class="icon">📊</span>
          <span class="label">Ads Overview</span>
          <small>coming soon</small>
        </button>
        <button class="nav-item nav-item-sub" data-view="ads-tiktok">
          <span class="icon">🎵</span>
          <span class="label">TikTok Ads</span>
        </button>
        <button class="nav-item nav-item-sub" data-view="ads-meta">
          <span class="icon">📘</span>
          <span class="label">Meta Ads</span>
        </button>
        <button class="nav-item nav-item-sub" data-view="ads-google">
          <span class="icon">🔍</span>
          <span class="label">Google Ads</span>
        </button>

        <div class="nav-section-label">Ops</div>
        <button class="nav-item" data-view="orders">
          <span class="icon">📦</span>
          <span class="label">Orders</span>
        </button>
        <button class="nav-item" data-view="shipping">
          <span class="icon">🚚</span>
          <span class="label">Shipping</span>
        </button>
        <button class="nav-item" data-view="inventory">
          <span class="icon">📦</span>
          <span class="label">Inventory</span>
        </button>

        <div class="nav-section-label">Support</div>
        <button class="nav-item" data-view="helpdesk">
          <span class="icon">💬</span>
          <span class="label">Helpdesk</span>
        </button>
        <button class="nav-item" data-view="settings">
          <span class="icon">⚙️</span>
          <span class="label">Settings</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div>
          <div class="store-filter-label">Store context</div>
          <select id="store-filter" class="store-filter-select">
            <option value="ALL">All stores</option>
          </select>
          <div class="store-filter-note">
            Orice view (Home, My Stores, Ads etc.) va afișa date doar pentru magazinul ales aici.
          </div>
        </div>
        <div class="sidebar-footer-meta">
          <span>Context live</span>
          <span class="key">⌘ + K</span>
        </div>
      </div>
    </aside>

    <main class="app-main" id="app-main">
      <header class="topbar">
        <div class="topbar-left">
          <button class="burger-btn" id="burger-btn" title="Deschide meniul">
            <span></span>
          </button>
          <div class="topbar-titles">
            <div class="topbar-eyebrow">Operational overview</div>
            <div class="topbar-title" id="topbar-title">Home</div>
            <div class="topbar-subtitle" id="store-context-label">
              Acum vezi date pentru <strong>toate magazinele</strong>.
            </div>
          </div>
        </div>
        <div class="topbar-right">
          <div class="pill pill-soft" id="time-pill">—</div>
          <div class="pill pill-accent">Live mode</div>
        </div>
      </header>

      <section class="view-root">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-title">General overview</div>
            <div class="section-subtitle" id="section-subtitle">
              Sumare pentru toate magazinele conectate.
            </div>
          </div>
          <div class="badge-store-context" id="badge-store-context">
            Context: <strong>All stores</strong>
          </div>
        </div>
        <div class="view-scroll" id="view-root">
          <!-- content dinamic -->
        </div>
      </section>
    </main>

    <div class="pw-gate-backdrop hidden" id="pw-gate">
      <div class="pw-gate-card">
        <div>
          <div class="pw-gate-title">Acces privat</div>
          <div class="pw-gate-sub">
            Introdu parola pentru a intra în tabloul de control intern.
          </div>
        </div>
        <div>
          <label for="pw-input" class="pw-gate-sub">Parolă</label>
          <input id="pw-input" type="password" class="pw-input" autocomplete="current-password" />
        </div>
        <button class="pw-btn" id="pw-submit">Intră în platformă</button>
        <div class="pw-error hidden" id="pw-error">Parolă greșită. Încearcă din nou.</div>
      </div>
    </div>
  </div>

  <script>
    window.__DASHBOARD_PASSWORD = ${JSON.stringify(uiPassword)};

    (function () {
      const state = {
        stores: [],
        selectedStoreId: 'ALL',
        currentView: 'home',
      };

      const appFrame = document.getElementById('app-frame');
      const sidebar = document.getElementById('sidebar');
      const burgerBtn = document.getElementById('burger-btn');
      const nav = document.getElementById('sidebar-nav');
      const storeFilter = document.getElementById('store-filter');
      const viewRoot = document.getElementById('view-root');
      const topbarTitle = document.getElementById('topbar-title');
      const storeContextLabel = document.getElementById('store-context-label');
      const badgeStoreContext = document.getElementById('badge-store-context');
      const sectionSubtitle = document.getElementById('section-subtitle');
      const timePill = document.getElementById('time-pill');

      const pwGate = document.getElementById('pw-gate');
      const pwInput = document.getElementById('pw-input');
      const pwSubmit = document.getElementById('pw-submit');
      const pwError = document.getElementById('pw-error');
      const passwordFromServer = window.__DASHBOARD_PASSWORD || '';

      function fmtNumber(value) {
        if (value == null || isNaN(value)) return '—';
        return new Intl.NumberFormat('ro-RO').format(Number(value));
      }

      function computeAggregates(stores) {
        const agg = {
          storeCount: stores.length,
          active: 0,
          draft: 0,
          today: 0,
          week: 0,
          month: 0,
          year: 0,
        };
        stores.forEach((s) => {
          agg.active += Number(s.active_products || 0);
          agg.draft += Number(s.draft_products || 0);
          agg.today += Number(s.today_orders || 0);
          agg.week += Number(s.week_orders || 0);
          agg.month += Number(s.month_orders || 0);
          agg.year += Number(s.year_orders || 0);
        });
        return agg;
      }

      function getStoreLabel(id) {
        if (id === 'ALL') return 'toate magazinele';
        const store = state.stores.find((s) => s.store_id === id);
        if (!store) return id;
        return store.store_name || store.store_id;
      }

      function getStoresForContext() {
        if (state.selectedStoreId === 'ALL') return state.stores;
        return state.stores.filter((s) => s.store_id === state.selectedStoreId);
      }

      function updateContextLabels() {
        const label = getStoreLabel(state.selectedStoreId);
        storeContextLabel.innerHTML = 'Acum vezi date pentru <strong>' + label + '</strong>.';
        badgeStoreContext.innerHTML =
          'Context: <strong>' + (state.selectedStoreId === 'ALL' ? 'All stores' : label) + '</strong>';

        if (state.selectedStoreId === 'ALL') {
          sectionSubtitle.textContent = 'Sumare pentru toate magazinele conectate.';
        } else {
          sectionSubtitle.textContent = 'Sumare filtrată doar pentru magazinul selectat.';
        }
      }

      function renderHome() {
        const stores = getStoresForContext();
        if (!stores.length) {
          viewRoot.innerHTML =
            '<div class="view-empty">Nu sunt magazine încărcate. Verifică foaia <strong>Stores</strong> sau conexiunea către Shopify.</div>';
          return;
        }
        const agg = computeAggregates(stores);

        const kpiHtml = [
          {
            label: 'Produse active',
            value: fmtNumber(agg.active),
            sub: agg.storeCount + ' store' + (agg.storeCount === 1 ? '' : 's'),
            tag: 'catalog',
          },
          {
            label: 'Produse draft',
            value: fmtNumber(agg.draft),
            sub: 'pregătite pentru listare',
            tag: 'backlog',
          },
          {
            label: 'Comenzi azi',
            value: fmtNumber(agg.today),
            sub: 'vs. ' + fmtNumber(agg.week) + ' în săptămâna curentă',
            tag: 'azi',
          },
          {
            label: 'Comenzi în acest an',
            value: fmtNumber(agg.year),
            sub: fmtNumber(agg.month) + ' în luna curentă',
            tag: 'YTD',
          },
        ]
          .map(function (k) {
            return (
              '<div class="kpi-card">' +
                '<div class="kpi-label">' + k.label + '</div>' +
                '<div class="kpi-value">' + k.value + '</div>' +
                '<div class="kpi-sub">' + k.sub + '</div>' +
                '<div class="kpi-tag kpi-tag-soft">' + k.tag + '</div>' +
              '</div>'
            );
          })
          .join('');

        const rowsHtml = stores
          .map(function (s) {
            return (
              '<tr>' +
                '<td>' + (s.store_name || s.store_id) + '</td>' +
                '<td>' + (s.store_id || '') + '</td>' +
                '<td style="text-align:right;">' + fmtNumber(s.active_products) + '</td>' +
                '<td style="text-align:right;">' + fmtNumber(s.draft_products) + '</td>' +
                '<td style="text-align:right;">' + fmtNumber(s.today_orders) + '</td>' +
                '<td style="text-align:right;">' + fmtNumber(s.week_orders) + '</td>' +
                '<td style="text-align:right;">' + fmtNumber(s.month_orders) + '</td>' +
                '<td style="text-align:right;">' + fmtNumber(s.year_orders) + '</td>' +
              '</tr>'
            );
          })
          .join('');

        viewRoot.innerHTML =
          '<div class="kpi-grid">' +
            kpiHtml +
          '</div>' +
          '<div>' +
            '<div class="section-header" style="margin-top:4px;margin-bottom:6px;">' +
              '<div class="section-title-wrap">' +
                '<div class="section-title">Stores snapshot</div>' +
                '<div class="section-subtitle">Detalii rapide pentru fiecare magazin ' +
                  (state.selectedStoreId === 'ALL' ? '(toate)' : '(filtrate)') +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="store-table-wrap">' +
              '<table class="store-table">' +
                '<thead>' +
                  '<tr>' +
                    '<th>Store</th>' +
                    '<th>ID</th>' +
                    '<th>Active</th>' +
                    '<th>Draft</th>' +
                    '<th>Today</th>' +
                    '<th>This week</th>' +
                    '<th>This month</th>' +
                    '<th>This year</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  rowsHtml +
                '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>';
      }

      function renderMyStores() {
        const stores = getStoresForContext();
        if (!stores.length) {
          viewRoot.innerHTML =
            '<div class="view-empty">Nu sunt magazine încărcate. Adaugă magazine în foaia <strong>Stores</strong> și asigură-te că /stores răspunde corect.</div>';
          return;
        }
        const agg = computeAggregates(stores);

        const cardsHtml = stores
          .map(function (s) {
            return (
              '<div class="kpi-card">' +
                '<div class="kpi-label">' + (s.store_name || s.store_id) + '</div>' +
                '<div class="kpi-sub" style="margin-bottom:6px;">' +
                  (s.shopify_domain || '') +
                '</div>' +
                '<div style="display:flex;gap:8px;font-size:11px;">' +
                  '<div><span class="tag-pill">active</span> ' + fmtNumber(s.active_products) + '</div>' +
                  '<div><span class="tag-pill">draft</span> ' + fmtNumber(s.draft_products) + '</div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;margin-top:4px;font-size:11px;">' +
                  '<div><span class="tag-pill">azi</span> ' + fmtNumber(s.today_orders) + '</div>' +
                  '<div><span class="tag-pill">luna</span> ' + fmtNumber(s.month_orders) + '</div>' +
                '</div>' +
              '</div>'
            );
          })
          .join('');

        const storeContextLabel =
          state.selectedStoreId === 'ALL'
            ? 'Toate magazinele'
            : 'Doar magazinul: ' + getStoreLabel(state.selectedStoreId);

        const iframeStoreParam =
          state.selectedStoreId && state.selectedStoreId !== 'ALL'
            ? '?store_id=' + encodeURIComponent(state.selectedStoreId)
            : '';

        viewRoot.innerHTML =
          '<div class="kpi-grid">' +
            cardsHtml +
          '</div>' +
          '<div class="iframe-shell">' +
            '<div class="iframe-shell-header">' +
              '<div>' +
                '<strong>Product Sync Console</strong><br />' +
                '<span>Funcționalitatea clasică de sincronizare Shopify, reutilizată aici.</span>' +
              '</div>' +
              '<div class="badge-store-context">Context iframe: <strong>' + storeContextLabel + '</strong></div>' +
            '</div>' +
            '<iframe src="/shopify' + iframeStoreParam + '" loading="lazy"></iframe>' +
          '</div>';
      }

      function renderPlaceholder(title, description) {
        viewRoot.innerHTML =
          '<div class="view-empty">' +
            '<strong>' + title + '</strong><br />' +
            description +
          '</div>';
      }

      function renderCurrentView() {
        updateContextLabels();
        if (state.currentView === 'home') {
          renderHome();
        } else if (state.currentView === 'my-stores') {
          renderMyStores();
        } else if (state.currentView === 'ads') {
          renderPlaceholder(
            'Ads overview',
            'Aici vom agrega performanța campaniilor din TikTok / Meta / Google pentru magazinul selectat.'
          );
        } else if (state.currentView === 'ads-tiktok') {
          renderPlaceholder(
            'TikTok Ads',
            'Tablou de control pentru conturile și Business Center-ele TikTok Ads. Modul în lucru.'
          );
        } else if (state.currentView === 'ads-meta') {
          renderPlaceholder(
            'Meta Ads',
            'Tablou de control pentru Facebook / Instagram Ads. Modul în lucru.'
          );
        } else if (state.currentView === 'ads-google') {
          renderPlaceholder(
            'Google Ads',
            'Tablou de control pentru Google Ads. Modul în lucru.'
          );
        } else if (state.currentView === 'orders') {
          renderPlaceholder(
            'Orders',
            'Aici vei vedea comenzi cross-store filtrabile după magazinul selectat.'
          );
        } else if (state.currentView === 'shipping') {
          renderPlaceholder(
            'Shipping',
            'Integrare cu curieri (Fan, GLS, Sameday etc.) – modul pregătit, urmează integrarea.'
          );
        } else if (state.currentView === 'inventory') {
          renderPlaceholder(
            'Inventory',
            'Stocuri consolidate pe toate magazinele – modul în lucru.'
          );
        } else if (state.currentView === 'helpdesk') {
          renderPlaceholder(
            'Helpdesk',
            'Centralizare tichete și mesaje clienți din toate canalele – modul în lucru.'
          );
        } else if (state.currentView === 'settings') {
          renderPlaceholder(
            'Settings',
            'Aici vom expune variabilele critice (inclusiv cele de Railway) pentru a fi editate rapid.'
          );
        } else {
          renderPlaceholder('Unknown view', 'Nu există view pentru: ' + state.currentView);
        }
      }

      function setActiveNav(view) {
        const buttons = nav.querySelectorAll('.nav-item');
        buttons.forEach(function (btn) {
          if (btn.dataset.view === view) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      function handleNavClick(evt) {
        const btn = evt.target.closest('.nav-item');
        if (!btn) return;
        const view = btn.dataset.view;
        if (!view) return;
        state.currentView = view;
        setActiveNav(view);

        const titleMap = {
          'home': 'Home',
          'my-stores': 'My Stores',
          'ads': 'Ads Overview',
          'ads-tiktok': 'TikTok Ads',
          'ads-meta': 'Meta Ads',
          'ads-google': 'Google Ads',
          'orders': 'Orders',
          'shipping': 'Shipping',
          'inventory': 'Inventory',
          'helpdesk': 'Helpdesk',
          'settings': 'Settings',
        };
        topbarTitle.textContent = titleMap[view] || 'Dashboard';
        renderCurrentView();
      }

      function handleStoreFilterChange() {
        const value = storeFilter.value || 'ALL';
        state.selectedStoreId = value;
        localStorage.setItem('dashboard_selected_store', value);
        renderCurrentView();
      }

      function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
          sidebar.classList.remove('open');
          appFrame.classList.remove('blurred-main');
        } else {
          sidebar.classList.add('open');
          appFrame.classList.add('blurred-main');
        }
      }

      function updateTime() {
        try {
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('ro-RO', {
            hour: '2-digit',
            minute: '2-digit',
          });
          timePill.textContent = formatter.format(now);
        } catch (e) {
          timePill.textContent = 'live';
        }
      }

      async function loadStores() {
        try {
          const res = await fetch('/api/stores');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          state.stores = Array.isArray(data) ? data : [];

          while (storeFilter.options.length > 1) {
            storeFilter.remove(1);
          }
          state.stores.forEach(function (s) {
            const opt = document.createElement('option');
            opt.value = s.store_id;
            opt.textContent = s.store_name || s.store_id;
            storeFilter.appendChild(opt);
          });

          const saved = localStorage.getItem('dashboard_selected_store');
          if (saved && (saved === 'ALL' || state.stores.some(function (s) { return s.store_id === saved; }))) {
            state.selectedStoreId = saved;
            storeFilter.value = saved;
          } else {
            state.selectedStoreId = 'ALL';
            storeFilter.value = 'ALL';
          }

          renderCurrentView();
        } catch (err) {
          console.error('Eroare loadStores', err);
          viewRoot.innerHTML =
            '<div class="view-empty">Nu am putut încărca /api/stores (' +
            (err.message || err) +
            ').</div>';
        }
      }

      function initPasswordGate() {
        const key = 'dashboard_pw_ok';
        if (!passwordFromServer) {
          pwGate.classList.add('hidden');
          return;
        }
        if (localStorage.getItem(key) === '1') {
          pwGate.classList.add('hidden');
          return;
        }
        pwGate.classList.remove('hidden');

        function tryLogin() {
          const val = (pwInput.value || '').trim();
          if (val && val === passwordFromServer) {
            localStorage.setItem(key, '1');
            pwError.classList.add('hidden');
            pwGate.classList.add('hidden');
          } else {
            pwError.classList.remove('hidden');
          }
        }

        pwSubmit.addEventListener('click', tryLogin);
        pwInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            tryLogin();
          }
        });
      }

      burgerBtn.addEventListener('click', toggleSidebar);
      nav.addEventListener('click', handleNavClick);
      storeFilter.addEventListener('change', handleStoreFilterChange);

      updateTime();
      setInterval(updateTime, 1000 * 60);

      initPasswordGate();
      loadStores();
    })();
  </script>
</body>
</html>
  `;
}

module.exports = dashboardPage;