const { getLatestOrders, searchOrders, getTodayOrdersCount } = require('../services/ordersIndexService');
const { backfillAllStores, incrementalSyncAllStores } = require('../jobs/ordersSync');

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
  fetchOrderDetail,
} = require('../lib/shopify');
const {
  buildProductPayload,
  diffProduct,
  determinePlannedActionForRow,
} = require('../lib/mapping');
const { fetchOrders } = require('../services/ordersService');
const { fetchCustomers, getCustomerDetail } = require('../services/customersService');
const {
  normalizeOrderDetail,
} = require('../lib/orderUtils');
const { loadStoresRows } = require('../lib/stores');
// syncLogs job removed - no longer needed for Orders/Customers

const router = express.Router();

// Helper: ia statistici (produse active/draft + comenzi azi/săptămână/lună/an) pentru un magazin Shopify
async function fetchStoreStats(storeId, rawDomain) {
  const shopifyDomain = String(rawDomain || '').trim();

  if (!shopifyDomain) {
    console.warn('[fetchStoreStats] shopifyDomain lipsă pentru store', storeId);
    return {
      active_products: null,
      draft_products: null,
      today_orders: null,
      week_orders: null,
      month_orders: null,
      year_orders: null,
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
      week_orders: null,
      month_orders: null,
      year_orders: null,
      _debug: 'NO_TOKEN:' + envKey,
    };
  }

  const baseUrl = `https://${shopifyDomain}/admin/api/2024-10`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  // date boundaries (UTC) – pentru comenzi
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');

  // azi (00:00 UTC)
  const todayStart = `${yyyy}-${mm}-${dd}T00:00:00Z`;

  // început de săptămână (luni 00:00 UTC)
  const dayOfWeek = now.getUTCDay(); // 0 = duminică
  const diffToMonday = (dayOfWeek + 6) % 7; // 0 pentru luni, 1 pentru marți etc.
  const weekStartDate = new Date(now);
  weekStartDate.setUTCDate(now.getUTCDate() - diffToMonday);
  weekStartDate.setUTCHours(0, 0, 0, 0);
  const wYYYY = weekStartDate.getUTCFullYear();
  const wMM = String(weekStartDate.getUTCMonth() + 1).padStart(2, '0');
  const wDD = String(weekStartDate.getUTCDate()).padStart(2, '0');
  const weekStart = `${wYYYY}-${wMM}-${wDD}T00:00:00Z`;

  // început de lună
  const monthStart = `${yyyy}-${mm}-01T00:00:00Z`;

  // început de an
  const yearStart = `${yyyy}-01-01T00:00:00Z`;

  try {
    const [
      activeRes,
      draftRes,
      todayOrdersRes,
      weekOrdersRes,
      monthOrdersRes,
      yearOrdersRes,
    ] = await Promise.all([
      fetch(`${baseUrl}/products/count.json?status=active`, { headers }),
      fetch(`${baseUrl}/products/count.json?status=draft`, { headers }),
      fetch(
        `${baseUrl}/orders/count.json?status=any&created_at_min=${encodeURIComponent(
          todayStart
        )}`,
        { headers }
      ),
      fetch(
        `${baseUrl}/orders/count.json?status=any&created_at_min=${encodeURIComponent(
          weekStart
        )}`,
        { headers }
      ),
      fetch(
        `${baseUrl}/orders/count.json?status=any&created_at_min=${encodeURIComponent(
          monthStart
        )}`,
        { headers }
      ),
      fetch(
        `${baseUrl}/orders/count.json?status=any&created_at_min=${encodeURIComponent(
          yearStart
        )}`,
        { headers }
      ),
    ]);

    if (
      !activeRes.ok ||
      !draftRes.ok ||
      !todayOrdersRes.ok ||
      !weekOrdersRes.ok ||
      !monthOrdersRes.ok ||
      !yearOrdersRes.ok
    ) {
      const info = {
        activeStatus: activeRes.status,
        draftStatus: draftRes.status,
        todayStatus: todayOrdersRes.status,
        weekStatus: weekOrdersRes.status,
        monthStatus: monthOrdersRes.status,
        yearStatus: yearOrdersRes.status,
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
        week_orders: null,
        month_orders: null,
        year_orders: null,
        _debug: 'HTTP:' + JSON.stringify(info),
      };
    }

    const activeJson = await activeRes.json();
    const draftJson = await draftRes.json();
    const todayJson = await todayOrdersRes.json();
    const weekJson = await weekOrdersRes.json();
    const monthJson = await monthOrdersRes.json();
    const yearJson = await yearOrdersRes.json();

    return {
      active_products: activeJson.count ?? 0,
      draft_products: draftJson.count ?? 0,
      today_orders: todayJson.count ?? 0,
      week_orders: weekJson.count ?? 0,
      month_orders: monthJson.count ?? 0,
      year_orders: yearJson.count ?? 0,
      _debug: null,
    };
  } catch (err) {
    console.error('[fetchStoreStats] Exception pentru store', storeId, err);
    return {
      active_products: null,
      draft_products: null,
      today_orders: null,
      week_orders: null,
      month_orders: null,
      year_orders: null,
      _debug: 'EX:' + String(err.message || err),
    };
  }
}

