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
    .stores { display:flex; flex-wrap:wrap; gap:16px; margin-bottom:24px; }
    .store-card { background:#15151a; border-radius:12px; padding:16px; min-width:260px; box-shadow:0 0 0 1px #262635; }
    .store-title { font-weight:600; margin-bottom:4px; }
    .store-id { font-size:12px; opacity:0.7; margin-bottom:12px; }
    button { border:none; border-radius:8px; padding:8px 12px; cursor:pointer; margin-right:8px; margin-top:4px; background:#2563eb; color:white; font-size:13px; }
    button.secondary { background:#374151; }
    button:disabled { opacity:0.5; cursor:not-allowed; }
    #log { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space:pre-wrap; background:#050509; border-radius:12px; padding:16px; max-height:280px; overflow:auto; border:1px solid #262635; }
    .badge { display:inline-block; padding:2px 6px; border-radius:999px; font-size:11px; margin-left:4px; }
    .badge-create { background:#064e3b; color:#a7f3d0; }
    .badge-update { background:#1f2937; color:#facc15; }
    .badge-delete { background:#7f1d1d; color:#fecaca; }
    .badge-skip { background:#111827; color:#9ca3af; }
    .preview-wrapper { margin-top:12px; display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:12px; }
    .preview-card { background:#111118; border-radius:12px; padding:10px; display:flex; gap:10px; align-items:flex-start; box-shadow:0 0 0 1px #262635; }
    .preview-img { width:72px; height:72px; border-radius:8px; object-fit:cover; background:#1f2937; flex-shrink:0; }
    .preview-content { flex:1; min-width:0; }
    .preview-title { font-size:13px; font-weight:600; margin-bottom:2px; }
    .preview-meta { font-size:11px; opacity:0.8; margin-bottom:4px; }
    .preview-reason { font-size:11px; color:#9ca3af; }
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
            <button data-store-id="\${store.store_id}" class="btn-preview">Preview</button>
            <button data-store-id="\${store.store_id}" class="btn-sync">Sync</button>
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

    async function handlePreview(storeId, btn) {
      try {
        btn.disabled = true;
        appendLog('Preview pentru store ' + storeId + '...');
        const res = await fetch('/preview?store_id=' + encodeURIComponent(storeId));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        previewEl.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
          appendLog('Preview ' + storeId + ': nimic de sincronizat.');
          return;
        }

        let summary = 'Preview pentru ' + storeId + ':\\n';
        data.forEach(item => {
          const row = document.createElement('div');
          row.className = 'preview-card';

          const img = document.createElement('img');
          img.className = 'preview-img';
          img.referrerPolicy = 'no-referrer';

          const imgSrc = item.preview_image_url || item.image_url;

          if (imgSrc) {
            img.src = imgSrc;
            img.alt = item.title || item.internal_product_id || 'product image';
          } else {
            img.alt = 'Fără imagine';
          }

          const content = document.createElement('div');
          content.className = 'preview-content';
          const metaSku = item.sku || 'fără SKU';

          let mediaLine = '';
          if (item.media_debug) {
            const md = item.media_debug;
            const st = md.status || 'unknown';
            mediaLine = 'Media: ' + st;
            if (typeof md.count === 'number') {
              mediaLine += ' · count: ' + md.count;
            }
            if (md.media_folder_id) {
              mediaLine += ' · folderId: ' + md.media_folder_id;
            }
            if (item.image_url) {
              mediaLine += ' · <a href="' + item.image_url + '" target="_blank" rel="noopener noreferrer">deschide imagine</a>';
            }
            if (md.error) {
              mediaLine += ' · error: ' + md.error;
            }
          } else if (item.image_url) {
            mediaLine = 'Media: ok · <a href="' + item.image_url + '" target="_blank" rel="noopener noreferrer">deschide imagine</a>';
          } else {
            mediaLine = 'Media: none';
          }

          content.innerHTML = \`
            <div class="preview-title">\${item.title || item.internal_product_id || '(fără titlu)'} \${badge(item.plannedAction)}</div>
            <div class="preview-meta">SKU: \${metaSku}</div>
            <div class="preview-reason">\${item.reason || ''}</div>
            <div class="preview-reason">\${mediaLine}</div>
          \`;

          row.appendChild(img);
          row.appendChild(content);
          previewEl.appendChild(row);

          summary += '- ' + item.internal_product_id + ' (' + metaSku + '): ' + (item.title || '') + ' [' + item.plannedAction + '] - ' + (item.reason || '') + '\\n';
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
        const res = await fetch('/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_id: storeId })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        let html = 'Rezultate sync ' + storeId + ':\\n';
        html += 'Processed: ' + (data.processed || 0) + '\\n';
        if (Array.isArray(data.results)) {
          data.results.forEach(r => {
            html += '- ' + r.internal_product_id + ' (' + (r.sku || 'fara SKU') + '): ' + (r.action || '') + ' -> ' + (r.status || '') + (r.error ? ' (error: ' + r.error + ')' : '') + '\\n';
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