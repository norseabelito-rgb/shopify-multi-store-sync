// routes/api.js
const express = require('express');
const fetch = require('node-fetch');

const { loadSheet } = require('../lib/google');
const { extractDriveFolderId, getImageUrlsFromDriveFolder } = require('../lib/drive');
const {
  getShopifyAccessTokenForStore,
  findProductIdByHandle,
  getProductByGid,
  createProductInStore,
  updateProductInStore,
  deleteProductInStore,
} = require('../lib/shopify');
const {
  buildProductPayload,
  diffProduct,
  determinePlannedActionForRow,
} = require('../lib/mapping');

const router = express.Router();

// Helper: ia statistici (produse active/draft + comenzi azi) pentru un magazin Shopify
async function fetchStoreStats(storeId, rawDomain) {
  const shopifyDomain = String(rawDomain || '').trim();

  if (!shopifyDomain) {
    console.warn('[fetchStoreStats] shopifyDomain lipsă pentru store', storeId);
    return {
      active_products: null,
      draft_products: null,
      today_orders: null,
      _debug: 'NO_DOMAIN',
    };
  }

  // token-ul îl luăm din ENV, ex: SHOPIFY_TOKEN_BF24H
  const envKey =
    'SHOPIFY_TOKEN_' +
    String(storeId || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_');

  const accessToken = process.env[envKey];

  if (!accessToken) {
    console.warn(
      '[fetchStoreStats] token lipsă pentru store',
      storeId,
      '(ENV key:',
      envKey + ')'
    );
    return {
      active_products: null,
      draft_products: null,
      today_orders: null,
      _debug: 'NO_TOKEN:' + envKey,
    };
  }

  const baseUrl = `https://${shopifyDomain}/admin/api/2024-10`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  // începutul zilei curente în UTC — pentru "comenzi azi"
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const todayStart = `${yyyy}-${mm}-${dd}T00:00:00Z`;

  try {
    const [activeRes, draftRes, ordersRes] = await Promise.all([
      fetch(`${baseUrl}/products/count.json?status=active`, { headers }),
      fetch(`${baseUrl}/products/count.json?status=draft`, { headers }),
      fetch(
        `${baseUrl}/orders/count.json?status=any&created_at_min=${encodeURIComponent(
          todayStart
        )}`,
        { headers }
      ),
    ]);

    if (!activeRes.ok || !draftRes.ok || !ordersRes.ok) {
      const info = {
        activeStatus: activeRes.status,
        draftStatus: draftRes.status,
        ordersStatus: ordersRes.status,
      };
      console.error('[fetchStoreStats] HTTP error', {
        storeId,
        domain: shopifyDomain,
        ...info,
      });
      return {
        active_products: null,
        draft_products: null,
        today_orders: null,
        _debug: 'HTTP:' + JSON.stringify(info),
      };
    }

    const activeJson = await activeRes.json();
    const draftJson = await draftRes.json();
    const ordersJson = await ordersRes.json();

    return {
      active_products: activeJson.count ?? 0,
      draft_products: draftJson.count ?? 0,
      today_orders: ordersJson.count ?? 0,
      _debug: null,
    };
  } catch (err) {
    console.error('[fetchStoreStats] Exception pentru store', storeId, err);
    return {
      active_products: null,
      draft_products: null,
      today_orders: null,
      _debug: 'EX:' + String(err.message || err),
    };
  }
}

// /stores
router.get('/stores', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const storesSheet = await loadSheet(spreadsheetId, 'Stores');
    const stores = storesSheet.rows || [];

    const enriched = await Promise.all(
      stores.map(async (s) => {
        const cleanDomain = (s.shopify_domain || '').trim();

        const stats = await fetchStoreStats(s.store_id, cleanDomain);

        return {
          store_id: s.store_id,
          store_name: s.store_name,
          shopify_domain: cleanDomain,
          currency: s.currency,
          language: s.language,
          active_products: stats.active_products,
          draft_products: stats.draft_products,
          today_orders: stats.today_orders,
          _debug: stats._debug || null,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('/stores error', err);
    res
      .status(500)
      .json({ error: 'Failed to load stores', message: err.message });
  }
});

// /preview
router.get('/preview', async (req, res) => {
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
      loadSheet(spreadsheetId, 'Product_Store'),
    ]);

    const products = productsSheet.rows;
    const stores = storesSheet.rows;
    const productStoreRows = psSheet.rows;

    const productsById = {};
    products.forEach((p) => {
      productsById[p.internal_product_id] = p;
    });

    const store = stores.find((s) => s.store_id === storeId);
    if (!store) {
      throw new Error(`No store found with store_id=${storeId}`);
    }

    const accessToken = getShopifyAccessTokenForStore(storeId);

    const validActions = ['create', 'update', 'delete'];

    const rowsForStore = productStoreRows.filter((r) => {
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
          reason: 'No product found in Products for this internal_product_id',
          image_url: null,
          hasChanges: false,
        });
        continue;
      }

      const classification = await determinePlannedActionForRow(store, accessToken, product, row);
      const sku = row.store_sku || product.master_sku || product.internal_product_id;

      let imageUrls = [];
      let imageUrl = null;
      let mediaDebug = null;

      if (product.media_folder_url) {
        const folderId = extractDriveFolderId(product.media_folder_url);
        mediaDebug = {
          media_folder_url: product.media_folder_url,
          media_folder_id: folderId || null,
          status: 'pending',
          count: 0,
        };

        try {
          imageUrls = await getImageUrlsFromDriveFolder(product.media_folder_url, 10);
          imageUrl = imageUrls[0] || null;
          mediaDebug.count = imageUrls.length;

          if (imageUrl) {
            mediaDebug.status = 'ok';
          } else {
            mediaDebug.status = 'no_images_found';
          }
        } catch (e) {
          console.error('Error getting images for product', internalId, e.message);
          mediaDebug.status = 'error';
          mediaDebug.error = e.message;
        }
      }

      const previewImageUrls = Array.isArray(imageUrls)
        ? imageUrls.map((u) => `/media?src=${encodeURIComponent(u)}`)
        : [];

      const plannedAction = classification.plannedAction;
      let hasChanges = true;
      let changedFields = [];
      let existingSummary = {};

      if (plannedAction === 'update') {
        let productId = classification.existingProductId;
        if (!productId && row.handle) {
          productId = await findProductIdByHandle(store.shopify_domain, accessToken, row.handle);
        }

        if (productId) {
          const existing = await getProductByGid(store.shopify_domain, accessToken, productId);
          const newPayload = buildProductPayload(product, store, row, imageUrls);

          const diff = diffProduct(existing, newPayload);

          // AICI e modificarea importantă:
          // - pentru UI folosim doar schimbări "reale" (exclude doar-status)
          hasChanges = diff.hasRealChanges;
          changedFields = diff.changedFields;

          existingSummary = {
            title: existing.title || '',
            sku:
              (existing.variants &&
                existing.variants[0] &&
                existing.variants[0].sku) ||
              '',
            tags: existing.tags || '',
            images: (existing.images || []).map((img) => img.src),
            preview_images: (existing.images || []).map((img) =>
              `/media?src=${encodeURIComponent(img.src)}`
            ),
          };
        } else {
          hasChanges = true;
          changedFields = ['creare (fallback)'];
        }
      } else if (plannedAction === 'create') {
        hasChanges = true;
        changedFields = ['create'];
        existingSummary = {
          title: '',
          sku: '',
          tags: '',
          images: [],
          preview_images: [],
        };
      } else if (plannedAction === 'delete') {
        hasChanges = true;
        changedFields = ['delete'];
      }

      const tmpPayload = buildProductPayload(product, store, row, []);
      const tagsNew = tmpPayload.tags;

      previewResults.push({
        internal_product_id: internalId,
        store_id: storeId,
        sku,
        title: row.title || product.internal_name || '',
        tags_new: tagsNew,
        plannedAction,
        reason: classification.reason || '',
        image_url: imageUrl,
        preview_image_urls: previewImageUrls,
        image_urls: imageUrls,
        media_debug: mediaDebug,
        hasChanges,
        changed_fields: changedFields,
        existing: existingSummary,
      });
    }

    res.json(previewResults);
  } catch (err) {
    console.error('/preview error', err);
    res.status(500).json({ error: 'Preview failed', message: err.message });
  }
});

