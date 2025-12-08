// ui/dashboardPage.js

function dashboardPage() {
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
      --panel-strong: rgba(22, 27, 38, 0.9);
      --border: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.14);
      --text: #eef2ff;
      --muted: #9aa4b5;
      --accent: #5c8bff;
      --accent-2: #49c7ff;
      --shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
      --glow: 0 10px 40px rgba(92, 139, 255, 0.28);
      --radius: 16px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      padding: 32px;
      font-family: "Inter", "SF Pro Display", "Sora", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
    code { padding: 3px 7px; border-radius: 8px; background: rgba(92, 139, 255, 0.12); color: var(--accent); }

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
      padding: 6px 4px 4px;
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
      background: linear-gradient(135deg, rgba(73, 199, 255, 0.16), rgba(92, 139, 255, 0.14));
      border: 1px solid rgba(92, 139, 255, 0.28);
      color: #dce7ff;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.04em;
      box-shadow: var(--glow);
    }

    .panel {
      background: var(--panel);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 20px;
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .panel::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(92, 139, 255, 0.08), transparent 35%);
      opacity: 0.7;
      pointer-events: none;
    }
    .panel > * { position: relative; z-index: 1; }

    .section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .section-heading.with-actions { margin-bottom: 0; }
    .muted { color: var(--muted); font-size: 12px; margin: 2px 0 0; }

    /* Loading bar */
    .loading-panel {
      padding: 0;
      border: none;
      background: transparent;
      box-shadow: none;
    }
    .loading-panel::before { display: none; }
    .loading-bar-wrapper {
      display: none;
      padding: 18px 20px;
      gap: 8px;
      border-radius: calc(var(--radius) - 4px);
      background: linear-gradient(135deg, rgba(92, 139, 255, 0.05), rgba(73, 199, 255, 0.05));
      border: 1px solid var(--border-strong);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), var(--glow);
    }
    .loading-bar-wrapper.active {
      display: flex;
      flex-direction: column;
    }
    .loading-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .loading-label {
      font-size: 12px;
      color: #dce7ff;
      letter-spacing: 0.01em;
    }
    .loading-sub {
      font-size: 11px;
      color: var(--muted);
    }
    .loading-bar {
      position: relative;
      width: 100%;
      max-width: 520px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 30px rgba(0, 0, 0, 0.4);
    }
    .loading-bar::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: 999px;
      border: 1px solid rgba(92, 139, 255, 0.3);
      pointer-events: none;
    }
    .loading-inner {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 42%;
      border-radius: 999px;
      background: linear-gradient(120deg, rgba(73, 199, 255, 0.9), rgba(92, 139, 255, 0.95), rgba(73, 199, 255, 0.9));
      background-size: 200% 100%;
      animation: shimmer 1.6s ease-in-out infinite, slide 1.6s ease-in-out infinite;
      box-shadow: 0 0 20px rgba(92, 139, 255, 0.35);
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

    /* Store list */
    .stores {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(240px, 1fr);
      gap: 16px;
      overflow-x: auto;
      padding: 6px 4px 10px;
      margin-top: 4px;
      scrollbar-width: thin;
    }
    .stores::-webkit-scrollbar { height: 8px; }
    .stores::-webkit-scrollbar-thumb {
      background: linear-gradient(135deg, rgba(92, 139, 255, 0.5), rgba(73, 199, 255, 0.35));
      border-radius: 999px;
    }
    .store-card {
      background: linear-gradient(145deg, rgba(22, 27, 38, 0.94), rgba(12, 15, 23, 0.9));
      border-radius: 14px;
      padding: 16px;
      min-width: 220px;
      flex: 0 0 auto;
      border: 1px solid var(--border);
      box-shadow: var(--glow);
      transition: transform 0.2s ease, box-shadow 0.3s ease, border-color 0.2s ease;
    }
    .store-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-strong);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45), var(--glow);
    }
    .store-title { font-weight: 600; margin-bottom: 8px; }

    button {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 9px 14px;
      cursor: pointer;
      margin-right: 8px;
      margin-top: 6px;
      background: linear-gradient(130deg, #5c8bff, #49c7ff);
      color: #0b1020;
      font-size: 13px;
      letter-spacing: 0.01em;
      box-shadow: 0 10px 30px rgba(92, 139, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35);
      transition: transform 0.18s ease, box-shadow 0.25s ease, filter 0.18s ease, opacity 0.2s ease;
    }
    button.secondary {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
      color: #dbe4ff;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 25px rgba(0, 0, 0, 0.35);
    }
    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 16px 40px rgba(92, 139, 255, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.45);
      filter: brightness(1.02);
    }
    button:active { transform: translateY(0); }
    button:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }

    #log {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      white-space: pre-wrap;
      background: linear-gradient(180deg, rgba(12, 15, 23, 0.92), rgba(8, 10, 17, 0.95));
      border-radius: 12px;
      padding: 16px;
      max-height: 320px;
      overflow: auto;
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      color: #dbe4ff;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10px;
      margin-left: 6px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .badge-create { background: linear-gradient(135deg, #0f5132, #0b3f27); color: #8ef1c4; }
    .badge-update { background: linear-gradient(135deg, #1f2738, #141a28); color: #f5e36d; }
    .badge-delete { background: linear-gradient(135deg, #5f1111, #4b0c0c); color: #ffd1d1; }
    .badge-skip   { background: linear-gradient(135deg, #0f1421, #0b101a); color: #a3adbf; }

    .preview-container {
      padding: 0;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .preview-scroll {
      max-height: 420px;
      overflow: auto;
    }

    table.preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      color: #dfe7ff;
      background: transparent;
    }
    table.preview-table thead {
      background: rgba(9, 11, 18, 0.82);
      position: sticky;
      top: 0;
      z-index: 1;
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border-strong);
      box-shadow: 0 2px 14px rgba(0, 0, 0, 0.45);
    }
    table.preview-table th,
    table.preview-table td {
      padding: 12px 14px;
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
    table.preview-table tbody tr {
      transition: background 0.2s ease, transform 0.15s ease;
    }
    table.preview-table tbody tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }
    table.preview-table tbody tr:hover {
      background: linear-gradient(135deg, rgba(92, 139, 255, 0.1), rgba(10, 14, 22, 0.95));
      transform: translateY(-1px);
    }

    .images-cell {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }
    .images-main {
      width: 62px;
      height: 62px;
      border-radius: 10px;
      object-fit: cover;
      background: #111827;
      display: block;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    .images-thumbs {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }
    .images-thumbs img {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      object-fit: cover;
      background: #111827;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    .product-cell-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .product-cell-sku {
      font-size: 11px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .product-cell-tags {
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.4;
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
      padding: 3px 7px;
      border-radius: 999px;
      font-size: 10px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
      color: #cdd7f3;
      margin-right: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .current-values {
      font-size: 11px;
      color: #d9e2ff;
    }
    .current-values > div { margin-bottom: 6px; }

    .checkbox-cell {
      text-align: center;
      vertical-align: middle !important;
      width: 44px;
    }

    .checkbox-cell input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #5c8bff;
      filter: drop-shadow(0 0 6px rgba(92, 139, 255, 0.35));
    }

    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: linear-gradient(90deg, rgba(12, 15, 23, 0.9), rgba(10, 12, 20, 0.92));
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 2;
      backdrop-filter: blur(10px);
    }
    .table-toolbar-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .tab-toggle {
      display: inline-flex;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
      padding: 3px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .tab-toggle button {
      background: transparent;
      color: #9ca8c4;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 11px;
      margin: 0;
      border: none;
      box-shadow: none;
      transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
    }
    .tab-toggle button:hover { color: #dce7ff; }
    .tab-toggle button.active {
      background: linear-gradient(135deg, #5c8bff, #49c7ff);
      color: #0b1020;
      box-shadow: 0 8px 25px rgba(92, 139, 255, 0.35);
      transform: translateY(-1px);
    }
    label { color: #c7d2ea; }
    input[type="checkbox"] { vertical-align: middle; }
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
          <div class="loading-sub">Flux animat cu estimare în timp real</div>
        </div>
        <div class="loading-bar">
          <div class="loading-inner"></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="section-heading">
        <div>
          <h2>Magazin(e)</h2>
          <p class="muted">Alege magazinul pentru care verifici sau sincronizezi produsele.</p>
        </div>
      </div>
      <div id="stores" class="stores"></div>
    </div>

    <div id="preview-wrapper" class="preview-container panel">
      <div class="section-heading with-actions" style="padding: 16px;">
        <div>
          <h2 style="display:flex;align-items:center;gap:8px;">Preview rezultate</h2>
          <p class="muted">Revizuiește și filtrează modificările înainte de sincronizare.</p>
        </div>
      </div>
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <span id="preview-summary">Niciun preview încă.</span>
          <div class="tab-toggle" title="Comută între produsele cu modificări reale și cele fără diferențe reale.">
            <button id="tab-changes" class="active">Cu modificări</button>
            <button id="tab-nochanges">Fără modificări reale</button>
          </div>
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
    const logEl = document.getElementById('log');
    const storesEl = document.getElementById('stores');
    const previewContainer = document.getElementById('preview-results');
    const previewSummaryEl = document.getElementById('preview-summary');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const tabChangesBtn = document.getElementById('tab-changes');
    const tabNoChangesBtn = document.getElementById('tab-nochanges');

    const loadingWrapper = document.getElementById('loading-wrapper');
    const loadingTextEl = document.getElementById('loading-text');

    let currentPreviewItems = [];
    let currentStoreId = null;
    let currentStoreName = '';
    let currentTab = 'changes'; // 'changes' | 'nochanges'
    let selectedKeys = new Set(); // "storeId::internal_product_id"

    function appendLog(text) {
      const ts = new Date().toISOString();
      logEl.textContent = '[' + ts + '] ' + text + '\n' + logEl.textContent;
    }

    function setLoading(isLoading, text) {
      if (isLoading) {
        if (text) {
          loadingTextEl.textContent = text;
        }
        loadingWrapper.classList.add('active');
      } else {
        loadingWrapper.classList.remove('active');
      }
    }

    function badge(action) {
      const a = (action || '').toLowerCase();
      if (a === 'create') return '<span class="badge badge-create">CREATE</span>';
      if (a === 'update') return '<span class="badge badge-update">UPDATE</span>';
      if (a === 'delete') return '<span class="badge badge-delete">DELETE</span>';
      if (a === 'skip')   return '<span class="badge badge-skip">SKIP</span>';
      return '';
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

    async function loadStores() {
      try {
        const res = await fetch('/stores');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        storesEl.innerHTML = '';

        data.forEach(store => {
          const card = document.createElement('div');
          card.className = 'store-card';
          const storeLabel = store.store_name || store.store_id;
          card.innerHTML = `
            <div class="store-title">${storeLabel}</div>
            <button
              data-store-id="${store.store_id}"
              data-store-name="${storeLabel}"
              class="btn-preview"
              title="Verifică ce produse vor fi create sau actualizate pentru acest magazin."
            >Verifică schimbările</button>
            <button
              data-store-id="${store.store_id}"
              data-store-name="${storeLabel}"
              class="btn-sync"
              title="Aplică în Shopify toate modificările selectate pentru acest magazin."
            >Sincronizează produsele</button>
          `;
          storesEl.appendChild(card);
        });

        storesEl.addEventListener('click', async (e) => {
          const btn = e.target;
          if (!(btn instanceof HTMLButtonElement)) return;
          const storeId = btn.getAttribute('data-store-id');
          const storeName = btn.getAttribute('data-store-name') || storeId;
          if (!storeId) return;

          currentStoreId = storeId;
          currentStoreName = storeName;

          if (btn.classList.contains('btn-preview')) {
            await handlePreview(storeId, storeName, btn);
          } else if (btn.classList.contains('btn-sync')) {
            await handleSync(storeId, storeName, btn);
          }
        });

        appendLog('Store-urile au fost încărcate.');
      } catch (err) {
        appendLog('Eroare la loadStores: ' + err.message);
      }
    }

    async function handlePreview(storeId, storeName, btn) {
      try {
        btn.disabled = true;
        setLoading(true, 'Verificăm schimbările pentru magazinul "' + storeName + '"...');
        appendLog('Preview (verificare schimbări) pentru store ' + storeId + '...');
        const res = await fetch('/preview?store_id=' + encodeURIComponent(storeId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        currentPreviewItems = Array.isArray(data) ? data : [];
        currentTab = 'changes';
        tabChangesBtn.classList.add('active');
        tabNoChangesBtn.classList.remove('active');

        renderPreviewTable();
        setLoading(false);
      } catch (err) {
        appendLog('Eroare la preview ' + storeId + ': ' + err.message);
        setLoading(false, '');
      } finally {
        btn.disabled = false;
      }
    }

    async function handleSync(storeId, storeName, btn) {
      try {
        btn.disabled = true;
        setLoading(true, 'Sincronizăm produsele selectate pentru magazinul "' + storeName + '"...');
        appendLog('Sync (sincronizare produse) pentru store ' + storeId + '...');

        // trimitem doar item-urile selectate
        const itemsPayload = [];
        currentPreviewItems.forEach(item => {
          const key = keyForItem(item);
          if (selectedKeys.has(key) && item.hasChanges) {
            itemsPayload.push({
              store_id: item.store_id,
              internal_product_id: item.internal_product_id,
            });
          }
        });

        const res = await fetch('/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            items: itemsPayload,
          }),
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        let html = 'Rezultate sync ' + storeId + ':\n';
        html += 'Processed: ' + (data.processed || 0) + '\n';
        if (Array.isArray(data.results)) {
          data.results.forEach(r => {
            html += '- ' + r.internal_product_id + ' (' + (r.sku || 'fara SKU') + '): ' +
              (r.action || '') + ' -> ' + (r.status || '') +
              (r.error ? ' (error: ' + r.error + ')' : '') + '\n';
          });
        }
        appendLog(html);
        setLoading(false);
      } catch (err) {
        appendLog('Eroare la sync ' + storeId + ': ' + err.message);
        setLoading(false, '');
      } finally {
        btn.disabled = false;
      }
    }

    function renderPreviewTable() {
      const items = currentPreviewItems || [];

      let filtered;
      if (currentTab === 'changes') {
        // doar produse cu modificări reale sau create noi
        filtered = items.filter(it =>
          (it.plannedAction === 'create') ||
          (it.plannedAction === 'update' && it.hasChanges)
        );
      } else {
        // produse care sunt în sheet dar nu au modificări reale
        filtered = items.filter(it =>
          it.plannedAction === 'update' && !it.hasChanges
        );
      }

      previewSummaryEl.textContent =
        filtered.length === 0
          ? 'Nicio intrare pentru acest filtru.'
          : filtered.length + ' produse în lista curentă.';

      const rowsHtml = filtered.map(item => renderRow(item)).join('');

      const tableHtml = `
        <table class="preview-table">
          <thead>
            <tr>
              <th>Poze noi</th>
              <th>Produs nou</th>
              <th>Tag-uri noi</th>
              <th>Acțiune</th>
              <th>Valori curente în Shopify</th>
              <th class="checkbox-cell">
                <!-- select all e sus, în toolbar -->
              </th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      `;

      previewContainer.innerHTML = tableHtml;

      // reatașăm listener-ele de checkbox
      const checkboxes = previewContainer.querySelectorAll('tbody input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
          const key = cb.getAttribute('data-key');
          if (!key) return;
          if (cb.checked) selectedKeys.add(key);
          else selectedKeys.delete(key);
        });
      });

      // actualizăm select-all în funcție de ce e bifat
      const allKeysInView = filtered.map(keyForItem);
      const allSelected =
        allKeysInView.length > 0 &&
        allKeysInView.every(k => selectedKeys.has(k));
      selectAllCheckbox.checked = allSelected;
    }

    function renderRow(item) {
      const key = keyForItem(item);
      const mainImg = (item.preview_image_urls && item.preview_image_urls[0]) || item.image_url || '';
      const thumbImgs = (item.preview_image_urls || []).slice(1, 4);

      const existingThumbs = (item.existing && item.existing.preview_images) || [];

      // ACȚIUNE
      let actionTextMain = '';
      let actionTextSecondary = '';

      if (item.plannedAction === 'create') {
        actionTextMain = badge('create') + ' Produs nou. Se va crea de la 0.';
      } else if (item.plannedAction === 'update') {
        const skuInfo = item.sku ? ' (SKU – ' + escapeHtml(item.sku) + ')' : '';
        const fields = (item.changed_fields || []).filter(f => f !== 'status');
        const fieldsText = fields.length ? fields.join(', ') : 'fără câmpuri modificate';
        actionTextMain = badge('update') + ' Produs existent' + skuInfo + '. Se actualizează: ' + fieldsText + '.';
      } else if (item.plannedAction === 'delete') {
        actionTextMain = badge('delete') + ' Produs marcat pentru ștergere.';
      } else {
        actionTextMain = badge('skip') + ' Intrare ignorată (skip).';
      }

      // VALORI CURENTE ÎN SHOPIFY
      let currentValuesHtml = '';

      if (item.plannedAction === 'create') {
        const storeLabel = escapeHtml(currentStoreName || item.store_id || 'magazin');
        currentValuesHtml = '<div class="current-values">Acest produs nu exista pe <strong>' +
          storeLabel +
          '</strong>. Il vom crea de la 0.</div>';
      } else if (item.plannedAction === 'update') {
        const existing = item.existing || {};
        const fields = (item.changed_fields || []);

        const parts = [];

        if (fields.includes('titlu')) {
          parts.push(
            '<div><span class="pill-label">Titlu actual</span> ' +
            escapeHtml(existing.title || '—') +
            '</div>'
          );
        }

        if (fields.includes('tag-uri')) {
          parts.push(
            '<div><span class="pill-label">Tag-uri actuale</span> ' +
            escapeHtml(existing.tags || '') +
            '</div>'
          );
        }

        if (fields.includes('preț') || fields.includes('preț vechi')) {
          const priceInfo = (existing.variants && existing.variants[0]) || {};
          const priceText = priceInfo.price ? priceInfo.price + ' ' : '';
          const compareText = priceInfo.compare_at_price
            ? '(preț vechi: ' + priceInfo.compare_at_price + ')'
            : '';
          parts.push(
            '<div><span class="pill-label">Preț actual</span> ' +
            escapeHtml(priceText + compareText) +
            '</div>'
          );
        }

        if (fields.includes('poze')) {
          const thumbs = existingThumbs
            .map(src => '<img src="' + src + '" referrerpolicy="no-referrer" />')
            .join('');
          parts.push(
            '<div><span class="pill-label">Poze actuale</span><div class="images-thumbs">' +
            thumbs +
            '</div></div>'
          );
        }

        if (fields.includes('descriere')) {
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

      const checkedAttr = selectedKeys.has(key) ? 'checked' : '';

      return `
        <tr>
          <td>
            <div class="images-cell">
              <img class="images-main" src="${mainImg || ''}" alt="" referrerpolicy="no-referrer" />
              <div class="images-thumbs">
                ${thumbImgs
                  .map(u => '<img src="' + u + '" alt="" referrerpolicy="no-referrer" />')
                  .join('')}
              </div>
            </div>
          </td>
          <td>
            <div class="product-cell-title">${escapeHtml(item.title || item.internal_product_id || '(fără titlu)')}</div>
            <div class="product-cell-sku">SKU: ${escapeHtml(item.sku || 'fără SKU')}</div>
          </td>
          <td>
            <div class="product-cell-tags">${escapeHtml(item.tags_new || '')}</div>
          </td>
          <td>
            <div class="action-main">${actionTextMain}</div>
            ${actionTextSecondary ? '<div class="action-secondary">' + actionTextSecondary + '</div>' : ''}
          </td>
          <td>${currentValuesHtml}</td>
          <td class="checkbox-cell">
            <input
              type="checkbox"
              data-key="${key}"
              ${checkedAttr}
              title="Bifează pentru a include acest produs la sincronizare."
            />
          </td>
        </tr>
      `;
    }

    // tab buttons
    tabChangesBtn.addEventListener('click', () => {
      currentTab = 'changes';
      tabChangesBtn.classList.add('active');
      tabNoChangesBtn.classList.remove('active');
      renderPreviewTable();
    });

    tabNoChangesBtn.addEventListener('click', () => {
      currentTab = 'nochanges';
      tabNoChangesBtn.classList.add('active');
      tabChangesBtn.classList.remove('active');
      renderPreviewTable();
    });

    // select all
    selectAllCheckbox.addEventListener('change', () => {
      const items = currentPreviewItems || [];
      let filtered;
      if (currentTab === 'changes') {
        filtered = items.filter(it =>
          (it.plannedAction === 'create') ||
          (it.plannedAction === 'update' && it.hasChanges)
        );
      } else {
        filtered = items.filter(it =>
          it.plannedAction === 'update' && !it.hasChanges
        );
      }

      const keysInView = filtered.map(keyForItem);
      if (selectAllCheckbox.checked) {
        keysInView.forEach(k => selectedKeys.add(k));
      } else {
        keysInView.forEach(k => selectedKeys.delete(k));
      }
      renderPreviewTable();
    });

    loadStores();
  </script>
</body>
</html>
  `;
}

module.exports = dashboardPage;
