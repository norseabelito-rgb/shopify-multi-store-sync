const express = require('express');
const { google } = require('googleapis');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
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

  // transformăm în obiecte { header: value, _rowIndex: N }
  const objects = rows.map((row, index) => {
    const obj = { _rowIndex: index + 2 }; // linia reală în sheet (1 = header)
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

// găsește produsul după handle (GraphQL productByHandle)
async function findProductIdByHandle(storeDomain, accessToken, handle) {
  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
      }
    }
  `;
  const data = await shopifyGraphQL(storeDomain, accessToken, query, { handle });
  return data.productByHandle ? data.productByHandle.id : null;
}

// create / update / delete

async function createProductInStore(store, accessToken, productData) {
  const path = '/products.json';
  const body = { product: productData };
  const res = await shopifyREST(store.shopify_domain, accessToken, path, 'POST', body);
  return res.product;
}

async function updateProductInStore(store, accessToken, productId, productData) {
  const numericId = productId.split('/').pop(); // din gid://shopify/Product/123456789
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
  // psRow = rând din Product_Store
  // product = rând din Products
  // store = rând din Stores

  // title & body_html
  const title = psRow.title || product.internal_name || product.master_sku;
  const body_html = psRow.description_html || '';

  // price
  let price = psRow.price;
  if (!price && product.base_price) {
    const mult = store.price_multiplier ? parseFloat(store.price_multiplier) : 1;
    price = (parseFloat(product.base_price) * mult).toFixed(2);
  }

  // compare_at_price
  const compare_at_price = psRow.compare_at_price || undefined;

  // sku
  const sku = psRow.store_sku || product.master_sku || product.internal_product_id;

  // tags
  const tags = (psRow.tags_override || product.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .join(', ');

  // status & published
  const status = (psRow.status || 'active').toLowerCase(); // active/draft/archived

  const payload = {
    title,
    body_html,
    handle: psRow.handle || undefined,
    status,
    tags,
    // SEO fields
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

// ---------- /sync endpoint ----------

app.post('/sync', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    // optional filters primite în body: { store_id, internal_product_id }
    const { store_id: filterStoreId, internal_product_id: filterProductId } = req.body || {};

    // 1) citim Sheets
    const [productsSheet, storesSheet, psSheet] = await Promise.all([
      loadSheet(spreadsheetId, 'Products'),
      loadSheet(spreadsheetId, 'Stores'),
      loadSheet(spreadsheetId, 'Product_Store')
    ]);

    const products = productsSheet.rows;
    const stores = storesSheet.rows;
    const productStoreRows = psSheet.rows;

    // mapări rapide
    const productsById = {};
    products.forEach(p => {
      productsById[p.internal_product_id] = p;
    });

    const storesById = {};
    stores.forEach(s => {
      storesById[s.store_id] = s;
    });

    // 2) filtrăm rândurile din Product_Store care au sync_action relevant
    const validActions = ['create', 'update', 'delete'];

    const toProcess = productStoreRows.filter(r => {
      const action = (r.sync_action || '').toLowerCase();
      if (!validActions.includes(action)) return false;
      if (filterStoreId && r.store_id !== filterStoreId) return false;
      if (filterProductId && r.internal_product_id !== filterProductId) return false;
      return true;
    });

    if (toProcess.length === 0) {
      return res.json({ message: 'Nothing to sync', processed: 0 });
    }

    const results = [];

    // 3) procesăm secvențial ca să nu ne batem cu rate limits
    for (const row of toProcess) {
      const action = (row.sync_action || '').toLowerCase();
      const internalId = row.internal_product_id;
      const storeId = row.store_id;

      const result = {
        internal_product_id: internalId,
        store_id: storeId,
        action,
        status: 'pending',
        error: null
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

        if (action === 'create') {
          const payload = buildProductPayload(product, store, row);
          const created = await createProductInStore(store, accessToken, payload);
          result.status = 'success';
          result.shopify_product_id = created.id;
        } else if (action === 'update') {
          const handle = row.handle;
          if (!handle) {
            throw new Error('Cannot update without handle in Product_Store row');
          }
          const productId = await findProductIdByHandle(store.shopify_domain, accessToken, handle);
          if (!productId) {
            throw new Error(`No Shopify product found with handle=${handle}`);
          }
          const payload = buildProductPayload(product, store, row);
          const updated = await updateProductInStore(store, accessToken, productId, payload);
          result.status = 'success';
          result.shopify_product_id = updated.id;
        } else if (action === 'delete') {
          const handle = row.handle;
          if (!handle) {
            throw new Error('Cannot delete without handle in Product_Store row');
          }
          const productId = await findProductIdByHandle(store.shopify_domain, accessToken, handle);
          if (!productId) {
            // dacă nu există deja, o considerăm succes
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

// health check
app.get('/', (req, res) => {
  res.send('Shopify multi-store sync – OK');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});