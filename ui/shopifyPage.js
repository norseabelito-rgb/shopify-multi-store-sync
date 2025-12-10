// ui/shopifyPage.js

function shopifyPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Shopify Multi-Store Sync</title>
  <style>
    :root {
      --bg: #05060c;
      --bg-2: #0a0d16;
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
      padding: 32px;
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(1200px at 20% 20%, rgba(92, 139, 255, 0.08), transparent 45%),
        radial-gradient(1000px at 80% 10%, rgba(73, 199, 255, 0.07), transparent 40%),
        linear-gradient(180deg, #06070f, #05060c);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }

    h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: -0.01em; }
    h2 { margin: 0 0 6px; font-size: 18px; letter-spacing: -0.01em; }
    p  { margin: 4px 0 12px; color: var(--muted); }
    code {
      padding: 3px 7px;
      border-radius: 8px;
      background: rgba(92, 139, 255, 0.12);
      color: var(--accent);
    }

    .page-shell {
      max-width: 1200px;
      margin: 0 auto 56px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 4px 0;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 10px;
      color: var(--muted);
      margin: 0 0 8px;
    }

    .subtitle { margin-top: 2px; }

    .status-pill {
      background: radial-gradient(circle at 0% 0%, rgba(92, 139, 255, 0.25), transparent 55%);
      border-radius: 999px;
      border: 1px solid rgba(92, 139, 255, 0.45);
      padding: 7px 14px;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #dbe4ff;
    }

    .panel {
      background: var(--panel);
      border-radius: 14px;
      border: 1px solid var(--border);
      padding: 18px;
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

    /* PROGRESS BAR */

    .loading-panel {
      padding: 0;
      border: none;
      background: transparent;
      box-shadow: none;
    }

    .loading-panel::before {
      display: none;
    }

    .loading-bar-wrapper {
      display: none;
      padding: 16px 18px;
      gap: 6px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(92, 139, 255, 0.08), rgba(73, 199, 255, 0.06));
      border: 1px solid var(--border-strong);
    }

    .loading-bar-wrapper.active {
      display: flex;
      flex-direction: column;
    }

    .loading-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .loading-label {
      font-size: 12px;
      color: #e4ecff;
    }

    .loading-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .loading-bar {
      position: relative;
      width: 100%;
      max-width: 520px;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
      overflow: hidden;
    }

    .loading-inner {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 40%;
      border-radius: 999px;
      background: linear-gradient(120deg, rgba(73, 199, 255, 0.9), rgba(92, 139, 255, 0.95), rgba(73, 199, 255, 0.9));
      background-size: 200% 100%;
      animation: shimmer 1.6s ease-in-out infinite, slide 1.6s ease-in-out infinite;
    }

    @keyframes shimmer {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }

    @keyframes slide {
      0%   { transform: translateX(-60%); }
      50%  { transform: translateX(15%); }
      100% { transform: translateX(120%); }
    }

    /* STORE LIST */

    .stores {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
      margin-top: 6px;
    }

    .store-card {
      background: linear-gradient(145deg, rgba(22, 27, 38, 0.95), rgba(10, 14, 24, 0.95));
      border-radius: 12px;
      padding: 14px 14px 10px;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease;
    }

    .store-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-strong);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
    }

    .store-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .store-title {
      font-size: 14px;
      font-weight: 600;
    }

    .store-sub {
      font-size: 11px;
      color: var(--muted);
    }

    .store-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 4px;
    }

    .store-stat {
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .store-stat-label {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .store-stat-value {
      font-size: 13px;
      font-weight: 600;
      color: #e4ecff;
    }

    .store-actions {
      margin-top: 4px;
    }

    /* Rezumat total comenzi (slotul gol din grid) */
    .store-summary {
      padding: 14px;
      border-radius: 12px;
      border: 1px dashed rgba(255, 255, 255, 0.18);
      background: rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 0;
    }

    .store-summary-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }

    .store-summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px 12px;
    }

    .store-summary-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .store-summary-label {
      font-size: 11px;
      color: var(--muted);
    }

    .store-summary-value {
      font-size: 14px;
      font-weight: 600;
      color: #e4ecff;
    }

    button {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 6px 11px;
      cursor: pointer;
      margin-right: 6px;
      margin-top: 4px;
      background: linear-gradient(130deg, #5c8bff, #49c7ff);
      color: #0b1020;
      font-size: 12px;
      letter-spacing: 0.01em;
      box-shadow: 0 6px 18px rgba(92, 139, 255, 0.25);
      transition: transform 0.14s ease, box-shadow 0.18s ease, filter 0.14s ease, opacity 0.18s ease;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(92, 139, 255, 0.3);
      filter: brightness(1.03);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 4px 14px rgba(92, 139, 255, 0.18);
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    button.secondary {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
      color: #e1e5f5;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
    }

    #log {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      white-space: pre-wrap;
      background: linear-gradient(180deg, rgba(12, 15, 23, 0.94), rgba(8, 10, 18, 0.96));
      border-radius: 12px;
      padding: 14px;
      max-height: 320px;
      overflow: auto;
      border: 1px solid var(--border);
      color: #dbe4ff;
      font-size: 12px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 7px;
      border-radius: 999px;
      font-size: 10px;
      margin-left: 5px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .badge-create { background: #0f5132; color: #8ef1c4; }
    .badge-update { background: #1f2738; color: #f5e36d; }
    .badge-delete { background: #5f1111; color: #ffd1d1; }
    .badge-skip   { background: #0f1421; color: #a3adbf; }

    .preview-container {
      padding: 0;
      border-radius: 14px;
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: 0 16px 50px rgba(0, 0, 0, 0.55);
    }

    .preview-scroll {
      max-height: 420px;
      overflow: auto;
    }

    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: linear-gradient(90deg, rgba(12, 15, 23, 0.96), rgba(10, 12, 20, 0.96));
      border-bottom: 1px solid var(--border);
      font-size: 12px;
    }

    .table-toolbar-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .tab-toggle {
      display: inline-flex;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.05);
      padding: 3px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .tab-toggle button {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      margin: 0;
      border: none;
      box-shadow: none;
      background: transparent;
      color: #9ca8c4;
      cursor: pointer;
    }

    .tab-toggle button.active {
      background: linear-gradient(135deg, #5c8bff, #49c7ff);
      color: #0b1020;
      box-shadow: 0 8px 20px rgba(92, 139, 255, 0.35);
    }

    table.preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: #dfe7ff;
    }

    table.preview-table thead {
      background: rgba(9, 11, 18, 0.92);
      position: sticky;
      top: 0;
      z-index: 1;
      backdrop-filter: blur(10px);
    }

    table.preview-table th,
    table.preview-table td {
      padding: 10px 12px;
      vertical-align: top;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    table.preview-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #aeb8ce;
    }

    table.preview-table tbody tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }

    table.preview-table tbody tr:hover {
      background: rgba(92, 139, 255, 0.08);
    }

    .images-cell {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .images-main {
      width: 60px;
      height: 60px;
      border-radius: 10px;
      object-fit: cover;
      background: #111827;
    }

    .images-thumbs {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .images-thumbs img {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      object-fit: cover;
      background: #111827;
    }

    .product-cell-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 3px;
    }

    .product-cell-sku {
      font-size: 11px;
      color: #9ca3af;
    }

    .action-main {
      font-size: 11px;
      margin-bottom: 6px;
      color: #e7ecff;
      line-height: 1.5;
    }

    .action-secondary {
      font-size: 11px;
      color: var(--muted);
    }

    .pill-label {
      display: inline-block;
      padding: 3px 6px;
      border-radius: 999px;
      font-size: 10px;
      background: rgba(255, 255, 255, 0.06);
      color: #cdd7f3;
      margin-right: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .current-values {
      font-size: 11px;
      color: #d9e2ff;
    }

    .current-values > div {
      margin-bottom: 4px;
    }

    .checkbox-cell {
      text-align: center;
      vertical-align: middle !important;
      width: 40px;
    }

    .checkbox-cell input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #5c8bff;
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Operational Control</p>
        <h1>Shopify Multi-Store Sync</h1>
        <p class="subtitle">Tag folosit de script: <code>ADAUGAT CU SCRIPT</code></p>
      </div>
      <div class="status-pill">Live sync ready</div>
    </header>

    <!-- PROGRESS BAR -->
    <div class="panel loading-panel">
      <div id="loading-wrapper" class="loading-bar-wrapper">
        <div class="loading-top">
          <div id="loading-text" class="loading-label">Se pregătește...</div>
          <div class="loading-sub">
            <span id="loading-extra">Flux animat cu estimare în timp real</span>
            <span id="loading-eta"></span>
          </div>
        </div>
        <div class="loading-bar">
          <div class="loading-inner"></div>
        </div>
      </div>
    </div>

    <!-- STORES -->
    <div class="panel">
      <div class="section-heading">
        <div>
          <h2>Magazin(e)</h2>
          <p class="muted">Alege magazinul pentru care verifici sau sincronizezi produsele.</p>
        </div>
      </div>
      <div id="stores" class="stores"></div>
    </div>

    <!-- PREVIEW -->
    <div id="preview-wrapper" class="preview-container">
      <div class="section-heading" style="padding: 14px 16px 4px;">
        <div>
          <h2 style="margin-bottom:4px;">Preview modificări</h2>
          <p class="muted">Revizuiește modificările înainte de sincronizare.</p>
        </div>
      </div>

      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span id="preview-summary">Niciun preview încă.</span>
          <div class="tab-toggle" title="Comută între produsele cu modificări reale și cele fără diferențe reale.">
            <button id="tab-changes" class="active">Cu modificări</button>
            <button id="tab-nochanges">Fără modificări reale</button>
          </div>
          <span
            id="current-store-label"
            style="font-size:11px;color:#9ca8c4;border-left:1px solid rgba(255,255,255,0.1);padding-left:10px;"
          >
            Magazin preview: —
          </span>
        </div>
        <div>
          <label style="font-size:11px;color:#c7d2ea;" title="Selectează sau deselectează toate produsele din lista curentă.">
            <input type="checkbox" id="select-all-checkbox" />
            Selectează toate
          </label>
        </div>
      </div>

      <div id="preview-results" class="preview-scroll">
        <!-- tabelul se va randa din JS -->
      </div>
    </div>

    <!-- LOG -->
    <div class="panel">
      <div class="section-heading">
        <div>
          <h2>Log</h2>
          <p class="muted">Monitorizează evenimentele și rezultatele recente.</p>
        </div>
      </div>
      <div id="log">Selectează un magazin și apasă “Verifică schimbările” sau “Sincronizează produsele”.</div>
    </div>
  </div>

  <script>
    // Elemente globale
    var logEl = document.getElementById('log');
    var storesEl = document.getElementById('stores');
    var previewContainer = document.getElementById('preview-results');
    var previewSummaryEl = document.getElementById('preview-summary');
    var selectAllCheckbox = document.getElementById('select-all-checkbox');
    var tabChangesBtn = document.getElementById('tab-changes');
    var tabNoChangesBtn = document.getElementById('tab-nochanges');
    var currentStoreLabelEl = document.getElementById('current-store-label');

    var loadingWrapper = document.getElementById('loading-wrapper');
    var loadingTextEl = document.getElementById('loading-text');
    var loadingExtraEl = document.getElementById('loading-extra');
    var loadingEtaEl = document.getElementById('loading-eta');

    // State
    var currentPreviewItems = [];
    var currentStoreId = null;
    var currentStoreName = '';
    var currentTab = 'changes'; // 'changes' | 'nochanges'
    var selectedKeys = new Set();

    var loadingInterval = null;
    var loadingStartTime = 0;
    var loadingTotalMs = 0;

    function appendLog(text) {
      var ts = new Date().toISOString();
      logEl.textContent = '[' + ts + '] ' + text + '\\n' + logEl.textContent;
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function keyForItem(item) {
      return (item.store_id || '') + '::' + (item.internal_product_id || '');
    }

    function badge(action) {
      var a = (action || '').toLowerCase();
      if (a === 'create') return '<span class="badge badge-create">CREATE</span>';
      if (a === 'update') return '<span class="badge badge-update">UPDATE</span>';
      if (a === 'delete') return '<span class="badge badge-delete">DELETE</span>';
      if (a === 'skip')   return '<span class="badge badge-skip">SKIP</span>';
      return '';
    }

    // Loading cu ETA
    function setLoading(isLoading, text, kind) {
      if (isLoading) {
        if (text) {
          loadingTextEl.textContent = text;
        }

        if (loadingExtraEl) {
          if (kind === 'sync') {
            loadingExtraEl.textContent = 'Sincronizăm modificările selectate...';
          } else if (kind === 'preview') {
            loadingExtraEl.textContent = 'Calculăm modificările disponibile...';
          } else {
            loadingExtraEl.textContent = 'Flux animat cu estimare în timp real';
          }
        }

        loadingWrapper.classList.add('active');

        if (kind) {
          loadingStartTime = Date.now();
          loadingTotalMs = kind === 'sync' ? 90000 : 30000;

          if (loadingInterval) {
            clearInterval(loadingInterval);
          }

          loadingInterval = setInterval(function () {
            var elapsed = Date.now() - loadingStartTime;
            var remaining = Math.max(0, loadingTotalMs - elapsed);

            if (!loadingEtaEl) return;

            if (remaining > 0) {
              var secs = Math.ceil(remaining / 1000);
              loadingEtaEl.textContent = ' · Estimat: ~' + secs + 's rămase';
            } else {
              loadingEtaEl.textContent = ' · Aproape gata...';
            }
          }, 500);
        }
      } else {
        loadingWrapper.classList.remove('active');
        if (loadingInterval) {
          clearInterval(loadingInterval);
          loadingInterval = null;
        }
        if (loadingEtaEl) {
          loadingEtaEl.textContent = '';
        }
      }
    }

    // Load stores (carduri + stats + rezumat total)
    async function loadStores() {
      try {
        var res = await fetch('/stores');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        storesEl.innerHTML = '';

        // Totale globale (suma peste toate magazinele)
        var totalToday = 0;
        var totalWeek = 0;
        var totalMonth = 0;
        var totalYear = 0;

        data.forEach(function (store) {
          var card = document.createElement('div');
          card.className = 'store-card';

          var storeLabel = store.store_name || store.store_id;
          var activeCount =
            store.active_products != null ? String(store.active_products) : '–';
          var draftCount =
            store.draft_products != null ? String(store.draft_products) : '–';
          var todayOrders =
            store.today_orders != null ? String(store.today_orders) : '–';

          // adunăm la totaluri (dacă sunt numere)
          if (typeof store.today_orders === 'number') {
            totalToday += store.today_orders;
          }
          if (typeof store.week_orders === 'number') {
            totalWeek += store.week_orders;
          }
          if (typeof store.month_orders === 'number') {
            totalMonth += store.month_orders;
          }
          if (typeof store.year_orders === 'number') {
            totalYear += store.year_orders;
          }

          var html =
            '<div class="store-header">' +
              '<div class="store-title">' + escapeHtml(storeLabel) + '</div>' +
              '<div class="store-sub">ID: ' + escapeHtml(store.store_id || '') + '</div>' +
            '</div>' +
            '<div class="store-stats">' +
              '<div class="store-stat">' +
                '<span class="store-stat-label">Active</span>' +
                '<span class="store-stat-value">' + activeCount + '</span>' +
              '</div>' +
              '<div class="store-stat">' +
                '<span class="store-stat-label">Draft</span>' +
                '<span class="store-stat-value">' + draftCount + '</span>' +
              '</div>' +
              '<div class="store-stat">' +
                '<span class="store-stat-label">Comenzi</span>' +
                '<span class="store-stat-value">' + todayOrders + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="store-actions">' +
              '<button ' +
                'data-store-id="' + escapeHtml(store.store_id) + '" ' +
                'data-store-name="' + escapeHtml(storeLabel) + '" ' +
                'class="btn-preview" ' +
                'title="Verifică ce produse vor fi create sau actualizate pentru acest magazin."' +
              '>Verifică schimbările</button>' +
              '<button ' +
                'data-store-id="' + escapeHtml(store.store_id) + '" ' +
                'data-store-name="' + escapeHtml(storeLabel) + '" ' +
                'class="btn-sync secondary" ' +
                'title="Aplică în Shopify toate modificările selectate pentru acest magazin."' +
              '>Sincronizează produsele</button>' +
            '</div>';

          card.innerHTML = html;
          storesEl.appendChild(card);
        });

        // Blocul de rezumat total – folosește slotul gol din grid
        var summary = document.createElement('div');
        summary.className = 'store-summary';

        summary.innerHTML =
          '<div class="store-summary-title">Total comenzi</div>' +
          '<div class="store-summary-grid">' +
            '<div class="store-summary-item">' +
              '<span class="store-summary-label">Astăzi</span>' +
              '<span class="store-summary-value">' + totalToday + '</span>' +
            '</div>' +
            '<div class="store-summary-item">' +
              '<span class="store-summary-label">Săptămâna curentă</span>' +
              '<span class="store-summary-value">' + totalWeek + '</span>' +
            '</div>' +
            '<div class="store-summary-item">' +
              '<span class="store-summary-label">Luna curentă</span>' +
              '<span class="store-summary-value">' + totalMonth + '</span>' +
            '</div>' +
            '<div class="store-summary-item">' +
              '<span class="store-summary-label">Anul curent</span>' +
              '<span class="store-summary-value">' + totalYear + '</span>' +
            '</div>' +
          '</div>';

        storesEl.insertBefore(summary, storesEl.firstChild);
        appendLog('Store-urile au fost încărcate / actualizate.');
      } catch (err) {
        appendLog('Eroare la loadStores: ' + err.message);
      }
    }

    // Delegare click pe containerul de store-uri (o singură dată)
    storesEl.addEventListener('click', async function (e) {
      var btn = e.target;
      if (!(btn instanceof HTMLButtonElement)) return;

      var storeId = btn.getAttribute('data-store-id');
      var storeName = btn.getAttribute('data-store-name') || storeId;
      if (!storeId) return;

      currentStoreId = storeId;
      currentStoreName = storeName;

      if (btn.classList.contains('btn-preview')) {
        await handlePreview(storeId, storeName, btn);
      } else if (btn.classList.contains('btn-sync')) {
        await handleSync(storeId, storeName, btn);
      }
    });

    // Preview
    async function handlePreview(storeId, storeName, btn) {
      try {
        btn.disabled = true;
        setLoading(true, 'Verificăm schimbările pentru magazinul "' + storeName + '"...', 'preview');
        appendLog('Preview (verificare schimbări) pentru store ' + storeId + '...');

        var res = await fetch('/preview?store_id=' + encodeURIComponent(storeId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();

        currentPreviewItems = Array.isArray(data) ? data : [];
        currentTab = 'changes';
        tabChangesBtn.classList.add('active');
        tabNoChangesBtn.classList.remove('active');

        if (currentStoreLabelEl) {
          currentStoreLabelEl.textContent = 'Magazin preview: ' + (currentStoreName || storeId);
        }

        renderPreviewTable();
        setLoading(false);
      } catch (err) {
        appendLog('Eroare la preview ' + storeId + ': ' + err.message);
        setLoading(false);
      } finally {
        btn.disabled = false;
      }
    }

    // Sync
    async function handleSync(storeId, storeName, btn) {
      try {
        btn.disabled = true;
        setLoading(true, 'Sincronizăm produsele selectate pentru magazinul "' + storeName + '"...', 'sync');
        appendLog('Sync (sincronizare produse) pentru store ' + storeId + '...');

        var itemsPayload = [];
        currentPreviewItems.forEach(function (item) {
          var key = keyForItem(item);
          if (selectedKeys.has(key) && item.hasChanges) {
            itemsPayload.push({
              store_id: item.store_id,
              internal_product_id: item.internal_product_id
            });
          }
        });

        if (itemsPayload.length === 0) {
          appendLog('Nu există produse selectate pentru sincronizare.');
          setLoading(false);
          btn.disabled = false;
          return;
        }

        var res = await fetch('/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            items: itemsPayload
          })
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();

        var html = 'Rezultate sync ' + storeId + ':\\n';
        html += 'Processed: ' + (data.processed || 0) + '\\n';
        if (Array.isArray(data.results)) {
          data.results.forEach(function (r) {
            html += '- ' + r.internal_product_id + ' (' + (r.sku || 'fara SKU') + '): ' +
              (r.action || '') + ' -> ' + (r.status || '') +
              (r.error ? ' (error: ' + r.error + ')' : '') + '\\n';
          });
        }
        appendLog(html);
        setLoading(false);
      } catch (err) {
        appendLog('Eroare la sync ' + storeId + ': ' + err.message);
        setLoading(false);
      } finally {
        btn.disabled = false;
      }
    }

    // Preview table
    function renderPreviewTable() {
      var items = currentPreviewItems || [];
      var filtered;

      if (currentTab === 'changes') {
        filtered = items.filter(function (it) {
          return (it.plannedAction === 'create') ||
                 (it.plannedAction === 'update' && it.hasChanges);
        });
      } else {
        filtered = items.filter(function (it) {
          return it.plannedAction === 'update' && !it.hasChanges;
        });
      }

      previewSummaryEl.textContent =
        filtered.length === 0
          ? 'Nicio intrare pentru acest filtru.'
          : filtered.length + ' produse în lista curentă.';

      if (filtered.length === 0) {
        previewContainer.innerHTML = '';
        return;
      }

      var rowsHtml = filtered.map(function (item) {
        return renderRow(item);
      }).join('');

      var tableHtml =
        '<table class="preview-table">' +
          '<thead>' +
            '<tr>' +
              '<th>Poze noi</th>' +
              '<th>Produs</th>' +
              '<th>Acțiune</th>' +
              '<th>Valori curente în Shopify</th>' +
              '<th class="checkbox-cell"></th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>';

      previewContainer.innerHTML = tableHtml;

      var checkboxes = previewContainer.querySelectorAll('tbody input[type="checkbox"]');
      checkboxes.forEach(function (cb) {
        cb.addEventListener('change', function () {
          var key = cb.getAttribute('data-key');
          if (!key) return;
          if (cb.checked) selectedKeys.add(key);
          else selectedKeys.delete(key);
        });
      });

      var allKeysInView = filtered.map(keyForItem);
      var allSelected =
        allKeysInView.length > 0 &&
        allKeysInView.every(function (k) { return selectedKeys.has(k); });
      selectAllCheckbox.checked = allSelected;
    }

    function renderRow(item) {
      var key = keyForItem(item);
      var mainImg = (item.preview_image_urls && item.preview_image_urls[0]) || item.image_url || '';
      var thumbImgs = (item.preview_image_urls || []).slice(1, 4);
      var existingThumbs = (item.existing && item.existing.preview_images) || [];

      var actionTextMain = '';
      var actionTextSecondary = '';

      if (item.plannedAction === 'create') {
        actionTextMain = badge('create') + ' Produs nou. Se va crea de la 0.';
      } else if (item.plannedAction === 'update') {
        var skuInfo = item.sku ? ' (SKU – ' + escapeHtml(item.sku) + ')' : '';
        var fields = (item.changed_fields || []).filter(function (f) { return f !== 'status'; });
        var fieldsText = fields.length ? fields.join(', ') : 'fără câmpuri modificate';
        actionTextMain = badge('update') +
          ' Produs existent' + skuInfo + '. Se actualizează: ' + escapeHtml(fieldsText) + '.';
      } else if (item.plannedAction === 'delete') {
        actionTextMain = badge('delete') + ' Produs marcat pentru ștergere.';
      } else {
        actionTextMain = badge('skip') + ' Intrare ignorată (skip).';
      }

      var currentValuesHtml = '';

      if (item.plannedAction === 'create') {
        var storeLabel = escapeHtml(currentStoreName || item.store_id || 'magazin');
        currentValuesHtml =
          '<div class="current-values">Acest produs nu exista pe <strong>' +
          storeLabel +
          '</strong>. Il vom crea de la 0.</div>';
      } else if (item.plannedAction === 'update') {
        var existing = item.existing || {};
        var fields2 = (item.changed_fields || []);
        var parts = [];

        if (fields2.indexOf('titlu') !== -1) {
          parts.push(
            '<div><span class="pill-label">Titlu actual</span> ' +
            escapeHtml(existing.title || '—') +
            '</div>'
          );
        }

        if (fields2.indexOf('tag-uri') !== -1) {
          parts.push(
            '<div><span class="pill-label">Tag-uri actuale</span> ' +
            escapeHtml(existing.tags || '') +
            '</div>'
          );
        }

        if (fields2.indexOf('preț') !== -1 || fields2.indexOf('preț vechi') !== -1) {
          var priceInfo = (existing.variants && existing.variants[0]) || {};
          var priceText = priceInfo.price ? priceInfo.price + ' ' : '';
          var compareText = priceInfo.compare_at_price
            ? '(preț vechi: ' + priceInfo.compare_at_price + ')'
            : '';
          parts.push(
            '<div><span class="pill-label">Preț actual</span> ' +
            escapeHtml(priceText + compareText) +
            '</div>'
          );
        }

        if (fields2.indexOf('poze') !== -1) {
          var thumbs = existingThumbs
            .map(function (src) {
              return '<img src="' + src + '" referrerpolicy="no-referrer" />';
            })
            .join('');
          parts.push(
            '<div><span class="pill-label">Poze actuale</span><div class="images-thumbs">' +
            thumbs +
            '</div></div>'
          );
        }

        if (fields2.indexOf('descriere') !== -1) {
          parts.push(
            '<div><span class="pill-label">Descriere actuală</span> (conținut HTML existent în Shopify)</div>'
          );
        }

        if (parts.length === 0) {
          parts.push('<div class="current-values">(Nu s-au detectat câmpuri diferite față de Shopify.)</div>');
        }

        currentValuesHtml = '<div class="current-values">' + parts.join('') + '</div>';
      } else {
        currentValuesHtml = '<div class="current-values">(nu există produs sau este creat nou)</div>';
      }

      var checkedAttr = selectedKeys.has(key) ? ' checked' : '';

      var thumbsHtml = thumbImgs
        .map(function (u) {
          return '<img src="' + u + '" alt="" referrerpolicy="no-referrer" />';
        })
        .join('');

      return (
        '<tr>' +
          '<td>' +
            '<div class="images-cell">' +
              '<img class="images-main" src="' + (mainImg || '') + '" alt="" referrerpolicy="no-referrer" />' +
              '<div class="images-thumbs">' + thumbsHtml + '</div>' +
            '</div>' +
          '</td>' +
          '<td>' +
            '<div class="product-cell-title">' +
              escapeHtml(item.title || item.internal_product_id || '(fără titlu)') +
            '</div>' +
            '<div class="product-cell-sku">SKU: ' +
              escapeHtml(item.sku || 'fără SKU') +
            '</div>' +
          '</td>' +
          '<td>' +
            '<div class="action-main">' + actionTextMain + '</div>' +
            (actionTextSecondary ? '<div class="action-secondary">' + actionTextSecondary + '</div>' : '') +
          '</td>' +
          '<td>' + currentValuesHtml + '</td>' +
          '<td class="checkbox-cell">' +
            '<input type="checkbox" data-key="' + key + '"' + checkedAttr +
              ' title="Bifează pentru a include acest produs la sincronizare." />' +
          '</td>' +
        '</tr>'
      );
    }

    // Tab buttons
    tabChangesBtn.addEventListener('click', function () {
      currentTab = 'changes';
      tabChangesBtn.classList.add('active');
      tabNoChangesBtn.classList.remove('active');
      renderPreviewTable();
    });

    tabNoChangesBtn.addEventListener('click', function () {
      currentTab = 'nochanges';
      tabNoChangesBtn.classList.add('active');
      tabChangesBtn.classList.remove('active');
      renderPreviewTable();
    });

    // Select all
    selectAllCheckbox.addEventListener('change', function () {
      var items = currentPreviewItems || [];
      var filtered;

      if (currentTab === 'changes') {
        filtered = items.filter(function (it) {
          return (it.plannedAction === 'create') ||
                 (it.plannedAction === 'update' && it.hasChanges);
        });
      } else {
        filtered = items.filter(function (it) {
          return it.plannedAction === 'update' && !it.hasChanges;
        });
      }

      var keysInView = filtered.map(keyForItem);
      if (selectAllCheckbox.checked) {
        keysInView.forEach(function (k) { selectedKeys.add(k); });
      } else {
        keysInView.forEach(function (k) { selectedKeys.delete(k); });
      }
      renderPreviewTable();
    });

    // Init + auto-refresh stores la 30s
    loadStores();
    setInterval(loadStores, 30000);
  </script>
</body>
</html>
  `;
}

module.exports = shopifyPage;