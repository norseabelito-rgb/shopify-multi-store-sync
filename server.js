const express = require('express');
const { google } = require('googleapis');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Tag special folosit de script
const SCRIPT_TAG = 'ADAUGAT CU SCRIPT';

// ---------- Google Sheets helper ----------

async function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars');
  }

  const auth = new google.auth.JWT(
    email,
    null,
    key.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

async function loadSheet(spreadsheetId, sheetName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName
  });

  const values = res.data.values || [];
  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = values[0];
  const rows = values.slice(1);

  const objects = rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 };
    headers.forEach((h, i) => {
      obj[h] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });

  return { headers, rows: objects };
}

// ---------- Shopify helpers ----------

function getShopifyAccessTokenForStore(storeId) {
  const envName = `SHOPIFY_ACCESS_TOKEN_${storeId}`;
  const token = process.env[envName];
  if (!token) {
    throw new Error(`Missing env var ${envName} for store_id=${storeId}`);
  }
  return token;
}

async function shopifyGraphQL(storeDomain, accessToken, query, variables = {}) {
  const url = `https://${storeDomain}/admin/api/2024-10/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL error: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (data.errors) {
    console.error('GraphQL errors', data.errors);
    throw new Error('Shopify GraphQL returned errors');
  }
  return data.data;
}

async function shopifyREST(storeDomain, accessToken, path, method = 'GET', body = null) {
  const url = `https://${storeDomain}/admin/api/2024-10${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify REST error: ${method} ${path} -> ${res.status} ${text}`);
  }

  return res.json();
}