// Helper: ia comenzile unui magazin Shopify (ultimele X zile, max Y comenzi)
async function fetchStoreOrdersForStore(store, daysBack = 30, limit = 50) {
  const storeId = store.store_id;
  const shopifyDomain = String(store.shopify_domain || '').trim();

  if (!shopifyDomain) {
    console.warn('[fetchStoreOrdersForStore] shopifyDomain lipsă pentru store', storeId);
    return [];
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
      '[fetchStoreOrdersForStore] token lipsă pentru store',
      storeId,
      '(ENV key:',
      envKey + ')'
    );
    return [];
  }

  const baseUrl = `https://${shopifyDomain}/admin/api/2024-10`;
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  // created_at_min = acum - daysBack (UTC)
  const now = new Date();
  const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const yyyy = since.getUTCFullYear();
  const mm = String(since.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(since.getUTCDate()).padStart(2, '0');
  const hh = String(since.getUTCHours()).padStart(2, '0');
  const mi = String(since.getUTCMinutes()).padStart(2, '0');
  const ss = String(since.getUTCSeconds()).padStart(2, '0');
  const createdAtMin = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 250);

  const url =
    `${baseUrl}/orders.json` +
    `?status=any` +
    `&created_at_min=${encodeURIComponent(createdAtMin)}` +
    `&limit=${safeLimit}` +
    `&order=created_at%20desc` +
    `&fields=id,name,order_number,created_at,financial_status,fulfillment_status,total_price,currency,email,phone,` +
    `billing_address,shipping_address,customer,line_items`;

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.error('[fetchStoreOrdersForStore] HTTP error', {
        storeId,
        domain: shopifyDomain,
        status: res.status,
      });
      return [];
    }

    const json = await res.json();
    const orders = json.orders || [];

    // Normalizăm un pic structura ca să fie ușor de folosit în UI
    return orders.map((o) => ({
      // context store
      store_id: storeId,
      store_name: store.store_name || storeId,
      shopify_domain: shopifyDomain,

      // date comandă
      id: o.id,
      name: o.name,
      order_number: o.order_number,
      created_at: o.created_at,
      financial_status: o.financial_status || null,
      fulfillment_status: o.fulfillment_status || null,
      total_price: o.total_price ? parseFloat(o.total_price) : 0,
      currency: o.currency || store.currency || 'RON',

      // client
      customer: o.customer
        ? {
            id: o.customer.id,
            email: o.customer.email || null,
            phone: o.customer.phone || null,
            first_name: o.customer.first_name || '',
            last_name: o.customer.last_name || '',
          }
        : null,

      // adrese
      billing_address: o.billing_address || null,
      shipping_address: o.shipping_address || null,

      // line items (produse)
      line_items: Array.isArray(o.line_items)
        ? o.line_items.map((li) => ({
            id: li.id,
            product_id: li.product_id,
            variant_id: li.variant_id,
            title: li.title,
            sku: li.sku,
            quantity: li.quantity,
            price: li.price ? parseFloat(li.price) : 0,
          }))
        : [],
    }));
  } catch (err) {
    console.error('[fetchStoreOrdersForStore] Exception pentru store', storeId, err);
    return [];
  }
}


// Old Google Sheets logs helper functions removed - no longer needed
// Orders and Customers now use live Shopify data via services/

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
          week_orders: stats.week_orders,
          month_orders: stats.month_orders,
          year_orders: stats.year_orders,
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

// /orders – live Shopify data with filters and pagination
// Query params:
//   store_id = "all" | store id
//   q        = text (order #, customer, product)
//   status   = all | any | open | paid | fulfilled | cancelled
//   limit    = max 250 (default 100)
//   page_info = Shopify cursor for pagination
router.get('/orders', async (req, res) => {
  try {
    const storeIdFilter = req.query.store_id || 'all';
    const q = (req.query.q || '').trim();
    const limit = 100;

    const orders = q
      ? await searchOrders({ store_id: storeIdFilter, q, limit })
      : await getLatestOrders({ store_id: storeIdFilter, limit });

    const totalTodayOrders = await getTodayOrdersCount({ store_id: storeIdFilter });

    res.json({
      orders,
      count: orders.length,
      page: 1,
      limit,
      total: orders.length,
      hasNext: false,
      hasPrev: false,
      nextPageInfo: null,
      prevPageInfo: null,
      totalTodayOrders,
      source: 'POSTGRES_INDEX',
    });
  } catch (err) {
    console.error('/orders error', err);
    res.status(500).json({ error: 'Failed to load orders', message: err.message || String(err) });
  }
});

