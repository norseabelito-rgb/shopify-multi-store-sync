const { getLatestOrders, searchOrders, getTodayOrdersCount } = require('../services/ordersIndexService');
const { getOrderDetail } = require('../services/ordersDetailService');
const { backfillAllStores, incrementalSyncAllStores } = require('../jobs/ordersSync');
const { runDeploymentVerification } = require('../services/deploymentVerification');
const { getLatestCustomers, searchCustomers, getCustomersCount } = require('../services/customersIndexService');
const { getCustomerDetail: getCustomerDetailFromDB } = require('../services/customersDetailService');
const { backfillAllStores: backfillCustomersAllStores, incrementalSyncAllStores: incrementalSyncCustomersAllStores } = require('../jobs/customersSync');

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

// /orders – DB-first orders with search, filters, and sorting
// Query params:
//   store_id = "all" | store id
//   q        = text (order #, customer, product)
//   limit    = max 250 (default 100)
//   sort_by  = column to sort by (default 'created_at')
//   sort_dir = 'asc' | 'desc' (default 'desc')
router.get('/orders', async (req, res) => {
  try {
    const storeIdFilter = req.query.store_id || 'all';
    const q = (req.query.q || '').trim();
    const limit = 100;
    const sort_by = req.query.sort_by || 'created_at';
    const sort_dir = req.query.sort_dir || 'desc';

    const orders = q
      ? await searchOrders({ store_id: storeIdFilter, q, limit, sort_by, sort_dir })
      : await getLatestOrders({ store_id: storeIdFilter, limit, sort_by, sort_dir });

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

// /orders/:store_id/:order_id – detalii complete din DB (orders_detail)
router.get('/orders/:store_id/:order_id', async (req, res) => {
  const { store_id: storeId, order_id: orderId } = req.params;

  // Defensive guards
  if (!storeId || !orderId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Both store_id and order_id are required'
    });
  }

  if (orderId === 'undefined' || orderId === 'null') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid order_id: ' + orderId
    });
  }

  try {
    // Get store info for context
    const stores = await loadStoresRows();
    const store = stores.find((s) => String(s.store_id) === String(storeId));
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Fetch order detail from database (orders_detail table)
    const orderDetail = await getOrderDetail(storeId, orderId);

    if (!orderDetail) {
      return res.status(404).json({
        error: 'Order not found',
        message: `Order ${orderId} not found in database for store ${storeId}`
      });
    }

    // Add store context to the order
    const enrichedOrder = {
      ...orderDetail,
      store_id: storeId,
      store_name: store.store_name || storeId,
      shopify_domain: store.shopify_domain || '',
    };

    res.json({ order: enrichedOrder });
  } catch (err) {
    console.error('/orders detail error', { storeId, orderId, err });
    res.status(500).json({
      error: 'Failed to load order details',
      message: err.message || String(err),
    });
  }
});

// /customers – read from DB (customers_index)
// Query params:
//   store_id = "all" | store id
//   q        = text (name, email, phone, etc.)
//   limit    = max 2000 (default 1000, no pagination)
//   sort_by  = column to sort by (default 'updated_at')
//   sort_dir = 'asc' | 'desc' (default 'desc')
router.get('/customers', async (req, res) => {
  try {
    const storeIdFilter = req.query.store_id || 'all';
    const searchQuery = (req.query.q || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), 2000);
    const sort_by = req.query.sort_by || 'updated_at';
    const sort_dir = req.query.sort_dir || 'desc';

    console.log('[customers][DB]', {
      store: storeIdFilter,
      search: searchQuery,
      limit,
      sort_by,
      sort_dir,
    });

    // Search or list customers from DB (no pagination, single list)
    const customers = searchQuery
      ? await searchCustomers({ q: searchQuery, store_id: storeIdFilter, limit, sort_by, sort_dir })
      : await getLatestCustomers({ store_id: storeIdFilter, limit, sort_by, sort_dir });

    // Get total count
    const totalCustomers = await getCustomersCount({ q: searchQuery, store_id: storeIdFilter });

    console.log('[customers][DB] returned', customers.length, 'customers, total:', totalCustomers);

    res.json({
      customers,
      count: customers.length,
      totalCustomers,
      source: 'POSTGRES_INDEX',
    });
  } catch (err) {
    console.error('/customers error', err);
    res.status(500).json({
      error: 'Failed to load customers',
      message: err.message || String(err),
    });
  }
});

