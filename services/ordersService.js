// services/ordersService.js
// Live Orders (last 100) + Live Search (by order name/number) across stores.
// No full historical fetch. No Google Sheets logs.

const { shopifyGraphQL, fetchOrdersPage, fetchOrdersCount, getShopifyAccessTokenForStore } = require('../lib/shopify');
const { normalizeOrderListEntry, parseDateParam } = require('../lib/orderUtils');
const { loadStoresRows } = require('../lib/stores');

const DEFAULT_LIMIT = 100;

// --- Helpers ---------------------------------------------------------------

function toStoreContext(store) {
  const domain = String(store.shopify_domain || '').trim();
  return {
    store_id: store.store_id,
    store_name: store.store_name || store.store_id,
    shopify_domain: domain,
    currency: store.currency || 'RON',
  };
}

function normalizeStoreOrderList(rawOrders, store) {
  const ctx = toStoreContext(store);
  return (rawOrders || []).map((order) =>
    normalizeOrderListEntry(order, ctx)
  );
}

function buildShopifyOrderNameSearchQuery(qRaw) {
  const q = String(qRaw || '').trim();
  if (!q) return null;

  // user may type "#30000" or "30000"
  const normalized = q.startsWith('#') ? q : `#${q}`;

  // Shopify Admin search query syntax (GraphQL orders query)
  // We'll search by name. This is the safest for "#1234" style order names.
  // Example: name:#30000
  return `name:${normalized}`;
}

function gidToNumericId(gid) {
  // gid://shopify/Order/123456 -> "123456"
  if (!gid) return null;
  const parts = String(gid).split('/');
  return parts[parts.length - 1] || null;
}

// Convert GraphQL order node into a shape that normalizeOrderListEntry expects
function graphqlOrderNodeToRestLike(node) {
  const customerNode = node.customer || null;

  const lineItemsEdges = node.lineItems?.edges || [];
  const line_items = lineItemsEdges.map((e) => ({
    name: e?.node?.name || '',
    quantity: e?.node?.quantity || 0,
  }));

  const totalAmount = node.totalPriceSet?.shopMoney?.amount ?? null;
  const currencyCode = node.totalPriceSet?.shopMoney?.currencyCode ?? node.currencyCode ?? null;

  return {
    id: node.id ? Number(gidToNumericId(node.id)) || gidToNumericId(node.id) : null,
    name: node.name || '',
    order_number: node.orderNumber || null,
    created_at: node.createdAt || null,
    updated_at: node.updatedAt || null,

    // normalizeOrderListEntry expects these REST-like keys
    financial_status: (node.displayFinancialStatus || '').toLowerCase() || null,
    fulfillment_status: (node.displayFulfillmentStatus || '').toLowerCase() || null,

    total_price: totalAmount != null ? String(totalAmount) : null,
    currency: currencyCode || null,

    email: node.email || customerNode?.email || null,
    phone: node.phone || customerNode?.phone || null,

    customer: customerNode
      ? {
          id: customerNode.id ? Number(gidToNumericId(customerNode.id)) || gidToNumericId(customerNode.id) : null,
          email: customerNode.email || null,
          phone: customerNode.phone || null,
          first_name: customerNode.firstName || null,
          last_name: customerNode.lastName || null,
        }
      : null,

    line_items,
  };
}

// --- Core fetchers ---------------------------------------------------------

async function fetchLastOrdersForStore(store, filters = {}) {
  const { from, to, status = 'any', page_info = null } = filters;

  const domain = String(store.shopify_domain || '').trim();
  if (!domain) return { orders: [], nextPageInfo: null, prevPageInfo: null };

  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(store.store_id);
  } catch (err) {
    console.error('[ordersService] Missing access token for store', store.store_id, err.message);
    return { orders: [], nextPageInfo: null, prevPageInfo: null };
  }

  // Base query for REST orders list
  const query = {
    status: status === 'all' ? 'any' : status,
    limit: DEFAULT_LIMIT,
    order: 'created_at desc',
    fields:
      'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,customer,line_items',
  };

  if (from) {
    const fromDate = parseDateParam(from, false);
    if (fromDate) query.created_at_min = fromDate;
  }
  if (to) {
    const toDate = parseDateParam(to, true);
    if (toDate) query.created_at_max = toDate;
  }

  // Shopify REST rule: if page_info is present, most other filters must be omitted.
  // lib/shopify.js already strips them via buildOrdersQuery(), so we can pass it here.
  if (page_info) {
    query.page_info = page_info;
  }

  const { orders: rawOrders, nextPageInfo, prevPageInfo } = await fetchOrdersPage(domain, accessToken, query);

  return {
    orders: normalizeStoreOrderList(rawOrders, store),
    nextPageInfo,
    prevPageInfo,
  };
}

