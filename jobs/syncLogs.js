// jobs/syncLogs.js
// Full sync job: fetch all Shopify orders since 2024-01-01 and persist to Google Sheets logs.
const { fetchOrdersPage, getShopifyAccessTokenForStore } = require('../lib/shopify');
const { normalizeOrderListEntry, safePrice } = require('../lib/orderUtils');
const { loadStoresRows } = require('../lib/stores');
const {
  upsertOrdersLogBatch,
  upsertCustomersLogRows,
  loadOrdersLogSheet,
  loadCustomersLogSheet,
  buildOrderKey,
  buildCustomerKey,
  buildIndex,
} = require('../lib/googleLogs');

const SYNC_START_ISO = '2024-01-01T00:00:00Z';
const SYNC_START_DATE = new Date(SYNC_START_ISO);
const ORDER_BATCH_SIZE = 250;
const CUSTOMER_BATCH_SIZE = 300;

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

async function processOrdersForStore(store, orderIndexInfo) {
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

  let pageInfo = null;
  let isFirstPage = true;
  let totalProcessed = 0;
  let ordersUpdated = 0;
  let ordersAppended = 0;

  while (true) {
    const query = isFirstPage
      ? {
          status: 'any',
          limit: ORDER_BATCH_SIZE,
          created_at_min: SYNC_START_ISO,
          order: 'created_at desc',
        }
      : {
          limit: ORDER_BATCH_SIZE,
          page_info: pageInfo,
        };

    const { orders, nextPageInfo } = await fetchOrdersPage(domain, accessToken, query);
    const pageOrders = orders || [];

    if (!pageOrders.length) break;

    const filteredOrders = pageOrders.filter((o) => {
      if (!o.created_at) return true;
      const created = new Date(o.created_at);
      if (Number.isNaN(created.getTime())) return true;
      return created >= SYNC_START_DATE;
    });

    const normalizedRows = filteredOrders.map((o) => buildOrderLogRow(o, store));
    if (normalizedRows.length) {
      const writeResult = await upsertOrdersLogBatch(normalizedRows, orderIndexInfo);
      orderIndexInfo = writeResult.indexInfo;
      ordersUpdated += writeResult.updated;
      ordersAppended += writeResult.appended;
      totalProcessed += normalizedRows.length;
      console.log('[syncLogs] Processed batch of', normalizedRows.length, 'orders');
    }

    if (!nextPageInfo) break;
    pageInfo = nextPageInfo;
    isFirstPage = false;

    const oldestInBatch = filteredOrders[filteredOrders.length - 1];
    if (oldestInBatch && oldestInBatch.created_at) {
      const created = new Date(oldestInBatch.created_at);
      if (!Number.isNaN(created.getTime()) && created < SYNC_START_DATE) {
        break;
      }
    }
  }

  return { totalProcessed, ordersUpdated, ordersAppended, orderIndexInfo };
}

async function syncLogs() {
  console.log('[syncLogs] Starting syncLogs job');
  try {
    const stores = await loadStoresRows();
    console.log('[syncLogs] Loaded stores rows:', stores.length);
    const perStore = [];
    let successfulStores = 0;
    let ordersWrittenTotal = 0;
    let ordersUpdatedTotal = 0;
    let ordersAppendedTotal = 0;

    const existingOrdersSheet = await loadOrdersLogSheet();
    let orderIndexInfo = buildIndex(existingOrdersSheet.rows || [], buildOrderKey);

    for (const store of stores) {
      console.log('[syncLogs] Fetching orders for store', store.store_id, store.shopify_domain);
      try {
        const { totalProcessed, ordersUpdated, ordersAppended, orderIndexInfo: updatedIndex } =
          await processOrdersForStore(store, orderIndexInfo);
        orderIndexInfo = updatedIndex;
        ordersWrittenTotal += totalProcessed;
        ordersUpdatedTotal += ordersUpdated;
        ordersAppendedTotal += ordersAppended;
        perStore.push({
          store_id: store.store_id,
          store_name: store.store_name,
          shopify_domain: store.shopify_domain,
          orders_fetched: totalProcessed,
        });
        successfulStores += 1;
        console.log(
          `[syncLogs] ${store.store_id} (${store.shopify_domain}) fetched ${totalProcessed} orders`
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

    const ordersSheet = await loadOrdersLogSheet();
    const filteredOrders = (ordersSheet.rows || []).filter((row) => {
      if (!row.created_at) return true;
      const created = new Date(row.created_at);
      if (Number.isNaN(created.getTime())) return true;
      return created >= SYNC_START_DATE;
    });
    const customerRows = buildCustomersFromOrdersLog(filteredOrders);

    const existingCustomersSheet = await loadCustomersLogSheet();
    let customerIndexInfo = buildIndex(existingCustomersSheet.rows || [], buildCustomerKey);
    let customersUpdated = 0;
    let customersAppended = 0;

    if (customerRows.length) {
      for (let i = 0; i < customerRows.length; i += CUSTOMER_BATCH_SIZE) {
        const batch = customerRows.slice(i, i + CUSTOMER_BATCH_SIZE);
        const res = await upsertCustomersLogRows(batch, { indexInfo: customerIndexInfo });
        customerIndexInfo = res.indexInfo;
        customersUpdated += res.updated;
        customersAppended += res.appended;
        console.log('[syncLogs] Processed customer batch of', batch.length);
      }
    }

    const summary = {
      stores_processed: stores.length,
      per_store: perStore,
      orders_fetched: ordersWrittenTotal,
      orders_written: ordersWrittenTotal,
      orders_updated: ordersUpdatedTotal,
      orders_appended: ordersAppendedTotal,
      customers_written: customersUpdated + customersAppended,
      customers_updated: customersUpdated,
      customers_appended: customersAppended,
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
  } catch (err) {
    console.error('[syncLogs] Fatal error in syncLogs', err);
    throw err;
  }
}

module.exports = {
  syncLogs,
  buildCustomersFromOrdersLog,
  buildOrderLogRow,
};