// /sync
router.post('/sync', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const { store_id: filterStoreId, internal_product_id: filterProductId, items } = req.body || {};

    const [productsSheet, storesSheet, psSheet] = await Promise.all([
      loadSheet(spreadsheetId, 'Products'),
      loadSheet(spreadsheetId, 'Stores'),
      loadSheet(spreadsheetId, 'Product_Store'),
    ]);

    const products = productsSheet.rows;
    const stores = storesSheet.rows;
    const productStoreRows = psSheet.rows;

    const productsById = {};
    products.forEach((p) => {
      productsById[p.internal_product_id] = p;
    });

    const storesById = {};
    stores.forEach((s) => {
      storesById[s.store_id] = s;
    });

    const validActions = ['create', 'update', 'delete'];

    const selectedSet = new Set(
      Array.isArray(items)
        ? items.map(
            (it) => (it.store_id || filterStoreId || '') + '::' + (it.internal_product_id || '')
          )
        : []
    );

    const toProcess = productStoreRows.filter((r) => {
      const action = (r.sync_action || '').toLowerCase();
      if (!validActions.includes(action)) return false;
      if (filterStoreId && r.store_id !== filterStoreId) return false;
      if (filterProductId && r.internal_product_id !== filterProductId) return false;
      if (selectedSet.size) {
        const key = (r.store_id || '') + '::' + (r.internal_product_id || '');
        if (!selectedSet.has(key)) return false;
      }
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
        sku: row.store_sku || '',
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

        const classification = await determinePlannedActionForRow(
          store,
          accessToken,
          product,
          row
        );
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
          let imageUrls = [];
          if (product.media_folder_url) {
            try {
              imageUrls = await getImageUrlsFromDriveFolder(product.media_folder_url, 10);
            } catch (e) {
              console.error(
                'Error getting images for product during create',
                internalId,
                e.message
              );
            }
          }

          const payload = buildProductPayload(product, store, row, imageUrls);
          const created = await createProductInStore(store, accessToken, payload);
          result.status = 'success';
          result.shopify_product_id = created.id;
        } else if (plannedAction === 'update') {
          let productId = classification.existingProductId;

          if (!productId && row.handle) {
            productId = await findProductIdByHandle(store.shopify_domain, accessToken, row.handle);
          }

          if (!productId) {
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
        result.error = err.message;
      }

      results.push(result);
    }

    return res.json({
      message: 'Sync finished',
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error('Fatal /sync error:', err);
    return res.status(500).json({
      error: 'Sync failed',
      message: err.message || String(err),
    });
  }
});

// /media – proxy pentru Drive
router.get('/media', async (req, res) => {
  const src = req.query.src;
  if (!src) {
    return res.status(400).send('Missing src param');
  }

  try {
    const upstream = await fetch(src);
    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).send(text);
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    upstream.body.pipe(res);
  } catch (err) {
    console.error('Error in /media proxy', err);
    res.status(500).send('Media proxy error');
  }
});

module.exports = router;