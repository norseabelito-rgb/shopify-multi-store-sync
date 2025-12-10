// ui/dashboardPage.js
//
// Shell principal pentru platformă: burger + meniu lateral + module încărcate în iframe.
// Modulul Shopify este la /shopify și îl încărcăm ca „My Stores”.
// TikTok Ads, Meta Ads etc sunt doar placeholder deocamdată.

function dashboardPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Control Panel – Multi-Store</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --bg: #05060c;
      --bg-elevated: #0b0f1a;
      --panel: #0f172a;
      --border: rgba(148, 163, 184, 0.35);
      --border-soft: rgba(148, 163, 184, 0.18);
      --text: #e5e7eb;
      --muted: #9ca3af;
      --accent: #60a5fa;
      --accent-soft: rgba(96, 165, 250, 0.18);
      --danger: #f97373;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(1200px at 0% 0%, rgba(96, 165, 250, 0.18), transparent 55%),
        radial-gradient(900px at 100% 0%, rgba(45, 212, 191, 0.18), transparent 50%),
        #020617;
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    body.app-loaded {
      opacity: 1;
      transition: opacity 0.2s ease-out;
    }

    body {
      opacity: 0;
    }

    .app-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* SIDEBAR + OVERLAY */

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: 260px;
      background: linear-gradient(180deg, rgba(15,23,42,0.98), rgba(15,23,42,0.97));
      border-right: 1px solid var(--border-soft);
      padding: 18px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transform: translateX(-100%);
      transition: transform 0.22s ease-out;
      z-index: 40;
    }

    .sidebar.open {
      transform: translateX(0);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(148,163,184,0.28);
    }

    .app-logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .app-logo-mark {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: radial-gradient(circle at 30% 0%, #a855f7, transparent 55%),
                  radial-gradient(circle at 70% 100%, #38bdf8, transparent 55%),
                  #020617;
      border: 1px solid rgba(148, 163, 184, 0.4);
      box-shadow: 0 0 0 1px rgba(15,23,42,0.9), 0 10px 30px rgba(15,23,42,0.9);
    }

    .app-logo-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .app-logo-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .app-logo-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .sidebar-close {
      background: transparent;
      border: 0;
      color: var(--muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 999px;
      font-size: 18px;
      line-height: 1;
    }

    .sidebar-close:hover {
      background: rgba(148, 163, 184, 0.1);
      color: var(--text);
    }

    .sidebar-section {
      margin-top: 8px;
    }

    .sidebar-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.13em;
      color: var(--muted);
      margin-bottom: 6px;
      padding: 0 4px;
    }

    .sidebar-menu {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .sidebar-item {
      border-radius: 10px;
      overflow: hidden;
    }

    .sidebar-link {
      border: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 7px 9px;
      cursor: pointer;
      color: var(--muted);
      font-size: 13px;
      border-radius: 10px;
      transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }

    .sidebar-link-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sidebar-link-icon {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: rgba(15,23,42,0.8);
      border: 1px solid rgba(148,163,184,0.35);
    }

    .sidebar-link-label {
      white-space: nowrap;
    }

    .sidebar-link-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      background: rgba(15, 23, 42, 0.8);
      color: var(--muted);
    }

    .sidebar-link.active {
      background: linear-gradient(90deg, rgba(96,165,250,0.15), rgba(129,140,248,0.2));
      color: #e5edff;
      box-shadow: 0 0 0 1px rgba(96,165,250,0.35);
    }

    .sidebar-link.active .sidebar-link-icon {
      background: radial-gradient(circle at 30% 0%, rgba(94,234,212,0.7), transparent 55%),
                  rgba(15,23,42,0.95);
      border-color: rgba(96,165,250,0.7);
      color: #e5edff;
    }

    .sidebar-link:hover:not(.active) {
      background: rgba(15,23,42,0.9);
      color: var(--text);
    }

    .sidebar-submenu {
      list-style: none;
      margin: 4px 0 0 26px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar-submenu button {
      border-radius: 8px;
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 12px;
      padding: 4px 7px;
      text-align: left;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .sidebar-submenu button.active {
      background: rgba(96,165,250,0.15);
      color: #e5edff;
    }

    .sidebar-submenu button:hover:not(.active) {
      background: rgba(15,23,42,0.8);
      color: var(--text);
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px dashed rgba(148,163,184,0.3);
      font-size: 11px;
      color: var(--muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sidebar-footer span strong {
      color: #e5edff;
    }

    /* OVERLAY */

    .overlay {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 0% 0%, rgba(15,23,42,0.9), transparent 55%),
                  rgba(15,23,42,0.72);
      backdrop-filter: blur(8px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.22s ease-out;
      z-index: 30;
    }

    .overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    /* TOP BAR + MAIN */

    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
    }

    .topbar {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      backdrop-filter: blur(12px);
      background: linear-gradient(90deg, rgba(15,23,42,0.92), rgba(15,23,42,0.82));
      border-bottom: 1px solid rgba(148,163,184,0.25);
      position: relative;
      z-index: 10;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .burger-btn {
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.4);
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(15,23,42,0.95);
      cursor: pointer;
      color: #e5edff;
      font-size: 17px;
      box-shadow: 0 8px 18px rgba(15,23,42,0.7);
      transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }

    .burger-btn:hover {
      background: rgba(30,64,175,0.96);
      transform: translateY(-1px);
      box-shadow: 0 12px 22px rgba(15,23,42,0.9);
    }

    .topbar-title {
      font-size: 15px;
      font-weight: 500;
    }

    .topbar-sub {
      font-size: 12px;
      color: var(--muted);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--muted);
    }

    .pill {
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(15,23,42,0.8);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pill-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34,197,94,0.25);
    }

    .pill-label {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
      color: #bbf7d0;
    }

    .pill-secondary {
      color: #e5edff;
      font-weight: 500;
    }

    /* MAIN AREA */

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 16px 18px 18px;
      gap: 12px;
      min-height: 0;
    }

    .breadcrumbs {
      font-size: 11px;
      color: var(--muted);
    }

    .breadcrumbs span {
      opacity: 0.8;
    }

    .breadcrumbs .current {
      color: #e5edff;
      font-weight: 500;
    }

    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
    }

    .overview-card {
      border-radius: 12px;
      background: radial-gradient(circle at 0 0, rgba(148,163,184,0.16), transparent 55%),
                  rgba(15,23,42,0.92);
      border: 1px solid rgba(148,163,184,0.45);
      padding: 10px 11px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-height: 70px;
    }

    .overview-label {
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.13em;
    }

    .overview-primary {
      font-size: 20px;
      font-weight: 600;
    }

    .overview-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .module-container {
      flex: 1;
      min-height: 0;
      border-radius: 14px;
      border: 1px solid rgba(148,163,184,0.4);
      background: radial-gradient(circle at 100% 0, rgba(96,165,250,0.15), transparent 60%),
                  rgba(15,23,42,0.95);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .module-header {
      padding: 9px 12px;
      border-bottom: 1px solid rgba(148,163,184,0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }

    .module-header-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .module-title {
      font-size: 13px;
      font-weight: 500;
    }

    .module-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .module-tag {
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.35);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .module-body {
      flex: 1;
      min-height: 0;
      background: radial-gradient(circle at 0 0, rgba(56,189,248,0.18), transparent 55%),
                  radial-gradient(circle at 100% 100%, rgba(129,140,248,0.18), transparent 60%),
                  #020617;
    }

    .module-placeholder {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 10px;
      padding: 24px;
      color: var(--muted);
      font-size: 13px;
    }

    .module-placeholder strong {
      color: #e5edff;
    }

    .module-iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: transparent;
    }

    .hidden {
      display: none !important;
    }

    @media (min-width: 960px) {
      .sidebar {
        position: relative;
        transform: translateX(0);
      }
      .overlay {
        display: none;
      }
      .app-shell {
        padding-left: 0; /* nu mai împingem conținutul în dreapta */
      }
      .burger-btn {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .overview-cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <aside id="sidebar" class="sidebar">
      <div class="sidebar-header">
        <div class="app-logo">
          <div class="app-logo-mark"></div>
          <div class="app-logo-text">
            <div class="app-logo-title">Multi-Store Panel</div>
            <div class="app-logo-sub">Sync · Ads · Ops</div>
          </div>
        </div>
        <button class="sidebar-close" id="sidebar-close" aria-label="Închide meniul">&times;</button>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-label">Workspace</div>
        <ul class="sidebar-menu">
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="home">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">🏠</div>
                <span class="sidebar-link-label">Home</span>
              </div>
            </button>
          </li>
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="stores">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">🛒</div>
                <span class="sidebar-link-label">My Stores</span>
              </div>
              <span class="sidebar-link-badge">Shopify</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-label">Ads</div>
        <ul class="sidebar-menu">
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="ads">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">📊</div>
                <span class="sidebar-link-label">Ads</span>
              </div>
            </button>
            <ul class="sidebar-submenu">
              <li><button class="js-subnav" data-submodule="tiktok">TikTok Ads</button></li>
              <li><button class="js-subnav" data-submodule="meta">Meta Ads</button></li>
              <li><button class="js-subnav" data-submodule="google">Google Ads</button></li>
            </ul>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-label">Ops</div>
        <ul class="sidebar-menu">
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="orders">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">📦</div>
                <span class="sidebar-link-label">Orders</span>
              </div>
            </button>
          </li>
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="shipping">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">🚚</div>
                <span class="sidebar-link-label">Shipping</span>
              </div>
            </button>
          </li>
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="inventory">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">📊</div>
                <span class="sidebar-link-label">Inventory</span>
              </div>
            </button>
          </li>
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="helpdesk">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">💬</div>
                <span class="sidebar-link-label">Helpdesk</span>
              </div>
            </button>
          </li>
        </ul>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-label">System</div>
        <ul class="sidebar-menu">
          <li class="sidebar-item">
            <button class="sidebar-link js-nav" data-module="settings">
              <div class="sidebar-link-main">
                <div class="sidebar-link-icon">⚙️</div>
                <span class="sidebar-link-label">Settings</span>
              </div>
            </button>
          </li>
        </ul>
      </div>

            <div class="sidebar-footer">
        <div class="env-pill">Env: Railway</div>
        <div class="env-pill">
          <div style="font-size:11px;opacity:0.8;margin-bottom:3px;">Active store</div>
          <select
            id="active-store-select"
            style="
              width: 100%;
              background: transparent;
              border: none;
              color: #e5edff;
              font-size: 11px;
              outline: none;
              padding: 2px 0;
            "
          >
            <option value="ALL">All stores</option>
          </select>
        </div>
      </div>
    </aside>

    <div id="overlay" class="overlay"></div>

    <div class="main-wrapper">
      <header class="topbar">
        <div class="topbar-left">
          <button id="burger" class="burger-btn" aria-label="Deschide meniul">
            ☰
          </button>
          <div>
            <div class="topbar-title" id="topbar-title">Home overview</div>
            <div class="topbar-sub" id="topbar-sub">Status general pentru toate magazinele</div>
          </div>
        </div>
        <div class="topbar-right">
          <div class="pill">
            <span class="pill-dot"></span>
            <span class="pill-label">Live</span>
            <span class="pill-secondary" id="topbar-context-label">Sync ready</span>
          </div>
        </div>
      </header>

      <main class="main-content">
        <div class="breadcrumbs">
          <span id="breadcrumb-main">Home</span>
          <span> / </span>
          <span id="breadcrumb-sub" class="current">Overview</span>
        </div>

        <section class="overview-cards">
          <article class="overview-card">
            <div class="overview-label">Stores</div>
            <div class="overview-primary" id="card-stores-count">–</div>
            <div class="overview-sub" id="card-stores-sub">Magazin(e) conectate</div>
          </article>
          <article class="overview-card">
            <div class="overview-label">Products</div>
            <div class="overview-primary" id="card-products-count">–</div>
            <div class="overview-sub" id="card-products-sub">Active + Draft (Shopify)</div>
          </article>
          <article class="overview-card">
            <div class="overview-label">Orders Today</div>
            <div class="overview-primary" id="card-orders-today">–</div>
            <div class="overview-sub" id="card-orders-sub">Ultimele 24h, toate magazinele</div>
          </article>
          <article class="overview-card">
            <div class="overview-label">Ads</div>
            <div class="overview-primary" id="card-ads-status">–</div>
            <div class="overview-sub" id="card-ads-sub">TikTok / Meta / Google (coming soon)</div>
          </article>
        </section>

        <section class="module-container">
          <div class="module-header">
            <div class="module-header-left">
              <div class="module-title" id="module-title">Home Overview</div>
              <div class="module-sub" id="module-sub">
                Vezi o privire de ansamblu sau deschide unul dintre module.
              </div>
            </div>
            <div class="module-tag" id="module-tag">HOME</div>
          </div>
          <div class="module-body">
            <div id="module-placeholder" class="module-placeholder">
              <div><strong>Selectează un modul din stânga</strong></div>
              <div>
                <p>„My Stores” încarcă dashboard-ul Shopify actual (Sync + preview).<br/>
                „Ads” va încărca în curând statisticile de TikTok, Meta și Google.</p>
              </div>
            </div>
            <iframe
              id="module-iframe"
              class="module-iframe hidden"
              src=""
              title="Module"
            ></iframe>
          </div>
        </section>
      </main>
    </div>
  </div>

  <script>
    (function () {
      var body = document.body;
      var sidebar = document.getElementById('sidebar');
      var overlay = document.getElementById('overlay');
      var burger = document.getElementById('burger');
      var sidebarClose = document.getElementById('sidebar-close');

      var navButtons = Array.prototype.slice.call(document.querySelectorAll('.js-nav'));
      var subnavButtons = Array.prototype.slice.call(document.querySelectorAll('.js-subnav'));

      var breadcrumbMain = document.getElementById('breadcrumb-main');
      var breadcrumbSub = document.getElementById('breadcrumb-sub');
      var topbarTitle = document.getElementById('topbar-title');
      var topbarSub = document.getElementById('topbar-sub');
      var topbarContextLabel = document.getElementById('topbar-context-label');

      var cardStoresCount = document.getElementById('card-stores-count');
      var cardProductsCount = document.getElementById('card-products-count');
      var cardOrdersToday = document.getElementById('card-orders-today');
      var cardAdsStatus = document.getElementById('card-ads-status');

      var moduleTitle = document.getElementById('module-title');
      var moduleSub = document.getElementById('module-sub');
      var moduleTag = document.getElementById('module-tag');
      var modulePlaceholder = document.getElementById('module-placeholder');
      var moduleIframe = document.getElementById('module-iframe');

      function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
      }

      function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      }

      burger.addEventListener('click', openSidebar);
      sidebarClose.addEventListener('click', closeSidebar);
      overlay.addEventListener('click', closeSidebar);

      function setActiveNav(moduleName) {
        navButtons.forEach(function (btn) {
          if (btn.getAttribute('data-module') === moduleName) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      function setActiveSubnav(submodule) {
        subnavButtons.forEach(function (btn) {
          if (btn.getAttribute('data-submodule') === submodule) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      function showIframe(url) {
        modulePlaceholder.classList.add('hidden');
        moduleIframe.classList.remove('hidden');
        moduleIframe.src = url;
      }

      function showPlaceholder(text) {
        modulePlaceholder.classList.remove('hidden');
        moduleIframe.classList.add('hidden');
        moduleIframe.src = '';
        if (text) {
          modulePlaceholder.innerHTML = text;
        }
      }

      function updateHomeOverviewFromStores(stores) {
        if (!Array.isArray(stores) || !stores.length) {
          cardStoresCount.textContent = '0';
          cardProductsCount.textContent = '0';
          cardOrdersToday.textContent = '0';
          return;
        }

        var storeCount = stores.length;
        var totalActive = 0;
        var totalDraft = 0;
        var totalTodayOrders = 0;

            var activeStoreId = (function () {
      try {
        return localStorage.getItem('activeStoreId') || 'ALL';
      } catch (e) {
        return 'ALL';
      }
    })();

        stores.forEach(function (s) {
          var a = Number(s.active_products || 0);
          var d = Number(s.draft_products || 0);
          var t = Number(s.today_orders || 0);

          if (!isNaN(a)) totalActive += a;
          if (!isNaN(d)) totalDraft += d;
          if (!isNaN(t)) totalTodayOrders += t;
        });

        cardStoresCount.textContent = storeCount;
        cardProductsCount.textContent = totalActive + ' / ' + totalDraft;
        cardOrdersToday.textContent = String(totalTodayOrders);
        cardAdsStatus.textContent = 'Preparing';
      }

           function loadStoresSummary() {
        fetch('/stores')
          .then(function (r) {
            return r.json();
          })
          .then(function (stores) {
            if (!Array.isArray(stores)) stores = [];

            // --- 1) Populăm dropdown-ul de store-uri ---
            var selectEl = document.getElementById('active-store-select');
            if (selectEl) {
              var optionsHtml =
                '<option value="ALL">All stores</option>' +
                stores
                  .map(function (s) {
                    var id = s.store_id || '';
                    var label = s.store_name || id || 'Unnamed store';
                    return (
                      '<option value="' +
                      id +
                      '">' +
                      label +
                      '</option>'
                    );
                  })
                  .join('');

              selectEl.innerHTML = optionsHtml;

              // Dacă store-ul salvat nu mai există, resetăm la ALL
              var found =
                activeStoreId === 'ALL'
                  ? true
                  : stores.some(function (s) {
                      return s.store_id === activeStoreId;
                    });
              if (!found) {
                activeStoreId = 'ALL';
                try {
                  localStorage.setItem('activeStoreId', activeStoreId);
                } catch (e) {}
              }

              selectEl.value = activeStoreId;

              selectEl.onchange = function () {
                activeStoreId = this.value || 'ALL';
                try {
                  localStorage.setItem('activeStoreId', activeStoreId);
                } catch (e) {}
                // Recalculează KPI-urile pentru noul store selectat
                loadStoresSummary();
              };
            }

            // --- 2) Calculăm KPI-urile în funcție de activeStoreId ---

            var scopeStores;
            if (activeStoreId === 'ALL') {
              scopeStores = stores;
            } else {
              scopeStores = stores.filter(function (s) {
                return s.store_id === activeStoreId;
              });
            }

            var totalStoresAll = stores.length;
            var totalActive = 0;
            var totalDraft = 0;
            var totalOrdersToday = 0;

            scopeStores.forEach(function (s) {
              if (typeof s.active_products === 'number') {
                totalActive += s.active_products;
              }
              if (typeof s.draft_products === 'number') {
                totalDraft += s.draft_products;
              }
              if (typeof s.today_orders === 'number') {
                totalOrdersToday += s.today_orders;
              }
            });

            var storesValueEl = document.getElementById('kpi-stores-value');
            var productsValueEl = document.getElementById('kpi-products-value');
            var ordersValueEl = document.getElementById('kpi-orders-value');
            var adsValueEl = document.getElementById('kpi-ads-value');

            if (storesValueEl) {
              // dacă e ALL => nr total magazine; dacă e filtrat => câte magazine sunt în scope (de obicei 1)
              var scopedStoresCount = scopeStores.length || 0;
              storesValueEl.textContent =
                activeStoreId === 'ALL'
                  ? totalStoresAll || 0
                  : scopedStoresCount || 0;
            }

            if (productsValueEl) {
              productsValueEl.textContent = (totalActive + totalDraft) || 0;
            }

            if (ordersValueEl) {
              ordersValueEl.textContent = totalOrdersToday || 0;
            }

            if (adsValueEl) {
              // Deocamdată placeholder; ulterior îl legăm la modulul de ads
              adsValueEl.textContent = '—';
            }
          })
          .catch(function (err) {
            console.error('loadStoresSummary error', err);
          });
      }

      function goToModule(moduleName, options) {
        options = options || {};
        setActiveNav(moduleName);
        setActiveSubnav(options.submodule || null);

        if (moduleName === 'home') {
          breadcrumbMain.textContent = 'Home';
          breadcrumbSub.textContent = 'Overview';
          topbarTitle.textContent = 'Home overview';
          topbarSub.textContent = 'Status general pentru toate magazinele';
          topbarContextLabel.textContent = 'Sync ready';

          moduleTitle.textContent = 'Home Overview';
          moduleSub.textContent = 'Vezi o privire de ansamblu sau deschide unul dintre module.';
          moduleTag.textContent = 'HOME';

          showPlaceholder(
            '<div><strong>Dashboard general</strong></div>' +
            '<div><p>Aici vei vedea în timp real KPI globali din toate modulele (Shopify, Ads, Shipping, etc.).</p>' +
            '<p>Deocamdată, poți intra în <strong>My Stores</strong> pentru a vedea dashboard-ul Shopify complet.</p></div>'
          );
        } else if (moduleName === 'stores') {
          breadcrumbMain.textContent = 'My Stores';
          breadcrumbSub.textContent = 'Shopify Sync';
          topbarTitle.textContent = 'Shopify – Multi-Store Sync';
          topbarSub.textContent = 'Preview + sincronizare produse pentru toate magazinele conectate.';
          topbarContextLabel.textContent = 'Shopify';

          moduleTitle.textContent = 'My Stores – Shopify Sync';
          moduleSub.textContent = 'Dashboard-ul tău existent de sync este încărcat mai jos.';
          moduleTag.textContent = 'SHOPIFY';

          showIframe('/shopify');
        } else if (moduleName === 'ads') {
          var sub = options.submodule || 'tiktok';
          breadcrumbMain.textContent = 'Ads';
          breadcrumbSub.textContent = sub.charAt(0).toUpperCase() + sub.slice(1) + ' Ads';
          topbarTitle.textContent = 'Ads – ' + sub.toUpperCase();
          topbarSub.textContent = 'În curând vei avea aici control unificat pentru campanii și bugete.';
          topbarContextLabel.textContent = 'Ads beta';

          moduleTitle.textContent = sub.toUpperCase() + ' Ads';
          moduleSub.textContent = 'UI-ul complet pentru ' + sub.toUpperCase() + ' Ads va fi conectat aici.';
          moduleTag.textContent = sub.toUpperCase();

          showPlaceholder(
            '<div><strong>' + sub.toUpperCase() + ' Ads – Coming soon</strong></div>' +
            '<div><p>Vom conecta în curând conturile de ads și vom afișa statistici + butoane de control (start/stop, bugete, etc.).</p></div>'
          );
        } else if (moduleName === 'orders') {
          breadcrumbMain.textContent = 'Orders';
          breadcrumbSub.textContent = 'Overview';
          topbarTitle.textContent = 'Orders – Coming soon';
          topbarSub.textContent = 'Follow-up pentru comenzi din toate magazinele.';
          topbarContextLabel.textContent = 'Orders';

          moduleTitle.textContent = 'Orders';
          moduleSub.textContent = 'În curând: feed unic cu comenzi + status + acțiuni.';
          moduleTag.textContent = 'ORDERS';

          showPlaceholder(
            '<div><strong>Orders – Modul în pregătire</strong></div>' +
            '<div><p>Aici vei vedea comenzi consolidate din toate magazinele.</p></div>'
          );
        } else if (moduleName === 'shipping') {
          breadcrumbMain.textContent = 'Shipping';
          breadcrumbSub.textContent = 'Overview';
          topbarTitle.textContent = 'Shipping – Coming soon';
          topbarSub.textContent = 'Curieri, AWB-uri și statusuri de livrare într-un singur loc.';
          topbarContextLabel.textContent = 'Shipping';

          moduleTitle.textContent = 'Shipping';
          moduleSub.textContent = 'În curând: integrare cu curieri și generare AWB automat.';
          moduleTag.textContent = 'SHIPPING';

          showPlaceholder(
            '<div><strong>Shipping – Modul în pregătire</strong></div>' +
            '<div><p>Vom integra FAN, GLS, Sameday etc. și vei avea control direct din panel.</p></div>'
          );
        } else if (moduleName === 'inventory') {
          breadcrumbMain.textContent = 'Inventory';
          breadcrumbSub.textContent = 'Overview';
          topbarTitle.textContent = 'Inventory – Coming soon';
          topbarSub.textContent = 'Stocuri cross-store într-un singur view.';
          topbarContextLabel.textContent = 'Inventory';

          moduleTitle.textContent = 'Inventory';
          moduleSub.textContent = 'În curând: stocuri sincronizate și alerte de out-of-stock.';
          moduleTag.textContent = 'INVENTORY';

          showPlaceholder(
            '<div><strong>Inventory – Modul în pregătire</strong></div>' +
            '<div><p>Aici vei vedea stocuri consolidate și vei putea ajusta rapid.</p></div>'
          );
        } else if (moduleName === 'helpdesk') {
          breadcrumbMain.textContent = 'Helpdesk';
          breadcrumbSub.textContent = 'Overview';
          topbarTitle.textContent = 'Helpdesk – Coming soon';
          topbarSub.textContent = 'Mesaje, ticketing și suport clienți unificat.';
          topbarContextLabel.textContent = 'Helpdesk';

          moduleTitle.textContent = 'Helpdesk';
          moduleSub.textContent = 'În curând: integrare e-mail, chat și social în același loc.';
          moduleTag.textContent = 'HELPDESK';

          showPlaceholder(
            '<div><strong>Helpdesk – Modul în pregătire</strong></div>' +
            '<div><p>Vom centraliza mesajele din e-mail, chat și social pentru toate magazinele.</p></div>'
          );
        } else if (moduleName === 'settings') {
          breadcrumbMain.textContent = 'Settings';
          breadcrumbSub.textContent = 'Platform';
          topbarTitle.textContent = 'Settings';
          topbarSub.textContent = 'Env vars, parole și chei pentru module. (UI în lucru)';
          topbarContextLabel.textContent = 'Settings';

          moduleTitle.textContent = 'Settings';
          moduleSub.textContent = 'Vom adăuga aici UI pentru a configura variabilele de mediu și cheile API.';
          moduleTag.textContent = 'SETTINGS';

          showPlaceholder(
            '<div><strong>Settings – UI în lucru</strong></div>' +
            '<div><p>Deocamdată variabilele le setezi în Railway. Aici vom putea citi/salva setări pentru fiecare modul.</p></div>'
          );
        }

        closeSidebar();
      }

      navButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var moduleName = btn.getAttribute('data-module');
          if (!moduleName) return;
          if (moduleName === 'ads') {
            goToModule('ads', { submodule: 'tiktok' });
          } else {
            goToModule(moduleName);
          }
        });
      });

      subnavButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var submodule = btn.getAttribute('data-submodule') || 'tiktok';
          goToModule('ads', { submodule: submodule });
        });
      });

      body.classList.add('app-loaded');
      goToModule('home');
      loadStoresSummary();
      setInterval(loadStoresSummary, 60000);
    })();
  </script>
</body>
</html>
  `;
}

module.exports = dashboardPage;