// /customers/:store_id/:customer_id – complete customer details from DB (customers_detail)
router.get('/customers/:store_id/:customer_id', async (req, res) => {
  const { store_id: storeId, customer_id: customerId } = req.params;

  // Defensive guards
  if (!storeId || !customerId) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Both store_id and customer_id are required'
    });
  }

  if (customerId === 'undefined' || customerId === 'null') {
    return res.status(400).json({
      error: 'Bad request',
      message: 'Invalid customer_id: ' + customerId
    });
  }

  try {
    // Get store info for context
    const stores = await loadStoresRows();
    const store = stores.find((s) => String(s.store_id) === String(storeId));
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Fetch customer detail from database (customers_detail table)
    const customerDetail = await getCustomerDetailFromDB(storeId, customerId);

    if (!customerDetail) {
      return res.status(404).json({
        error: 'Customer not found',
        message: `Customer ${customerId} not found in database for store ${storeId}`
      });
    }

    // Add store context to the customer
    const enrichedCustomer = {
      ...customerDetail,
      store_id: storeId,
      store_name: store.store_name || storeId,
      shopify_domain: store.shopify_domain || '',
    };

    res.json({ customer: enrichedCustomer });
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

router.post('/tasks/customers/backfill', requireTasksSecret, async (req, res) => {
  // Respond immediately with 202 Accepted
  res.status(202).json({
    ok: true,
    message: 'Customers backfill job started in background',
    started_at: new Date().toISOString(),
  });

  // Run backfill in background (non-blocking)
  backfillCustomersAllStores()
    .then((summary) => {
      console.log('[customers-backfill] Job completed successfully:', JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('[customers-backfill] Job failed:', err);
    });
});

router.post('/tasks/customers/sync', requireTasksSecret, async (req, res) => {
  // Respond immediately with 202 Accepted
  res.status(202).json({
    ok: true,
    message: 'Customers incremental sync job started in background',
    started_at: new Date().toISOString(),
  });

  // Run incremental sync in background (non-blocking)
  incrementalSyncCustomersAllStores()
    .then((summary) => {
      console.log('[customers-incremental] Job completed successfully:', JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('[customers-incremental] Job failed:', err);
    });
});

router.post('/tasks/verify', requireTasksSecret, async (req, res) => {
  try {
    const results = await runDeploymentVerification();
    res.json({
      ok: true,
      ...results,
    });
  } catch (err) {
    console.error('[verify] error', err);
    res.status(500).json({
      ok: false,
      error: err.message || String(err),
    });
  }
});

// ==================== DAILY REPORTS ENDPOINTS ====================

const peopleService = require('../services/peopleService');
const dailyReportsIndexService = require('../services/dailyReportsIndexService');
const dailyReportsDetailService = require('../services/dailyReportsDetailService');

// GET /reports/people - Get all people
router.get('/reports/people', async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const searchQuery = req.query.q;

    const people = searchQuery
      ? await peopleService.searchPeople(searchQuery, activeOnly)
      : await peopleService.getAllPeople({ activeOnly });

    console.log(`[reports/people] Returned ${people.length} people`);
    res.json({ people });
  } catch (err) {
    console.error('[reports/people] error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /reports/people - Create new person
router.post('/reports/people', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, role } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'first_name, last_name, and email are required' });
    }

    const person = await peopleService.createPerson({ first_name, last_name, email, phone, role });

    console.log(`[reports/people] Created person: ${person.email}`);
    res.status(201).json({ person });
  } catch (err) {
    console.error('[reports/people] create error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// PUT /reports/people/:id - Update person
router.put('/reports/people/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const person = await peopleService.updatePerson(id, updates);

    console.log(`[reports/people] Updated person: ${id}`);
    res.json({ person });
  } catch (err) {
    console.error('[reports/people] update error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// DELETE /reports/people/:id - Deactivate person
router.delete('/reports/people/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const person = await peopleService.deactivatePerson(id);

    console.log(`[reports/people] Deactivated person: ${id}`);
    res.json({ person });
  } catch (err) {
    console.error('[reports/people] delete error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// GET /reports/daily - Get all reports for a specific date
router.get('/reports/daily', async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date parameter (YYYY-MM-DD) is required' });
    }

    // Get all active people
    const allPeople = await peopleService.getAllPeople({ activeOnly: true });

    // Get reports for this date (includes person info from join)
    const reports = await dailyReportsIndexService.getReportsByDate(date);

    // Get people who submitted
    const submittedPersonIds = new Set(reports.map(r => r.person_id));

    // Find missing people
    const missingPeople = allPeople.filter(p => !submittedPersonIds.has(p.id));

    const result = {
      date,
      people: allPeople,
      reports,
      submitted_count: reports.length,
      missing_people: missingPeople,
      active_people_count: allPeople.length,
    };

    console.log(`[reports/daily] ${date}: ${reports.length}/${allPeople.length} submitted`);
    res.json(result);
  } catch (err) {
    console.error('[reports/daily] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// GET /reports/daily/mine - Get specific person's report for a date
router.get('/reports/daily/mine', async (req, res) => {
  try {
    const { person_id, date } = req.query;

    if (!person_id || !date) {
      return res.status(400).json({ error: 'person_id and date are required' });
    }

    // Get report detail
    const reportDetail = await dailyReportsDetailService.getReportDetailByPersonAndDate(person_id, date);

    if (!reportDetail) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get person info
    const person = await peopleService.getPersonById(person_id);

    console.log(`[reports/daily/mine] ${person?.email} - ${date}`);
    res.json({
      person,
      report: reportDetail.raw_json,
      submitted_at: reportDetail.submitted_at,
      updated_at: reportDetail.updated_at,
    });
  } catch (err) {
    console.error('[reports/daily/mine] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// POST /reports/daily - Submit/update daily report
router.post('/reports/daily', async (req, res) => {
  try {
    const { person_id, date, report } = req.body;

    if (!person_id || !date || !report) {
      return res.status(400).json({ error: 'person_id, date, and report are required' });
    }

    // Verify person exists
    const person = await peopleService.getPersonById(person_id);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check if report already exists
    const existingIndex = await dailyReportsIndexService.getReportIndex(person_id, date);

    // Upsert index entry
    const indexEntry = await dailyReportsIndexService.upsertReportIndex(
      person_id,
      date,
      report,
      existingIndex?.report_id
    );

    // Upsert detail entry
    const detailEntry = await dailyReportsDetailService.upsertReportDetail(
      indexEntry.report_id,
      person_id,
      date,
      report
    );

    console.log(`[reports/daily] ${person.email} submitted report for ${date}`);
    res.json({
      success: true,
      report_id: indexEntry.report_id,
      submitted_at: indexEntry.submitted_at,
      updated_at: indexEntry.updated_at,
    });
  } catch (err) {
    console.error('[reports/daily] submit error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

// GET /reports/calendar - Get calendar stats for a month
router.get('/reports/calendar', async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ error: 'month parameter (YYYY-MM) is required' });
    }

    const stats = await dailyReportsIndexService.getMonthlyCalendarStats(month);

    console.log(`[reports/calendar] ${month}: ${stats.length} days`);
    res.json({ month, stats });
  } catch (err) {
    console.error('[reports/calendar] error', err);
    res.status(400).json({ error: err.message || String(err) });
  }
});

module.exports = router;
