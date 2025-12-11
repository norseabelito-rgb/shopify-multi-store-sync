// services/ordersService.js
// Service for fetching and managing orders from Shopify (live queries, no Google Sheets cache)

const { fetchOrdersPage, getShopifyAccessTokenForStore } = require('../lib/shopify');
const { normalizeOrderListEntry, parseDateParam } = require('../lib/orderUtils');
const { loadStoresRows } = require('../lib/stores');

/**
 * Fetch orders for a single store with filters and pagination
 * Returns { orders, nextPageInfo, prevPageInfo, total (approximate) }
 */
async function fetchOrdersForStore(store, filters = {}) {
  const { from, to, status = 'any', limit = 100, page_info = null } = filters;

  const domain = String(store.shopify_domain || '').trim();
  if (!domain) {
    console.warn('[ordersService] Missing shopify_domain for store', store.store_id);
    return { orders: [], nextPageInfo: null, prevPageInfo: null };
  }

  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(store.store_id);
  } catch (err) {
    console.error('[ordersService] Missing access token for store', store.store_id, err.message);
    return { orders: [], nextPageInfo: null, prevPageInfo: null };
  }

  // Build Shopify query parameters
  const query = {
    status: status === 'all' ? 'any' : status,
    limit: Math.min(Math.max(parseInt(limit, 10) || 100, 1), 250),
    order: 'created_at desc',
    fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,billing_address,shipping_address,customer,line_items',
  };

  // Add date filters if provided
  if (from) {
    const fromDate = parseDateParam(from, false);
    if (fromDate) query.created_at_min = fromDate;
  }
  if (to) {
    const toDate = parseDateParam(to, true);
    if (toDate) query.created_at_max = toDate;
  }

  // Add pagination if provided
  if (page_info) {
    query.page_info = page_info;
  }

  try {
    const { orders: rawOrders, nextPageInfo } = await fetchOrdersPage(domain, accessToken, query);

    // Normalize orders
    const normalized = (rawOrders || []).map(order =>
      normalizeOrderListEntry(order, {
        store_id: store.store_id,
        store_name: store.store_name || store.store_id,
        shopify_domain: domain,
        currency: store.currency || order.currency || 'RON',
      })
    );

    return {
      orders: normalized,
      nextPageInfo,
      prevPageInfo: null, // Shopify cursor pagination is forward-only
    };
  } catch (err) {
    console.error('[ordersService] Error fetching orders for store', store.store_id, err.message);
    throw err;
  }
}

/**
 * Fetch orders across multiple stores (or single store) with filters
 * Combines results from multiple stores if store_id = 'all'
 */
async function fetchOrders(filters = {}) {
  const {
    store_id: storeIdFilter = 'all',
    from = null,
    to = null,
    status = 'all',
    q: searchQuery = '',
    limit = 100,
    page_info = null,
  } = filters;

  const stores = await loadStoresRows();

  // Filter stores based on store_id filter
  const targetStores = storeIdFilter === 'all'
    ? stores
    : stores.filter(s => String(s.store_id) === String(storeIdFilter));

  if (targetStores.length === 0) {
    return {
      orders: [],
      page: 1,
      limit: parseInt(limit, 10) || 100,
      total: 0,
      hasNext: false,
      hasPrev: false,
      nextPageInfo: null,
      prevPageInfo: null,
    };
  }

  // For single store: use Shopify pagination directly
  if (targetStores.length === 1) {
    const store = targetStores[0];
    const result = await fetchOrdersForStore(store, { from, to, status, limit, page_info });

    // Apply client-side search filter if needed
    let orders = result.orders;
    if (searchQuery) {
      const needle = searchQuery.toLowerCase();
      orders = orders.filter(order => {
        const haystack = [
          order.name,
          order.customer_name,
          order.customer_email,
          order.items_summary,
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(needle);
      });
    }

    return {
      orders,
      page: 1, // With cursor pagination, page numbers are less meaningful
      limit: parseInt(limit, 10) || 100,
      total: orders.length, // We don't know total without fetching all pages
      hasNext: !!result.nextPageInfo,
      hasPrev: false,
      nextPageInfo: result.nextPageInfo,
      prevPageInfo: null,
    };
  }

  // For multiple stores: fetch from each and combine
  // Note: This doesn't support cross-store pagination perfectly, but works for small datasets
  const allOrders = [];
  for (const store of targetStores) {
    try {
      const result = await fetchOrdersForStore(store, { from, to, status, limit });
      allOrders.push(...result.orders);
    } catch (err) {
      console.error('[ordersService] Failed to fetch orders for store', store.store_id, err.message);
      // Continue with other stores
    }
  }

  // Sort by created_at descending
  allOrders.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  // Apply client-side search filter
  let filtered = allOrders;
  if (searchQuery) {
    const needle = searchQuery.toLowerCase();
    filtered = allOrders.filter(order => {
      const haystack = [
        order.name,
        order.customer_name,
        order.customer_email,
        order.items_summary,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }

  // For multi-store, we don't use Shopify page_info, so return limited results
  const limitNum = parseInt(limit, 10) || 100;
  const sliced = filtered.slice(0, limitNum);

  return {
    orders: sliced,
    page: 1,
    limit: limitNum,
    total: filtered.length,
    hasNext: filtered.length > limitNum,
    hasPrev: false,
    nextPageInfo: null,
    prevPageInfo: null,
  };
}

module.exports = {
  fetchOrders,
  fetchOrdersForStore,
};