// /orders/:store_id/:order_id – detalii complete
router.get('/orders/:store_id/:order_id', async (req, res) => {
  const { store_id: storeId, order_id: orderId } = req.params;

  try {
    const stores = await loadStoresRows();
    const store = stores.find((s) => String(s.store_id) === String(storeId));
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const domain = String(store.shopify_domain || '').trim();
    if (!domain) {
      return res
        .status(400)
        .json({ error: 'Missing shopify_domain for store ' + storeId });
    }

    const accessToken = getShopifyAccessTokenForStore(storeId);
    const data = await fetchOrderDetail(domain, accessToken, orderId);
    const detail = data.order;

    if (!detail) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const normalized = normalizeOrderDetail(detail, { ...store, shopify_domain: domain });
    res.json({ order: normalized });
  } catch (err) {
    console.error('/orders detail error', { storeId, orderId, err });
    const status =
      err && err.message && String(err.message).includes('404') ? 404 : 500;
    res.status(status).json({
      error: 'Failed to load order details',
      message: err.message || String(err),
    });
  }
});

// /customers – derived from live Shopify orders
// Query params:
//   store_id = "all" | store id
//   q        = text (name, email, customer id)
//   from/to  = YYYY-MM-DD
//   limit    = max 200 (default 100)
//   page     = page number (default 1)
router.get('/customers', async (req, res) => {
  try {
    const storeIdFilter = req.query.store_id || 'all';
    const searchQuery = (req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const dateFrom = req.query.from || null;
    const dateTo = req.query.to || null;

    console.log('[customers][LIVE]', {
      store: storeIdFilter,
      search: searchQuery,
      from: dateFrom,
      to: dateTo,
      limit,
      page,
    });

    const result = await fetchCustomers({
      store_id: storeIdFilter,
      q: searchQuery,
      from: dateFrom,
      to: dateTo,
      limit,
      page,
    });

    console.log('[customers][LIVE] returned', result.customers.length, 'customers, total:', result.totalCustomers);

    res.json({
      customers: result.customers,
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalCustomers: result.totalCustomers || result.total,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
      source: 'SHOPIFY_LIVE',
    });
  } catch (err) {
    console.error('/customers error', err);
    res.status(500).json({
      error: 'Failed to load customers',
      message: err.message || String(err),
    });
  }
});

// /customers/:store_id/:customer_id – details + order history
router.get('/customers/:store_id/:customer_id', async (req, res) => {
  const { store_id: storeId, customer_id: customerId } = req.params;
  const dateFrom = req.query.from || null;
  const dateTo = req.query.to || null;

  try {
    console.log('[customer-detail][LIVE]', { storeId, customerId, from: dateFrom, to: dateTo });

    const result = await getCustomerDetail(storeId, customerId, {
      from: dateFrom,
      to: dateTo,
    });

    if (!result) {
      return res.status(404).json({ error: 'Customer not found in this store' });
    }

    console.log('[customer-detail][LIVE] found customer with', result.orders.length, 'orders');

    res.json(result);
  } catch (err) {
    console.error('/customers detail error', { storeId, customerId, err });
    res.status(500).json({
      error: 'Failed to load customer details',
      message: err.message || String(err),
    });
  }
});

// POST /tasks/sync-logs endpoint removed - Orders/Customers now use live Shopify data
// No longer needed to sync to Google Sheets logs

// /preview
router.get('/preview', async (req, res) => {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) {
      throw new Error('Missing GOOGLE_SHEETS_ID env var');
    }

    const storeId = req.query.store_id;
    if (!storeId) {
      return res.status(400).json({ error: 'Missingg store_id query param' });
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

function requireTasksSecret(req, res, next) {
  const secret = process.env.TASKS_SECRET;
  if (!secret) return res.status(500).json({ error: 'Missing TASKS_SECRET env var' });

  const got = req.headers['x-tasks-secret'];
  if (!got || got !== secret) return res.status(401).json({ error: 'Unauthorized' });

  next();
}

router.post('/tasks/orders/backfill', requireTasksSecret, async (req, res) => {
  // Respond immediately with 202 Accepted
  res.status(202).json({
    ok: true,
    message: 'Backfill job started in background',
    started_at: new Date().toISOString(),
  });

  // Run backfill in background (non-blocking)
  backfillAllStores()
    .then((summary) => {
      console.log('[backfill] Job completed successfully:', JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('[backfill] Job failed:', err);
    });
});

router.post('/tasks/orders/sync', requireTasksSecret, async (req, res) => {
  // Respond immediately with 202 Accepted
  res.status(202).json({
    ok: true,
    message: 'Incremental sync job started in background',
    started_at: new Date().toISOString(),
  });

  // Run incremental sync in background (non-blocking)
  incrementalSyncAllStores()
    .then((summary) => {
      console.log('[incremental] Job completed successfully:', JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('[incremental] Job failed:', err);
    });
});

module.exports = router;
