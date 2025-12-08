// ui/dashboardPage.js
function renderDashboard(scriptTag) {
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Shopify Multi-Store Sync</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#0b0b0d; color:#f5f5f5; margin:0; padding:24px; }
    h1 { margin-bottom: 8px; }
    h2 { margin-top: 24px; margin-bottom: 8px; }
    p { margin-top: 4px; margin-bottom: 12px; }

    /* Store cards – o singură linie, scroll orizontal dacă nu încap */
    .stores {
      display:flex;
      flex-wrap:nowrap;
      gap:16px;
      margin-bottom:24px;
      overflow-x:auto;
      padding-bottom:8px;
    }
    .store-card {
      background:#15151a;
      border-radius:12px;
      padding:16px;
      min-width:220px;
      max-width:260px;
      box-shadow:0 0 0 1px #262635;
      flex:0 0 220px;
    }
    .store-title { font-weight:600; margin-bottom:4px; }
    .store-id { font-size:12px; opacity:0.7; margin-bottom:12px; }

    button { border:none; border-radius:8px; padding:8px 12px; cursor:pointer; margin-right:8px; margin-top:4px; background:#2563eb; color:white; font-size:13px; }
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

    .badge { display:inline-block; padding:2px 6px; border-radius:999px; font-size:11px; margin-left:4px; }
    .badge-create { background:#064e3b; color:#a7f3d0; }
    .badge-update { background:#1f2937; color:#facc15; }
    .badge-delete { background:#7f1d1d; color:#fecaca; }
    .badge-skip { background:#111827; color:#9ca3af; }

    .preview-wrapper { margin-top:12px; }

    /* Tabel preview */
    .preview-table {
      width:100%;
      border-collapse:collapse;
      font-size:12px;
      background:#111118;
      border-radius:12px;
      overflow:hidden;
    }
    .preview-table thead {
      background:#181824;
      position:sticky;
      top:0;
      z-index:1;
    }
    .preview-table th,
    .preview-table td {
      padding:8px 10px;
      border-bottom:1px solid #262635;
      vertical-align:middle; /* centrare verticală pentru toate celulele */
    }
    .preview-table th {
      text-align:left;
      font-weight:600;
      font-size:12px;
      color:#e5e7eb;
      white-space:nowrap;
    }
    .preview-table tbody tr:last-child td {
      border-bottom:none;
    }

    .col-images { width:240px; }
    .col-checkbox { width:48px; text-align:center; }

    .preview-img-main {
      width:52px;
      height:52px;
      border-radius:8px;
      object-fit:cover;
      background:#1f2937;
      display:block;
    }

    .thumbs {
      display:flex;
      flex-wrap:wrap;
      gap:4px;
      margin-top:4px;
    }
    .thumb {
      width:32px;
      height:32px;
      border-radius:4px;
      object-fit:cover;
      background:#1f2937;
      display:block;
    }

    .preview-title { font-size:13px; font-weight:600; margin-bottom:2px; }
    .preview-meta { font-size:11px; opacity:0.8; margin-bottom:2px; }
    .preview-tags { font-size:11px; color:#9ca3af; }

    .current-title { font-size:12px; font-weight:500; margin-bottom:2px; }
    .current-tags { font-size:11px; color:#9ca3af; }

    .checkbox-cell {
      text-align:center;
      vertical-align:middle;
    }
    .checkbox-cell input[type="checkbox"] {
      transform:scale(1.1);
      cursor:pointer;
    }

    .action-pill {
      display:inline-flex;
      align-items:center;
      padding:2px 8px;
      border-radius:999px;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:0.03em;
    }
    .action-create { background:#064e3b; color:#a7f3d0; }
    .action-update { background:#1f2937; color:#facc15; }
    .action-delete { background:#7f1d1d; color:#fecaca; }
    .action-skip { background:#111827; color:#9ca3af; }
  </style>
</head>
<body>
  <h1>Shopify Multi-Store Sync</h1>
  <p>Tag folosit de script: <code>${scriptTag}</code></p>

  <h2>Magazin(e)</h2>
  <div id="stores" class="stores"></div>

  <h2>Preview rezultate</h2>
  <div id="preview-results" class="preview-wrapper"></div>

  <h2>Log</h2>
  <div id="log">Selectează un magazin și apasă “Preview” sau “Sync”.</div>

  <script>
    const logEl = document.getElementById('log');
    const storesEl = document.getElementById('stores');
    const previewEl = document.getElementById('preview-results');

    let currentPreview = [];
    let selectedIds = new Set();

    function appendLog(text) {
      const ts = new Date().toISOString();
      logEl.textContent = '[' + ts + '] ' + text + '\\n' + logEl.textContent;
    }

    function badge(action) {
      const a = (action || '').toLowerCase();
      if (a === 'create') return '<span class="badge badge-create">create</span>';
      if (a === 'update') return '<span class="badge badge-update">update</span>';
      if (a === 'delete') return '<span class="badge badge-delete">delete</span>';
      if (a === 'skip') return '<span class="badge badge-skip">skip</span>';
      return '';
    }

    function actionPill(action) {
      const a = (action || '').toLowerCase();
      let cls = 'action-skip';
      let label = a || 'skip';
      if (a === 'create') cls = 'action-create';
      else if (a === 'update') cls = 'action-update';
      else if (a === 'delete') cls = 'action-delete';
      return '<span class="action-pill ' + cls + '">' + label + '</span>';
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
          card.innerHTML = \`
            <div class="store-title">\${store.store_name || store.store_id}</div>
            <div class="store-id">ID: \${store.store_id} · Domeniu: \${store.shopify_domain}</div>
            <button
              data-store-id="\${store.store_id}"
              class="btn-preview"
              title="Arată ce produse vor fi create, actualizate sau șterse, fără să trimiți nimic în Shopify."
            >
              Preview
            </button>
            <button
              data-store-id="\${store.store_id}"
              class="btn-sync"
              title="Trimite în Shopify DOAR produsele bifate în tabelul de mai jos."
            >
              Sync
            </button>
          \`;
          storesEl.appendChild(card);
        });

        storesEl.addEventListener('click', async (e) => {
          const btn = e.target;
          if (!(btn instanceof HTMLButtonElement)) return;
          const storeId = btn.getAttribute('data-store-id');
          if (!storeId) return;

          if (btn.classList.contains('btn-preview')) {
            await handlePreview(storeId, btn);
          } else if (btn.classList.contains('btn-sync')) {
            await handleSync(storeId, btn);
          }
        });

        appendLog('Store-urile au fost încărcate.');
      } catch (err) {
        appendLog('Eroare la loadStores: ' + err.message);
      }
    }

    function renderPreviewTable(data) {
      currentPreview = Array.isArray(data) ? data : [];
      selectedIds = new Set(currentPreview.map(item => item.internal_product_id));

      if (!currentPreview.length) {
        previewEl.innerHTML = '<div style="font-size:13px; opacity:0.8;">Nimic de sincronizat pentru acest magazin.</div>';
        return;
      }

      previewEl.innerHTML = '';
      const table = document.createElement('table');
      table.className = 'preview-table';

      const thead = document.createElement('thead');
      thead.innerHTML = \`
        <tr>
          <th class="col-images">Poze noi</th>
          <th>Produs nou</th>
          <th>Tag-uri noi</th>
          <th>Acțiune</th>
          <th>Valori curente în Shopify</th>
          <th class="checkbox-cell col-checkbox">
            <input
              id="select-all"
              type="checkbox"
              checked
              title="Bifează sau debifează toate produsele din listă."
            />
          </th>
        </tr>
      \`;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');

      currentPreview.forEach((item) => {
        const tr = document.createElement('tr');
        const internalId = item.internal_product_id;

        // col: poze noi
        const tdImg = document.createElement('td');
        tdImg.className = 'col-images';
        const mainSrc = (item.image_urls && item.image_urls[0]) || item.image_url || null;
        if (mainSrc) {
          const mainImg = document.createElement('img');
          mainImg.className = 'preview-img-main';
          mainImg.referrerPolicy = 'no-referrer';
          mainImg.src = item.preview_image_url || ('/media?src=' + encodeURIComponent(mainSrc));
          mainImg.alt = item.title || internalId || 'product image';
          tdImg.appendChild(mainImg);
        } else {
          tdImg.textContent = '—';
        }

        if (item.image_urls && item.image_urls.length > 1) {
          const thumbs = document.createElement('div');
          thumbs.className = 'thumbs';
          item.image_urls.slice(1).forEach((url) => {
            const t = document.createElement('img');
            t.className = 'thumb';
            t.referrerPolicy = 'no-referrer';
            t.src = '/media?src=' + encodeURIComponent(url); // proxy și pentru thumb-uri
            t.alt = 'thumb';
            thumbs.appendChild(t);
          });
          tdImg.appendChild(thumbs);
        }

        // col: titlu + SKU
        const tdTitle = document.createElement('td');
        tdTitle.innerHTML = \`
          <div class="preview-title">\${item.title || item.internal_product_id || '(fără titlu)'}</div>
          <div class="preview-meta">SKU: \${item.sku || 'fără SKU'}</div>
        \`;

        // col: tag-uri noi
        const tdTags = document.createElement('td');
        tdTags.innerHTML = \`
          <div class="preview-tags">\${item.tags || '—'}</div>
        \`;

        // col: create / update / delete
        const tdAction = document.createElement('td');
        tdAction.innerHTML = actionPill(item.plannedAction) + ' ' + (badge(item.plannedAction) || '');

        // col: valori curente în Shopify
        const tdCurrent = document.createElement('td');
        if (item.existing && item.existing.title) {
          const ex = item.existing;
          let html = '<div class="current-title">' + ex.title + '</div>';
          html += '<div class="current-tags">' + (ex.tags || '—') + '</div>';
          tdCurrent.innerHTML = html;

          if (ex.images && ex.images.length) {
            const thumbs = document.createElement('div');
            thumbs.className = 'thumbs';
            ex.images.forEach((url) => {
              const t = document.createElement('img');
              t.className = 'thumb';
              t.referrerPolicy = 'no-referrer';
              t.src = '/media?src=' + encodeURIComponent(url); // proxy și aici
              t.alt = 'shopify image';
              thumbs.appendChild(t);
            });
            tdCurrent.appendChild(thumbs);
          }
        } else {
          tdCurrent.innerHTML = '<span style="font-size:11px; opacity:0.8;">(nu există produs sau este create)</span>';
        }

        // col: checkbox aprobare
        const tdCheck = document.createElement('td');
        tdCheck.className = 'checkbox-cell col-checkbox';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = true;
        chk.dataset.internalId = internalId;
        chk.title = 'Include acest produs în sincronizare.';
        chk.addEventListener('change', () => {
          if (chk.checked) {
            selectedIds.add(internalId);
          } else {
            selectedIds.delete(internalId);
          }
          syncSelectAllCheckboxState();
        });
        tdCheck.appendChild(chk);

        tr.appendChild(tdImg);
        tr.appendChild(tdTitle);
        tr.appendChild(tdTags);
        tr.appendChild(tdAction);
        tr.appendChild(tdCurrent);
        tr.appendChild(tdCheck);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      previewEl.appendChild(table);

      const selectAll = document.getElementById('select-all');
      if (selectAll) {
        selectAll.addEventListener('change', () => {
          const checked = selectAll.checked;
          selectedIds = new Set();
          tbody.querySelectorAll('input[type="checkbox"][data-internal-id]').forEach((chk) => {
            chk.checked = checked;
            if (checked) {
              selectedIds.add(chk.dataset.internalId);
            }
          });
        });
      }
    }

    function syncSelectAllCheckboxState() {
      const selectAll = document.getElementById('select-all');
      if (!selectAll) return;
      if (!currentPreview.length) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
      }
      const total = currentPreview.length;
      const selected = selectedIds.size;
      if (selected === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
      } else if (selected === total) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
      } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
      }
    }

    async function handlePreview(storeId, btn) {
      try {
        btn.disabled = true;
        appendLog('Preview pentru store ' + storeId + '...');
        const res = await fetch('/preview?store_id=' + encodeURIComponent(storeId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          renderPreviewTable([]);
          appendLog('Preview ' + storeId + ': nimic de sincronizat.');
          return;
        }

        renderPreviewTable(data);

        let summary = 'Preview pentru ' + storeId + ':\\n';
        data.forEach(item => {
          summary += '- ' + item.internal_product_id + ' (' + (item.sku || 'fără SKU') + '): ' +
                     (item.title || '') + ' [' + (item.plannedAction || '') + '] - ' +
                     (item.reason || '') + '\\n';
        });

        appendLog(summary);
      } catch (err) {
        appendLog('Eroare la preview ' + storeId + ': ' + err.message);
      } finally {
        btn.disabled = false;
      }
    }

    async function handleSync(storeId, btn) {
      try {
        btn.disabled = true;
        appendLog('Sync pentru store ' + storeId + '...');

        const idsArray = Array.from(selectedIds);
        if (!idsArray.length) {
          appendLog('Nu ai selectat niciun produs pentru sync.');
          return;
        }

        const res = await fetch('/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            internal_product_ids: idsArray
          })
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

    loadStores();
  </script>
</body>
</html>
  `;
}

module.exports = {
  renderDashboard
};