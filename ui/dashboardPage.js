// ui/dashboardPage.js

function dashboardPage() {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Shopify Multi-Store Sync</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:#0b0b0d;
      color:#f5f5f5;
      margin:0;
      padding:24px;
    }
    h1 { margin-bottom: 8px; }
    h2 { margin-top: 24px; margin-bottom: 8px; }
    p  { margin-top: 4px; margin-bottom: 12px; }

    /* Store list: un singur rand, scrollabil orizontal */
    .stores {
      display:flex;
      flex-wrap:nowrap;
      gap:16px;
      margin-bottom:24px;
      overflow-x:auto;
      padding-bottom:8px;
    }
    .stores::-webkit-scrollbar {
      height:6px;
    }
    .stores::-webkit-scrollbar-thumb {
      background:#374151;
      border-radius:999px;
    }
    .store-card {
      background:#15151a;
      border-radius:12px;
      padding:16px;
      min-width:220px;
      box-shadow:0 0 0 1px #262635;
      flex:0 0 auto;
    }
    .store-title { font-weight:600; margin-bottom:4px; }
    .store-id    { font-size:12px; opacity:0.7; margin-bottom:12px; }

    button {
      border:none;
      border-radius:8px;
      padding:8px 12px;
      cursor:pointer;
      margin-right:8px;
      margin-top:4px;
      background:#2563eb;
      color:white;
      font-size:13px;
    }
    button.secondary { background:#374151; }
    button:disabled { opacity:0.5; cursor:not-allowed; }

    #log {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      white-space:pre-wrap;
      background:#050509;
      border-radius:12px;
      padding:16px;
      max-height:280px;
      overflow:auto;
      border:1px solid #262635;
    }

    .badge {
      display:inline-block;
      padding:2px 6px;
      border-radius:999px;
      font-size:10px;
      margin-left:4px;
      text-transform:uppercase;
      letter-spacing:0.04em;
    }
    .badge-create { background:#064e3b; color:#a7f3d0; }
    .badge-update { background:#1f2937; color:#facc15; }
    .badge-delete { background:#7f1d1d; color:#fecaca; }
    .badge-skip   { background:#111827; color:#9ca3af; }

    .preview-container {
      background:#050509;
      border-radius:12px;
      border:1px solid #262635;
      overflow:hidden;
    }

    table.preview-table {
      width:100%;
      border-collapse:collapse;
      font-size:12px;
    }
    table.preview-table thead {
      background:#111118;
      position:sticky;
      top:0;
      z-index:1;
    }
    table.preview-table th,
    table.preview-table td {
      padding:10px 12px;
      vertical-align:top;
      border-bottom:1px solid #15151f;
    }
    table.preview-table th {
      text-align:left;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:0.06em;
      color:#9ca3af;
    }
    table.preview-table tbody tr:nth-child(even) {
      background:#05050d;
    }

    .images-cell {
      display:flex;
      flex-direction:column;
      gap:6px;
    }
    .images-main {
      width:56px;
      height:56px;
      border-radius:8px;
      object-fit:cover;
      background:#1f2937;
      display:block;
    }
    .images-thumbs {
      display:flex;
      gap:4px;
      flex-wrap:wrap;
    }
    .images-thumbs img {
      width:20px;
      height:20px;
      border-radius:4px;
      object-fit:cover;
      background:#1f2937;
    }

    .product-cell-title {
      font-size:12px;
      font-weight:600;
      margin-bottom:2px;
    }
    .product-cell-sku {
      font-size:11px;
      color:#9ca3af;
      margin-bottom:2px;
    }
    .product-cell-tags {
      font-size:11px;
      color:#9ca3af;
    }

    .action-main {
      font-size:11px;
      margin-bottom:4px;
    }
    .action-secondary {
      font-size:11px;
      color:#9ca3af;
    }

    .pill-label {
      display:inline-block;
      padding:2px 6px;
      border-radius:999px;
      font-size:10px;
      background:#111827;
      color:#9ca3af;
      margin-right:6px;
      text-transform:uppercase;
      letter-spacing:0.04em;
    }

    .current-values {
      font-size:11px;
      color:#e5e7eb;
    }
    .current-values > div {
      margin-bottom:4px;
    }

    .checkbox-cell {
      text-align:center;
      vertical-align:middle !important;
      width:32px;
    }

    .checkbox-cell input[type="checkbox"] {
      width:14px;
      height:14px;
      cursor:pointer;
    }

    .table-toolbar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding:8px 12px;
      background:#050509;
      border-bottom:1px solid #262635;
      font-size:12px;
    }
    .table-toolbar-left {
      display:flex;
      align-items:center;
      gap:12px;
    }
    .tab-toggle {
      display:inline-flex;
      border-radius:999px;
      background:#111118;
      padding:2px;
    }
    .tab-toggle button {
      background:transparent;
      color:#9ca3af;
      border-radius:999px;
      padding:4px 10px;
      font-size:11px;
      margin:0;
    }
    .tab-toggle button.active {
      background:#2563eb;
      color:white;
    }
  </style>
</head>
<body>
  <h1>Shopify Multi-Store Sync</h1>
  <p>Tag folosit de script: <code>ADAUGAT CU SCRIPT</code></p>

  <h2>Magazin(e)</h2>
  <div id="stores" class="stores"></div>

  <h2 style="display:flex;align-items:center;gap:8px;">
    Preview rezultate
  </h2>
  <div id="preview-wrapper" class="preview-container">
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <span id="preview-summary">Niciun preview încă.</span>
        <div class="tab-toggle" title="Comută între produsele cu modificări reale și cele fără diferențe reale.">
          <button id="tab-changes" class="active">Cu modificări</button>
          <button id="tab-nochanges">Fără modificări reale</button>
        </div>
      </div>
      <div>
        <label style="font-size:11px;color:#9ca3af;" title="Selectează sau deselectează toate produsele din lista curentă.">
          <input type="checkbox" id="select-all-checkbox" />
          Selectează toate
        </label>
      </div>
    </div>
    <div id="preview-results" style="max-height:360px;overflow:auto;">
      <!-- tabelul se va randa din JS -->
    </div>
  </div>

  <h2>Log</h2>
  <div id="log">Selectează un magazin și apasă “Preview” sau “Sync”.</div>

  <script>
    const logEl = document.getElementById('log');
    const storesEl = document.getElementById('stores');
    const previewContainer = document.getElementById('preview-results');
    const previewSummaryEl = document.getElementById('preview-summary');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const tabChangesBtn = document.getElementById('tab-changes');
    const tabNoChangesBtn = document.getElementById('tab-nochanges');

    let currentPreviewItems = [];
    let currentStoreId = null;
    let currentStoreName = '';
    let currentTab = 'changes'; // 'changes' | 'nochanges'
    let selectedKeys = new Set(); // "storeId::internal_product_id"

    function appendLog(text) {
      const ts = new Date().toISOString();
      logEl.textContent = '[' + ts + '] ' + text + '\\n' + logEl.textContent;
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
          card.innerHTML = \`
            <div class="store-title">\${storeLabel}</div>
            <div class="store-id">ID: \${store.store_id} · Domeniu: \${store.shopify_domain}</div>
            <button
              data-store-id="\${store.store_id}"
              data-store-name="\${storeLabel}"
              class="btn-preview"
              title="Vezi ce produse vor fi create sau actualizate pentru acest magazin."
            >Preview</button>
            <button
              data-store-id="\${store.store_id}"
              data-store-name="\${storeLabel}"
              class="btn-sync"
              title="Aplică în Shopify toate modificările selectate pentru acest magazin."
            >Sync</button>
          \`;
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
        appendLog('Preview pentru store ' + storeId + '...');
        const res = await fetch('/preview?store_id=' + encodeURIComponent(storeId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        currentPreviewItems = Array.isArray(data) ? data : [];
        currentTab = 'changes';
        tabChangesBtn.classList.add('active');
        tabNoChangesBtn.classList.remove('active');

        renderPreviewTable();
      } catch (err) {
        appendLog('Eroare la preview ' + storeId + ': ' + err.message);
      } finally {
        btn.disabled = false;
      }
    }

    async function handleSync(storeId, storeName, btn) {
      try {
        btn.disabled = true;
        appendLog('Sync pentru store ' + storeId + '...');

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

        let html = 'Rezultate sync ' + storeId + ':\\n';
        html += 'Processed: ' + (data.processed || 0) + '\\n';
        if (Array.isArray(data.results)) {
          data.results.forEach(r => {
            html += '- ' + r.internal_product_id + ' (' + (r.sku || 'fara SKU') + '): ' +
              (r.action || '') + ' -> ' + (r.status || '') +
              (r.error ? ' (error: ' + r.error + ')' : '') + '\\n';
          });
        }
        appendLog(html);
      } catch (err) {
        appendLog('Eroare la sync ' + storeId + ': ' + err.message);
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
        // produse care sunt în sheet dar nu au modificări reale (ex: doar status)
        filtered = items.filter(it =>
          it.plannedAction === 'update' && !it.hasChanges
        );
      }

      previewSummaryEl.textContent =
        filtered.length === 0
          ? 'Nicio intrare pentru acest filtru.'
          : filtered.length + ' produse în lista curentă.';

      const rowsHtml = filtered.map(item => renderRow(item)).join('');

      const tableHtml = \`
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
          <tbody>\${rowsHtml}</tbody>
        </table>
      \`;

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

      return \`
        <tr>
          <td>
            <div class="images-cell">
              <img class="images-main" src="\${mainImg || ''}" alt="" referrerpolicy="no-referrer" />
              <div class="images-thumbs">
                \${thumbImgs
                  .map(u => '<img src="' + u + '" alt="" referrerpolicy="no-referrer" />')
                  .join('')}
              </div>
            </div>
          </td>
          <td>
            <div class="product-cell-title">\${escapeHtml(item.title || item.internal_product_id || '(fără titlu)')}</div>
            <div class="product-cell-sku">SKU: \${escapeHtml(item.sku || 'fără SKU')}</div>
          </td>
          <td>
            <div class="product-cell-tags">\${escapeHtml(item.tags_new || '')}</div>
          </td>
          <td>
            <div class="action-main">\${actionTextMain}</div>
            \${actionTextSecondary ? '<div class="action-secondary">' + actionTextSecondary + '</div>' : ''}
          </td>
          <td>\${currentValuesHtml}</td>
          <td class="checkbox-cell">
            <input
              type="checkbox"
              data-key="\${key}"
              \${checkedAttr}
              title="Bifează pentru a include acest produs la Sync."
            />
          </td>
        </tr>
      \`;
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