async function searchOrdersInStoreByName(store, searchQuery, filters = {}) {
  // Use GraphQL orders search query (fast, server-side search).
  const domain = String(store.shopify_domain || '').trim();
  if (!domain) return { orders: [], hasNext: false, endCursor: null };

  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(store.store_id);
  } catch (err) {
    console.error('[ordersService] Missing access token for store', store.store_id, err.message);
    return { orders: [], hasNext: false, endCursor: null };
  }

  const gqlQueryString = buildShopifyOrderNameSearchQuery(searchQuery);
  if (!gqlQueryString) return { orders: [], hasNext: false, endCursor: null };

  // Optional: also apply date filters to the GraphQL query string if provided.
  // Shopify supports created_at filters in query strings like: created_at:>=2024-01-01
  // We'll include them only if present.
  const { from, to } = filters;

  let fullQuery = gqlQueryString;
  if (from) {
    const fromIso = parseDateParam(from, false);
    if (fromIso) fullQuery += ` created_at:>=${fromIso.substring(0, 10)}`;
  }
  if (to) {
    const toIso = parseDateParam(to, true);
    if (toIso) fullQuery += ` created_at:<=${toIso.substring(0, 10)}`;
  }

  const gql = `
    query OrdersSearch($first: Int!, $query: String!) {
      orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            orderNumber
            createdAt
            updatedAt
            displayFinancialStatus
            displayFulfillmentStatus
            email
            phone
            totalPriceSet {
              shopMoney { amount currencyCode }
            }
            customer {
              id
              firstName
              lastName
              email
              phone
            }
            lineItems(first: 10) {
              edges { node { name quantity } }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  `;

  const data = await shopifyGraphQL(domain, accessToken, gql, {
    first: DEFAULT_LIMIT,
    query: fullQuery,
  });

  const edges = data?.orders?.edges || [];
  const nodes = edges.map((e) => e.node).filter(Boolean);
  const restLike = nodes.map(graphqlOrderNodeToRestLike);
  const normalized = normalizeStoreOrderList(restLike, store);

  return {
    orders: normalized,
    hasNext: !!data?.orders?.pageInfo?.hasNextPage,
    endCursor: data?.orders?.pageInfo?.endCursor || null,
  };
}

async function getTodayOrdersCount(store) {
  const domain = String(store.shopify_domain || '').trim();
  if (!domain) return 0;

  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(store.store_id);
  } catch {
    return 0;
  }

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const count = await fetchOrdersCount(domain, accessToken, {
    status: 'any',
    created_at_min: todayStart.toISOString(),
    created_at_max: todayEnd.toISOString(),
  });

  return count || 0;
}

// --- Public API ------------------------------------------------------------

async function fetchOrders(filters = {}) {
  const {
    store_id: storeIdFilter = 'all',
    status = 'all',
    q = '',
    from = null,
    to = null,
    page_info = null,
  } = filters;

  const stores = await loadStoresRows();

  const targetStores =
    storeIdFilter === 'all'
      ? stores
      : stores.filter((s) => String(s.store_id) === String(storeIdFilter));

  if (!targetStores.length) {
    return {
      orders: [],
      page: 1,
      limit: DEFAULT_LIMIT,
      total: 0,
      hasNext: false,
      hasPrev: false,
      nextPageInfo: null,
      prevPageInfo: null,
      totalTodayOrders: 0,
    };
  }

  // If search query exists -> run a SEARCH query (server-side) in Shopify
  if (String(q || '').trim()) {
    const perStoreResults = [];

    for (const store of targetStores) {
      try {
        const r = await searchOrdersInStoreByName(store, q, { from, to });
        perStoreResults.push(...r.orders);
      } catch (err) {
        console.error('[ordersService] search failed for store', store.store_id, err.message);
      }
    }

    // Sort combined results (newest first)
    perStoreResults.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });

    // NOTE: We return up to DEFAULT_LIMIT results (100) for UX safety.
    const results = perStoreResults.slice(0, DEFAULT_LIMIT);

    // Today count should still reflect context (store/all)
    let totalTodayOrders = 0;
    for (const store of targetStores) {
      try {
        totalTodayOrders += await getTodayOrdersCount(store);
      } catch {}
    }

    return {
      orders: results,
      page: 1,
      limit: DEFAULT_LIMIT,
      total: results.length,
      hasNext: false,
      hasPrev: false,
      nextPageInfo: null,
      prevPageInfo: null,
      totalTodayOrders,
    };
  }

  // No search: just return the latest 100 orders for context
  if (targetStores.length === 1) {
    const store = targetStores[0];

    const todayCount = await getTodayOrdersCount(store);
    const r = await fetchLastOrdersForStore(store, { from, to, status, page_info });

    return {
      orders: r.orders,
      page: 1,
      limit: DEFAULT_LIMIT,
      total: r.orders.length,
      hasNext: !!r.nextPageInfo,
      hasPrev: !!r.prevPageInfo,
      nextPageInfo: r.nextPageInfo,
      prevPageInfo: r.prevPageInfo,
      totalTodayOrders: todayCount,
    };
  }

  // Multi-store, no search: fetch latest 100 from each store, merge, then keep global 100
  const merged = [];
  let totalTodayOrders = 0;

  for (const store of targetStores) {
    try {
      const r = await fetchLastOrdersForStore(store, { from, to, status, page_info: null });
      merged.push(...r.orders);
    } catch (err) {
      console.error('[ordersService] multi-store fetch failed for', store.store_id, err.message);
    }

    try {
      totalTodayOrders += await getTodayOrdersCount(store);
    } catch {}
  }

  merged.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  const results = merged.slice(0, DEFAULT_LIMIT);

  return {
    orders: results,
    page: 1,
    limit: DEFAULT_LIMIT,
    total: results.length,
    hasNext: false,
    hasPrev: false,
    nextPageInfo: null,
    prevPageInfo: null,
    totalTodayOrders,
  };
}

module.exports = {
  fetchOrders,
  getTodayOrdersCount,
};