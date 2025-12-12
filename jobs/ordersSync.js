// jobs/ordersSync.js
const { loadStoresRows } = require('../lib/stores');
const { getShopifyAccessTokenForStore, fetchOrdersPage } = require('../lib/shopify');
const { normalizeOrderListEntry } = require('../lib/orderUtils');
const {
  upsertOrders,
  getSyncState,
  upsertSyncState,
} = require('../services/ordersIndexService');

const BACKFILL_START_ISO = '2024-01-01T00:00:00Z';
const PAGE_LIMIT = 250;

// Convert normalized list entry into DB row
function toDbRow(order, store) {
  return {
    store_id: store.store_id,
    order_id: Number(order.id),
    order_name: order.name || null,
    order_number: order.order_number || null,
    created_at: order.created_at || null,
    updated_at: order.updated_at || order.created_at || null,
    customer_name: order.customer_name || null,
    email: order.customer_email || order.email || null,
    phone: order.customer_phone || order.phone || null,
    total_price: order.total_price != null ? order.total_price : null,
    currency: order.currency || null,
    financial_status: order.financial_status || null,
    fulfillment_status: order.fulfillment_status || null,
  };
}

async function fetchOrdersBatch(store, query) {
  const domain = String(store.shopify_domain || '').trim();
  const token = getShopifyAccessTokenForStore(store.store_id);
  const { orders, nextPageInfo } = await fetchOrdersPage(domain, token, query);
  return { orders: orders || [], nextPageInfo: nextPageInfo || null };
}

async function backfillAllStores() {
  const stores = await loadStoresRows();
  const summary = { stores: [], total_upserted: 0 };

  for (const store of stores) {
    const storeSummary = { store_id: store.store_id, fetched: 0, upserted: 0, pages: 0, error: null };
    try {
      const domain = String(store.shopify_domain || '').trim();
      if (!domain) throw new Error('Missing shopify_domain');

      let page_info = null;
      let keepGoing = true;

      while (keepGoing) {
        const query = {
          status: 'any',
          limit: PAGE_LIMIT,
          order: 'created_at asc',
          created_at_min: BACKFILL_START_ISO,
          fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,customer',
        };
        if (page_info) query.page_info = page_info;

        const batch = await fetchOrdersBatch(store, query);

        storeSummary.pages += 1;
        storeSummary.fetched += batch.orders.length;

        // Normalize -> DB rows
        const normalized = batch.orders.map((o) =>
          normalizeOrderListEntry(o, {
            store_id: store.store_id,
            store_name: store.store_name || store.store_id,
            shopify_domain: domain,
          })
        );

        const rows = normalized.map((o) => toDbRow(o, store));
        if (rows.length) {
          const wr = await upsertOrders(rows);
          storeSummary.upserted += wr.upserted;
          summary.total_upserted += wr.upserted;
        }

        // next page
        page_info = batch.nextPageInfo;
        keepGoing = !!page_info && batch.orders.length > 0;

        // safety: if Shopify returns empty page, stop
        if (batch.orders.length === 0) keepGoing = false;
      }

      // mark backfill done
      await upsertSyncState(store.store_id, { backfill_done: true });
    } catch (err) {
      storeSummary.error = err.message || String(err);
    }
    summary.stores.push(storeSummary);
  }

  return summary;
}

async function incrementalSyncAllStores() {
  const stores = await loadStoresRows();
  const summary = { stores: [], total_upserted: 0 };

  for (const store of stores) {
    const storeSummary = { store_id: store.store_id, fetched: 0, upserted: 0, pages: 0, error: null };
    try {
      const domain = String(store.shopify_domain || '').trim();
      if (!domain) throw new Error('Missing shopify_domain');

      const state = await getSyncState(store.store_id);

      // checkpoint + safety window (10 min)
      const last = state?.last_updated_at ? new Date(state.last_updated_at) : new Date(BACKFILL_START_ISO);
      const safety = new Date(last.getTime() - 10 * 60 * 1000);
      const updated_at_min = safety.toISOString();

      let page_info = null;
      let keepGoing = true;
      let maxUpdatedAt = last;

      while (keepGoing) {
        const query = {
          status: 'any',
          limit: PAGE_LIMIT,
          order: 'updated_at asc',
          updated_at_min,
          fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,customer',
        };
        if (page_info) query.page_info = page_info;

        const batch = await fetchOrdersBatch(store, query);

        storeSummary.pages += 1;
        storeSummary.fetched += batch.orders.length;

        const normalized = batch.orders.map((o) =>
          normalizeOrderListEntry(o, {
            store_id: store.store_id,
            store_name: store.store_name || store.store_id,
            shopify_domain: domain,
          })
        );

        const rows = normalized.map((o) => {
          if (o.updated_at) {
            const d = new Date(o.updated_at);
            if (!Number.isNaN(d.getTime()) && d > maxUpdatedAt) maxUpdatedAt = d;
          }
          return toDbRow(o, store);
        });

        if (rows.length) {
          const wr = await upsertOrders(rows);
          storeSummary.upserted += wr.upserted;
          summary.total_upserted += wr.upserted;
        }

        page_info = batch.nextPageInfo;
        keepGoing = !!page_info && batch.orders.length > 0;
        if (batch.orders.length === 0) keepGoing = false;
      }

      await upsertSyncState(store.store_id, { last_updated_at: maxUpdatedAt.toISOString() });
    } catch (err) {
      storeSummary.error = err.message || String(err);
    }
    summary.stores.push(storeSummary);
  }

  return summary;
}

module.exports = {
  backfillAllStores,
  incrementalSyncAllStores,
};