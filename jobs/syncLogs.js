// jobs/syncLogs.js
// Full sync job: fetch all Shopify orders since 2024-01-01 and persist to Google Sheets logs.
const { fetchAllOrdersPaginated, getShopifyAccessTokenForStore } = require('../lib/shopify');
const { normalizeOrderListEntry, safePrice } = require('../lib/orderUtils');
const { loadStoresRows } = require('../lib/stores');
const {
  upsertOrdersLogRows,
  upsertCustomersLogRows,
  loadOrdersLogSheet,
} = require('../lib/googleLogs');

const SYNC_START_ISO = '2024-01-01T00:00:00Z';
const SYNC_START_DATE = new Date(SYNC_START_ISO);

function buildOrderLogRow(rawOrder, store) {
  const storeWithDomain = { ...store, shopify_domain: (store.shopify_domain || '').trim() };
  const normalized = normalizeOrderListEntry(rawOrder, storeWithDomain);
  return {
    store_id: storeWithDomain.store_id,
    store_name: storeWithDomain.store_name || storeWithDomain.store_id,
    shopify_domain: storeWithDomain.shopify_domain || '',
    order_id: normalized.id,
    order_name: normalized.name,
    order_number: rawOrder.order_number || normalized.order_number || '',
    created_at: normalized.created_at,
    updated_at: rawOrder.updated_at || normalized.created_at,
    financial_status: normalized.financial_status,
    fulfillment_status: normalized.fulfillment_status,
    currency: normalized.currency,
    total_price: normalized.total_price,
    items_count: normalized.items_count,
    items_summary: normalized.items_summary,
    customer_id: normalized.customer_id,
    customer_email: normalized.customer_email,
    customer_name: normalized.customer_name,
    raw_json: JSON.stringify(rawOrder),
  };
}

function buildCustomersFromOrdersLog(orderRows = []) {
  const map = new Map();

  orderRows.forEach((row) => {
    const key =
      (row.customer_id && `${row.store_id}::${row.customer_id}`) ||
      (row.customer_email && `${row.store_id}::${row.customer_email}`);
    if (!key) return;

    const existing = map.get(key) || {
      store_id: row.store_id,
      store_name: row.store_name || row.store_id,
      customer_id: row.customer_id || null,
      customer_email: row.customer_email || null,
      customer_name: row.customer_name || null,
      first_order_date: null,
      last_order_date: null,
      total_orders: 0,
      total_spent: 0,
      currency: row.currency || '',
      created_at: null,
      updated_at: null,
    };

    existing.total_orders += 1;
    const priceNum = safePrice(row.total_price);
    if (!Number.isNaN(priceNum)) {
      existing.total_spent += priceNum;
    }

    const createdAt = row.created_at ? new Date(row.created_at) : null;
    if (createdAt) {
      const iso = createdAt.toISOString();
      if (!existing.first_order_date || createdAt < new Date(existing.first_order_date)) {
        existing.first_order_date = iso;
        existing.created_at = iso;
      }
      if (!existing.last_order_date || createdAt > new Date(existing.last_order_date)) {
        existing.last_order_date = iso;
      }
      existing.updated_at = new Date().toISOString();
    }

    map.set(key, existing);
  });

  return Array.from(map.values());
}

async function fetchAllOrdersForStore(store) {
  const domain = String(store.shopify_domain || '').trim();
  if (!domain) {
    throw new Error('Missing shopify_domain for store');
  }

  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(store.store_id);
  } catch (err) {
    throw new Error(`Missing access token for store: ${err.message || err}`);
  }

  const query = {
    status: 'any',
    limit: 250,
    created_at_min: SYNC_START_ISO,
    order: 'created_at desc',
  };

  const orders = await fetchAllOrdersPaginated(domain, accessToken, query);
  return orders || [];
}

async function syncLogs() {
  const stores = await loadStoresRows();
  const perStore = [];
  const orderRows = [];
  let successfulStores = 0;

  for (const store of stores) {
    try {
      const orders = await fetchAllOrdersForStore(store);
      const filteredOrders = orders.filter((o) => {
        if (!o.created_at) return true;
        const created = new Date(o.created_at);
        if (Number.isNaN(created.getTime())) return true;
        return created >= SYNC_START_DATE;
      });
      const normalizedRows = filteredOrders.map((o) => buildOrderLogRow(o, store));
      orderRows.push(...normalizedRows);
      perStore.push({
        store_id: store.store_id,
        store_name: store.store_name,
        shopify_domain: store.shopify_domain,
        orders_fetched: filteredOrders.length,
      });
      successfulStores += 1;
      console.log(
        `[syncLogs] ${store.store_id} (${store.shopify_domain}) fetched ${filteredOrders.length} orders`
      );
    } catch (err) {
      console.error('[syncLogs] Error fetching orders for store', store.store_id, err);
      perStore.push({
        store_id: store.store_id,
        store_name: store.store_name,
        shopify_domain: store.shopify_domain,
        orders_fetched: 0,
        error: err.message || String(err),
      });
    }
  }

  let ordersWriteResult = { total: 0, updated: 0, appended: 0 };
  if (orderRows.length) {
    ordersWriteResult = await upsertOrdersLogRows(orderRows);
  }

  const ordersSheet = await loadOrdersLogSheet();
  const filteredOrders = (ordersSheet.rows || []).filter((row) => {
    if (!row.created_at) return true;
    const created = new Date(row.created_at);
    if (Number.isNaN(created.getTime())) return true;
    return created >= SYNC_START_DATE;
  });
  const customerRows = buildCustomersFromOrdersLog(filteredOrders);
  const customersWriteResult = customerRows.length
    ? await upsertCustomersLogRows(customerRows)
    : { total: 0, updated: 0, appended: 0 };

  const summary = {
    stores_processed: stores.length,
    per_store: perStore,
    orders_fetched: orderRows.length,
    orders_written: ordersWriteResult.total,
    orders_updated: ordersWriteResult.updated,
    orders_appended: ordersWriteResult.appended,
    customers_written: customersWriteResult.total,
    customers_updated: customersWriteResult.updated,
    customers_appended: customersWriteResult.appended,
    success: successfulStores > 0,
    partial: successfulStores > 0 && perStore.some((s) => s.error),
  };

  console.log('[syncLogs] Sync finished', summary);

  if (!summary.success) {
    const error = new Error('All stores failed to sync');
    error.summary = summary;
    throw error;
  }

  return summary;
}

module.exports = {
  syncLogs,
  buildCustomersFromOrdersLog,
  buildOrderLogRow,
};
