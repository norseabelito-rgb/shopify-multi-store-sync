// ui/dashboardPage.js

function getDashboardPageHtml(SCRIPT_TAG) {
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

    .stores { display:flex; flex-wrap:nowrap; gap:16px; margin-bottom:24px; overflow-x:auto; padding-bottom:8px; }
    .store-card { background:#15151a; border-radius:12px; padding:16px; min-width:220px; box-shadow:0 0 0 1px #262635; flex:0 0 auto; }
    .store-title { font-weight:600; margin-bottom:4px; }
    .store-id { font-size:12px; opacity:0.7; margin-bottom:12px; }

    button { border:none; border-radius:8px; padding:8px 12px; cursor:pointer; margin-right:8px; margin-top:4px; background:#2563eb; color:white; font-size:13px; }
    button.secondary { background:#374151; }
    button:disabled { opacity:0.5; cursor:not-allowed; }

    #log { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space:pre-wrap; background:#050509; border-radius:12px; padding:16px; max-height:280px; overflow:auto; border:1px solid #262635; margin-top:24px; }

    .badge { display:inline-block; padding:2px 6px; border-radius:999px; font-size:11px; margin-left:4px; }
    .badge-create { background:#064e3b; color:#a7f3d0; }
    .badge-update { background:#1f2937; color:#facc15; }
    .badge-delete { background:#7f1d1d; color:#fecaca; }
    .badge-skip { background:#111827; color:#9ca3af; }

    .preview-tabs { display:flex; gap:8px; margin-bottom:8px; }
    .preview-tab { background:#111827; color:#e5e7eb; border-radius:999px; padding:6px 12px; font-size:12px; border:none; cursor:pointer; }
    .preview-tab.active { background:#2563eb; color:#f9fafb; }

    .preview-table-wrapper { margin-top:12px; overflow-x:auto; }
    table.preview-table { width:100%; border-collapse:collapse; font-size:12px; }
    .preview-table thead { background:#050509; position:sticky; top:0; z-index:2; }
    .preview-table th, .preview-table td { padding:10px 8px; border-bottom:1px solid #262635; vertical-align:top; }
    .preview-table th { text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.03em; color:#9ca3af; }
    .preview-row:nth-child(even) { background:#0f1015; }
    .preview-row:nth-child(odd) { background:#101016; }

    .img-main { width:64px; height:64px; border-radius:8px; object-fit:cover; background:#1f2937; display:block; margin-bottom:4px; }
    .img-thumbs { display:flex; gap:4px; flex-wrap:wrap; }
    .img-thumb { width:28px; height:28px; border-radius:6px; object-fit:cover; background:#1f2937; }

    .product-title { font-size:13px; font-weight:600; margin-bottom:2px; }
    .product-sku { font-size:11px; color:#9ca3af; margin-bottom:4px; }
    .product-tags { font-size:11px; color:#d1fae5; }

    .existing-title { font-size:13px; font-weight:600; margin-bottom:2px; }
    .existing-tags { font-size:11px; color:#9ca3af; margin-bottom:4px; }
    .existing-imgs { display:flex; gap:4px; flex-wrap:wrap; }
    .existing-thumb { width:28px; height:28px; border-radius:6px; object-fit:cover; background:#1f2937; }

    .action-pill { display:inline-flex; align-items:center; justify-content:center; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; text-transform:uppercase; }
    .action-pill.create { background:#064e3b; color:#a7f3d0; }
    .action-pill.update { background:#1f2937; color:#facc15; }
    .action-pill.delete { background:#7f1d1d; color:#fecaca; }

    .checkbox-cell { text-align:center; vertical-align:middle; }
    .checkbox-cell input[type="checkbox"] { width:16px; height:16px; cursor:pointer; }

    .dimmed { opacity:0.45; }
  </style>
</head>
<body>
  <h1>Shopify Multi-Store Sync</h1>
  <p>Tag folosit de script: <code>${SCRIPT_TAG}</code></p>

  <h2>Magazin(e)</h2>
  <div id="stores" class="stores"></div>

  <h2 style="display:flex;align-items:center;gap:8px;">
    Preview rezultate
    <span id="no-change-count" style="font-size:11px;color:#9ca3af;"></span>
  </h2>
  <div id="preview-results"></div>

  <h2>Log</h2>
  <div id="log">Selectează un magazin și apasă “Preview” sau “Sync”.</div>

  <script>
    const logEl = document.getElementById('log');
    const storesEl = document.getElementById('stores');
    const previewEl = document.getElementById('preview-results');
    const noChangeCountEl = document.getElementById('no-change-count');

    let currentPreviewData = [];
    let selectedKeys = new Set();

    function appendLog(text) {
      const ts = new Date().toISOString();
      logEl.textContent = '[' + ts + '] ' + text + '\\n' + logEl.textContent;
    }

    function actionPill(action) {
      const a = (action || '').toLowerCase();
      if (a === 'create') return '<span class="action-pill create">CREATE</span>';
      if (a === 'update') return '<span class="action-pill update">UPDATE</span>';
      if (a === 'delete') return '<span class="action-pill delete">DELETE</span>';
      return '';
    }

    function productKey(item) {
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
          card.innerHTML = \`
            <div class="store-title">\${store.store_name || store.store_id}</div>
            <div class="store-id">ID: \${store.store_id} · Domeniu: \${store.shopify_domain}</div>
            <button data-store-id="\${store.store_id}" class="btn-preview"
              title="Generează o listă de produse care vor fi create, actualizate sau șterse în acest magazin.">
              Preview
            </button>
            <button data-store-id="\${store.store_id}" class="btn-sync"
              title="Trimite în Shopify modificările selectate pentru acest magazin.">
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

    function renderPreview(data) {
      currentPreviewData = Array.isArray(data) ? data : [];
      selectedKeys = new Set();

      const withChanges = currentPreviewData.filter(i => i.hasChanges !== false);
      const noChanges = currentPreviewData.filter(i => i.hasChanges === false);

      noChangeCountEl.textContent = noChanges.length
        ? '(Produse fără modificări reale: ' + noChanges.length + ')'
        : '';

      previewEl.innerHTML = \`
        <div class="preview-tabs">
          <button class="preview-tab active" data-view="changes"
            title="Arată doar produsele la care există modificări reale față de ce e în Shopify.">
            Cu modificări
          </button>
          <button class="preview-tab" data-view="nochanges"
            title="Arată produsele din sheet care nu schimbă nimic față de valorile actuale din Shopify.">
            Fără modificări
          </button>
        </div>
        <div class="preview-table-wrapper" id="preview-table-container"></div>
      \`;

      const container = document.getElementById('preview-table-container');
      renderPreviewTableInto(container, withChanges, { enableSelection: true });

      const tabs = previewEl.querySelectorAll('.preview-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const view = tab.dataset.view;
          if (view === 'changes') {
            renderPreviewTableInto(container, withChanges, { enableSelection: true });
          } else {
            renderPreviewTableInto(container, noChanges, { enableSelection: false });
          }
        });
      });
    }

    function renderPreviewTableInto(container, rows, options) {
      const enableSelection = options && options.enableSelection;
      const rowsSafe = Array.isArray(rows) ? rows : [];

      const table = document.createElement('table');
      table.className = 'preview-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');

      const thImg = document.createElement('th');
      thImg.textContent = 'Poze noi';

      const thProd = document.createElement('th');
      thProd.textContent = 'Produs nou';

      const thTags = document.createElement('th');
      thTags.textContent = 'Tag-uri noi';

      const thAction = document.createElement('th');
      thAction.textContent = 'Acțiune';

      const thExisting = document.createElement('th');
      thExisting.textContent = 'Valori curente în Shopify';

      const thSelect = document.createElement('th');
      thSelect.style.textAlign = 'center';

      if (enableSelection) {
        const selectAll = document.createElement('input');
        selectAll.type = 'checkbox';
        selectAll.title = 'Selectează sau deselectează toate produsele din listă pentru sincronizare.';
        selectAll.addEventListener('change', () => {
          selectedKeys.clear();
          if (selectAll.checked) {
            rowsSafe.forEach(item => {
              const key = productKey(item);
              selectedKeys.add(key);
            });
          }
          renderPreviewTableInto(container, rowsSafe, { enableSelection: true });
        });
        thSelect.appendChild(selectAll);
      }

      headRow.appendChild(thImg);
      headRow.appendChild(thProd);
      headRow.appendChild(thTags);
      headRow.appendChild(thAction);
      headRow.appendChild(thExisting);
      headRow.appendChild(thSelect);
      thead.appendChild(headRow);

      const tbody = document.createElement('tbody');

      rowsSafe.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'preview-row';

        const key = productKey(item);
        const isSelected = selectedKeys.has(key);

        if (enableSelection && !isSelected) {
          tr.classList.add('dimmed');
        }

        const tdImg = document.createElement('td');
        const imgs = Array.isArray(item.preview_image_urls) ? item.preview_image_urls : [];
        if (imgs.length) {
          const main = document.createElement('img');
          main.className = 'img-main';
          main.src = imgs[0];
          main.alt = item.title || item.internal_product_id || 'product image';
          main.referrerPolicy = 'no-referrer';
          tdImg.appendChild(main);

          if (imgs.length > 1) {
            const thumbsWrap = document.createElement('div');
            thumbsWrap.className = 'img-thumbs';
            imgs.slice(1).forEach(u => {
              const t = document.createElement('img');
              t.className = 'img-thumb';
              t.src = u;
              t.alt = 'thumb';
              t.referrerPolicy = 'no-referrer';
              thumbsWrap.appendChild(t);
            });
            tdImg.appendChild(thumbsWrap);
          }
        } else {
          tdImg.textContent = '—';
        }

        const tdProd = document.createElement('td');
        const titleDiv = document.createElement('div');
        titleDiv.className = 'product-title';
        titleDiv.textContent = item.title || item.internal_product_id || '(fără titlu)';

        const skuDiv = document.createElement('div');
        skuDiv.className = 'product-sku';
        skuDiv.textContent = 'SKU: ' + (item.sku || 'fără SKU');

        const tagsNew = document.createElement('div');
        tagsNew.className = 'product-tags';
        tagsNew.textContent = item.tags_new || '';

        tdProd.appendChild(titleDiv);
        tdProd.appendChild(skuDiv);
        if (item.tags_new) tdProd.appendChild(tagsNew);

        const tdTags = document.createElement('td');
        tdTags.textContent = item.tags_new || '—';

        const tdAction = document.createElement('td');
        const act = (item.plannedAction || '').toLowerCase();
        let actionText = '';

        if (act === 'create') {
          actionText = 'Produs nou. Se va crea de la 0.';
        } else if (act === 'update') {
          const fields = Array.isArray(item.changed_fields) && item.changed_fields.length
            ? item.changed_fields.join(', ')
            : 'datele produsului';
          const existingSku = item.existing && item.existing.sku
            ? item.existing.sku
            : (item.sku || 'fără SKU');
          actionText = 'Produs existent (SKU – ' + existingSku +
                       '). Se actualizează: ' + fields + '.';
        } else if (act === 'delete') {
          const existingSku = item.existing && item.existing.sku
            ? item.existing.sku
            : (item.sku || 'fără SKU');
          actionText = 'Produs existent (SKU – ' + existingSku +
                       '). Se va șterge din Shopify.';
        }

        tdAction.innerHTML =
          actionPill(item.plannedAction) +
          (actionText
            ? '<div style="margin-top:4px;font-size:11px;color:#9ca3af;">' + actionText + '</div>'
            : '');

        const tdExisting = document.createElement('td');
        const ex = item.existing || {};
        if (item.plannedAction === 'create' && !ex.title) {
          tdExisting.innerHTML = '<span style="font-size:11px;color:#9ca3af;">(nu există produs sau este creat nou)</span>';
        } else if (!ex || !ex.title) {
          tdExisting.innerHTML = '<span style="font-size:11px;color:#9ca3af;">(nu s-au putut încărca valorile curente)</span>';
        } else {
          const t = document.createElement('div');
          t.className = 'existing-title';
          t.textContent = ex.title || '';

          const tags = document.createElement('div');
          tags.className = 'existing-tags';
          tags.textContent = ex.tags || '';

          tdExisting.appendChild(t);
          tdExisting.appendChild(tags);

          if (Array.isArray(ex.preview_images) && ex.preview_images.length) {
            const wrap = document.createElement('div');
            wrap.className = 'existing-imgs';
            ex.preview_images.forEach(u => {
              const img = document.createElement('img');
              img.className = 'existing-thumb';
              img.src = u;
              img.alt = 'img veche';
              img.referrerPolicy = 'no-referrer';
              wrap.appendChild(img);
            });
            tdExisting.appendChild(wrap);
          }
        }

        const tdCheck = document.createElement('td');
        tdCheck.className = 'checkbox-cell';
        if (enableSelection) {
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = isSelected;
          cb.title = 'Include acest produs în lista de modificări trimise către Shopify.';
          cb.addEventListener('change', () => {
            if (cb.checked) {
              selectedKeys.add(key);
            } else {
              selectedKeys.delete(key);
            }
            renderPreviewTableInto(container, rowsSafe, { enableSelection: true });
          });
          tdCheck.appendChild(cb);
        } else {
          tdCheck.textContent = '—';
        }

        tr.appendChild(tdImg);
        tr.appendChild(tdProd);
        tr.appendChild(tdTags);
        tr.appendChild(tdAction);
        tr.appendChild(tdExisting);
        tr.appendChild(tdCheck);

        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);

      container.innerHTML = '';
      container.appendChild(table);
    }

    async function handlePreview(storeId, btn) {
      try {
        btn.disabled = true;
        appendLog('Preview pentru store ' + storeId + '...');
        const res = await fetch('/preview?store_id=' + encodeURIComponent(storeId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
          previewEl.innerHTML = '';
          appendLog('Preview ' + storeId + ': nimic de sincronizat.');
          return;
        }

        renderPreview(data);

        let summary = 'Preview pentru ' + storeId + ':\\n';
        data.forEach(item => {
          summary += '- ' + item.internal_product_id + ' (' + (item.sku || 'fără SKU') + '): ' +
            (item.title || '') + ' [' + item.plannedAction + '] - ' +
            (item.reason || '') + (item.hasChanges === false ? ' (fără modificări reale)' : '') + '\\n';
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

        const itemsToSend = [];
        currentPreviewData.forEach(item => {
          const key = productKey(item);
          if (selectedKeys.size === 0) {
            if (item.hasChanges !== false && item.store_id === storeId) {
              itemsToSend.push({
                internal_product_id: item.internal_product_id,
                store_id: item.store_id,
              });
            }
          } else {
            if (selectedKeys.has(key)) {
              itemsToSend.push({
                internal_product_id: item.internal_product_id,
                store_id: item.store_id,
              });
            }
          }
        });

        const res = await fetch('/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: storeId, items: itemsToSend }),
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

module.exports = getDashboardPageHtml;