// găsește produsul după handle (fallback pentru anumite acțiuni)
async function findProductIdByHandle(storeDomain, accessToken, handle) {
  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        status
        tags
      }
    }
  `;
  const data = await shopifyGraphQL(storeDomain, accessToken, query, { handle });
  return data.productByHandle ? data.productByHandle.id : null;
}

// găsește produs după SKU + tag special + status activ
async function findProductIdBySkuAndTag(storeDomain, accessToken, sku, tag) {
  if (!sku) return null;

  const query = `
    query getVariantBySku($query: String!) {
      productVariants(first: 10, query: $query) {
        edges {
          node {
            id
            sku
            product {
              id
              status
              tags
              title
              handle
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(storeDomain, accessToken, query, {
    query: `sku:${JSON.stringify(sku)}`
  });

  const edges = data.productVariants?.edges || [];
  for (const edge of edges) {
    const v = edge.node;
    if (!v || !v.product) continue;
    const product = v.product;
    const tags = product.tags || [];
    const hasTag = tags.includes(tag);
    const isActive = product.status === 'ACTIVE' || product.status === 'active';

    if (hasTag && isActive) {
      return product.id;
    }
  }

  return null;
}

async function createProductInStore(store, accessToken, productData) {
  const path = '/products.json';
  const body = { product: productData };
  const res = await shopifyREST(store.shopify_domain, accessToken, path, 'POST', body);
  return res.product;
}

async function updateProductInStore(store, accessToken, productId, productData) {
  const numericId = productId.split('/').pop();
  const path = `/products/${numericId}.json`;
  const body = { product: { id: numericId, ...productData } };
  const res = await shopifyREST(store.shopify_domain, accessToken, path, 'PUT', body);
  return res.product;
}

async function deleteProductInStore(store, accessToken, productId) {
  const numericId = productId.split('/').pop();
  const path = `/products/${numericId}.json`;
  await shopifyREST(store.shopify_domain, accessToken, path, 'DELETE');
}

// ---------- Mapping logic ----------

function buildProductPayload(product, store, psRow) {
  const title = psRow.title || product.internal_name || product.master_sku;
  const body_html = psRow.description_html || '';

  // preț
  let price = psRow.price;
  if (!price && product.base_price) {
    const mult = store.price_multiplier ? parseFloat(store.price_multiplier) : 1;
    price = (parseFloat(product.base_price) * mult).toFixed(2);
  }

  const compare_at_price = psRow.compare_at_price || undefined;

  const sku = psRow.store_sku || product.master_sku || product.internal_product_id;

  // tags: din Product_Store override sau din Products, plus tag-ul scriptului
  const baseTagsString = psRow.tags_override || product.tags || '';
  const tagsArray = baseTagsString
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  if (!tagsArray.includes(SCRIPT_TAG)) {
    tagsArray.push(SCRIPT_TAG);
  }

  const tags = tagsArray.join(', ');

  const status = (psRow.status || 'active').toLowerCase(); // active/draft/archived

  const payload = {
    title,
    body_html,
    handle: psRow.handle || undefined,
    status,
    tags,
    metafields_global_title_tag: psRow.seo_title || undefined,
    metafields_global_description_tag: psRow.seo_description || undefined,
    variants: [
      {
        price: price || '0.00',
        compare_at_price: compare_at_price || undefined,
        sku,
        taxable: true
      }
    ]
  };

  return payload;
}

// determină acțiunea reală pe baza sheet-ului + Shopify
async function determinePlannedActionForRow(store, accessToken, product, psRow) {
  const rawAction = (psRow.sync_action || '').toLowerCase();
  const validActions = ['create', 'update', 'delete'];

  if (!validActions.includes(rawAction)) {
    return { plannedAction: 'skip', reason: 'sync_action not in create/update/delete' };
  }

  if (rawAction === 'delete') {
    return { plannedAction: 'delete', reason: 'explicit delete' };
  }

  // pentru create/update vrem logica: dacă există produs cu SKU + tag -> update
  const sku = psRow.store_sku || product.master_sku || product.internal_product_id;

  const existingProductId = await findProductIdBySkuAndTag(
    store.shopify_domain,
    accessToken,
    sku,
    SCRIPT_TAG
  );

  if (existingProductId) {
    return {
      plannedAction: 'update',
      reason: 'existing product found by SKU + script tag',
      existingProductId
    };
  }

  return {
    plannedAction: 'create',
    reason: 'no existing product with SKU + script tag'
  };
}

// ---------- HTML dashboard ----------

app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <title>Shopify Multi-Store Sync</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#0b0b0d; color:#f5f5f5; margin:0; padding:24px; }
    h1 { margin-bottom: 16px; }
    .stores { display:flex; flex-wrap:wrap; gap:16px; margin-bottom:24px; }
    .store-card { background:#15151a; border-radius:12px; padding:16px; min-width:260px; box-shadow:0 0 0 1px #262635; }
    .store-title { font-weight:600; margin-bottom:4px; }
    .store-id { font-size:12px; opacity:0.7; margin-bottom:12px; }
    button { border:none; border-radius:8px; padding:8px 12px; cursor:pointer; margin-right:8px; margin-top:4px; background:#2563eb; color:white; font-size:13px; }
    button.secondary { background:#374151; }
    button:disabled { opacity:0.5; cursor:not-allowed; }
    #log { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space:pre-wrap; background:#050509; border-radius:12px; padding:16px; max-height:400px; overflow:auto; border:1px solid #262635; }
    .badge { display:inline-block; padding:2px 6px; border-radius:999px; font-size:11px; margin-left:4px; }
    .badge-create { background:#064e3b; color:#a7f3d0; }
    .badge-update { background:#1f2937; color:#facc15; }
    .badge-delete { background:#7f1d1d; color:#fecaca; }
    .badge-skip { background:#111827; color:#9ca3af; }
    .result-row { border-bottom:1px solid #262635; padding:6px 0; }
    .result-row:last-child { border-bottom:none; }
  </style>
</head>
<body>
  <h1>Shopify Multi-Store Sync</h1>
  <p>Tag folosit de script: <code>${SCRIPT_TAG}</code></p>
  <div id="stores" class="stores"></div>
  <h2>Log</h2>
  <div id="log">Selectează un magazin și apasă “Preview” sau “Sync”.</div>

  <script>
    const logEl = document.getElementById('log');
    const storesEl = document.getElementById('stores');

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
        }, { once: true });

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

        if (!Array.isArray(data) || data.length === 0) {
          appendLog('Preview ' + storeId + ': nimic de sincronizat.');
          return;
        }

        let html = 'Preview pentru ' + storeId + ':\\n';
        data.forEach(item => {
          html += '- ' + item.internal_product_id + ' (' + (item.sku || 'fara SKU') + '): ' + (item.title || '') + ' ' + '[' + item.plannedAction + ']' + ' - ' + (item.reason || '') + '\\n';
        });

        appendLog(html);
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
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ---------- /stores: listă de magazine ----------

app.get('/stores', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const storesSheet = await loadSheet(spreadsheetId, 'Stores');
    const stores = storesSheet.rows || [];

    const clean = stores.map(s => ({
      store_id: s.store_id,
      store_name: s.store_name,
      shopify_domain: s.shopify_domain,
      currency: s.currency,
      language: s.language
    }));

    res.json(clean);
  } catch (err) {
    console.error('/stores error', err);
    res.status(500).json({ error: 'Failed to load stores', message: err.message });
  }
});

// ---------- /preview: ce s-ar întâmpla fără să scriem în Shopify ----------

app.get('/preview', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const storeId = req.query.store_id;
    if (!storeId) {
      return res.status(400).json({ error: 'Missing store_id query param' });
    }

    const [productsSheet, storesSheet, psSheet] = await Promise.all([
      loadSheet(spreadsheetId, 'Products'),
      loadSheet(spreadsheetId, 'Stores'),
      loadSheet(spreadsheetId, 'Product_Store')
    ]);

    const products = productsSheet.rows;
    const stores = storesSheet.rows;
    const productStoreRows = psSheet.rows;

    const productsById = {};
    products.forEach(p => {
      productsById[p.internal_product_id] = p;
    });

    const store = stores.find(s => s.store_id === storeId);
    if (!store) {
      throw new Error(`No store found with store_id=${storeId}`);
    }

    const accessToken = getShopifyAccessTokenForStore(storeId);

    const validActions = ['create', 'update', 'delete'];

    const rowsForStore = productStoreRows.filter(r => {
      const action = (r.sync_action || '').toLowerCase();
      if (!validActions.includes(action)) return false;
      return r.store_id === storeId;
    });

    const previewResults = [];

    for (const row of rowsForStore) {
      const internalId = row.internal_product_id;
      const product = productsById[internalId];
      if (!product) {
        previewResults.push({
          internal_product_id: internalId,
          store_id: storeId,
          sku: row.store_sku || '',
          title: row.title || '',
          plannedAction: 'skip',
          reason: 'No product found in Products for this internal_product_id'
        });
        continue;
      }

      const classification = await determinePlannedActionForRow(store, accessToken, product, row);
      const sku = row.store_sku || product.master_sku || product.internal_product_id;

      previewResults.push({
        internal_product_id: internalId,
        store_id: storeId,
        sku,
        title: row.title || product.internal_name || '',
        plannedAction: classification.plannedAction,
        reason: classification.reason || ''
      });
    }

    res.json(previewResults);
  } catch (err) {
    console.error('/preview error', err);
    res.status(500).json({ error: 'Preview failed', message: err.message });
  }
});

// ---------- /sync endpoint ----------

app.post('/sync', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const { store_id: filterStoreId, internal_product_id: filterProductId } = req.body || {};

    const [productsSheet, storesSheet, psSheet] = await Promise.all([
      loadSheet(spreadsheetId, 'Products'),
      loadSheet(spreadsheetId, 'Stores'),
      loadSheet(spreadsheetId, 'Product_Store')
    ]);

    const products = productsSheet.rows;
    const stores = storesSheet.rows;
    const productStoreRows = psSheet.rows;

    const productsById = {};
    products.forEach(p => {
      productsById[p.internal_product_id] = p;
    });

    const storesById = {};
    stores.forEach(s => {
      storesById[s.store_id] = s;
    });

    const validActions = ['create', 'update', 'delete'];

    const toProcess = productStoreRows.filter(r => {
      const action = (r.sync_action || '').toLowerCase();
      if (!validActions.includes(action)) return false;
      if (filterStoreId && r.store_id !== filterStoreId) return false;
      if (filterProductId && r.internal_product_id !== filterProductId) return false;
      return true;
    });

    if (toProcess.length === 0) {
      return res.json({ message: 'Nothing to sync', processed: 0, results: [] });
    }

    const results = [];

    for (const row of toProcess) {
      const rawAction = (row.sync_action || '').toLowerCase();
      const internalId = row.internal_product_id;
      const storeId = row.store_id;

      const result = {
        internal_product_id: internalId,
        store_id: storeId,
        action: rawAction,
        status: 'pending',
        error: null,
        sku: row.store_sku || ''
      };

      try {
        const product = productsById[internalId];
        if (!product) {
          throw new Error(`No product found in Products for internal_product_id=${internalId}`);
        }

        const store = storesById[storeId];
        if (!store) {
          throw new Error(`No store found in Stores for store_id=${storeId}`);
        }

        const accessToken = getShopifyAccessTokenForStore(storeId);

        const classification = await determinePlannedActionForRow(store, accessToken, product, row);
        const plannedAction = classification.plannedAction;
        const sku = row.store_sku || product.master_sku || product.internal_product_id;
        result.sku = sku;
        result.action = plannedAction;

        if (plannedAction === 'skip') {
          result.status = 'skipped';
          result.error = classification.reason || 'Skipped by rule';
          results.push(result);
          continue;
        }

        if (plannedAction === 'create') {
          const payload = buildProductPayload(product, store, row);
          const created = await createProductInStore(store, accessToken, payload);
          result.status = 'success';
          result.shopify_product_id = created.id;
        } else if (plannedAction === 'update') {
          let productId = classification.existingProductId;

          // fallback: dacă nu a găsit prin SKU+tag dar avem handle, încercăm și după handle
          if (!productId && row.handle) {
            productId = await findProductIdByHandle(store.shopify_domain, accessToken, row.handle);
          }

          if (!productId) {
            // dacă nici acum nu avem, atunci creăm ca fallback
            const payload = buildProductPayload(product, store, row);
            const created = await createProductInStore(store, accessToken, payload);
            result.status = 'success';
            result.shopify_product_id = created.id;
            result.note = 'No existing product found for update, created new.';
          } else {
            const payload = buildProductPayload(product, store, row);
            const updated = await updateProductInStore(store, accessToken, productId, payload);
            result.status = 'success';
            result.shopify_product_id = updated.id;
          }
        } else if (plannedAction === 'delete') {
          let productId = classification.existingProductId;
          if (!productId && row.handle) {
            productId = await findProductIdByHandle(store.shopify_domain, accessToken, row.handle);
          }

          if (!productId) {
            result.status = 'success';
            result.note = 'Product not found in Shopify, nothing to delete';
          } else {
            await deleteProductInStore(store, accessToken, productId);
            result.status = 'success';
          }
        }

      } catch (err) {
        console.error('Error syncing row', row, err);
        result.status = 'error';
        result.error = err.message || String(err);
      }

      results.push(result);
    }

    return res.json({
      message: 'Sync finished',
      processed: results.length,
      results
    });
  } catch (err) {
    console.error('Fatal /sync error:', err);
    return res.status(500).json({
      error: 'Sync failed',
      message: err.message || String(err)
    });
  }
});

// pornim serverul
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});