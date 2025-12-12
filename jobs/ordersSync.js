// jobs/ordersSync.js
const { loadStoresRows } = require('../lib/stores');
const { getShopifyAccessTokenForStore, fetchOrdersPage } = require('../lib/shopify');
const { normalizeOrderListEntry } = require('../lib/orderUtils');
const {
  upsertOrders,
  getSyncState,
  upsertSyncState,
  getOrdersCount,
} = require('../services/ordersIndexService');
const { upsertOrderDetails, getOrderDetailsCount } = require('../services/ordersDetailService');

const BACKFILL_START_ISO = '2024-01-01T00:00:00Z';
const PAGE_LIMIT = 250;
const LOG_EVERY_N_PAGES = 10; // Log progress every N pages
const CHECKPOINT_EVERY_N_PAGES = 5; // Update checkpoint every N pages (progressive saving)
const RATE_LIMIT_DELAY_MS = 500; // Delay between requests to avoid rate limits

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOrdersBatch(store, query) {
  const domain = String(store.shopify_domain || '').trim();
  const token = getShopifyAccessTokenForStore(store.store_id);
  const { orders, nextPageInfo } = await fetchOrdersPage(domain, token, query);
  return { orders: orders || [], nextPageInfo: nextPageInfo || null };
}

async function backfillAllStores() {
  const stores = await loadStoresRows();
  const summary = { stores: [], total_upserted: 0, total_details_upserted: 0 };

  for (const store of stores) {
    const storeSummary = {
      store_id: store.store_id,
      fetched: 0,
      upserted: 0,
      details_upserted: 0,
      pages: 0,
      error: null
    };

    console.log(`[backfill] Starting backfill for store: ${store.store_id}`);

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
          // Fetch ALL fields for full order details
          fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,billing_address,shipping_address,customer,line_items',
        };
        if (page_info) query.page_info = page_info;

        const batch = await fetchOrdersBatch(store, query);

        storeSummary.pages += 1;
        storeSummary.fetched += batch.orders.length;

        // 1. Store full raw order details (JSONB)
        if (batch.orders.length) {
          const detailResult = await upsertOrderDetails(store.store_id, batch.orders);
          storeSummary.details_upserted += detailResult.upserted;
          summary.total_details_upserted += detailResult.upserted;
        }

        // 2. Normalize and store index entries
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

        // Log progress every N pages
        if (storeSummary.pages % LOG_EVERY_N_PAGES === 0) {
          console.log(
            `[backfill] ${store.store_id} - Page ${storeSummary.pages}: ` +
            `${storeSummary.fetched} fetched, ${storeSummary.upserted} index, ${storeSummary.details_upserted} details`
          );
        }

        // next page
        page_info = batch.nextPageInfo;
        keepGoing = !!page_info && batch.orders.length > 0;

        // safety: if Shopify returns empty page, stop
        if (batch.orders.length === 0) keepGoing = false;
      }

      console.log(
        `[backfill] ${store.store_id} - COMPLETE: ` +
        `${storeSummary.fetched} fetched, ${storeSummary.upserted} index, ${storeSummary.details_upserted} details in ${storeSummary.pages} pages`
      );

      // mark backfill done
      await upsertSyncState(store.store_id, { backfill_done: true });
    } catch (err) {
      storeSummary.error = err.message || String(err);
      console.error(`[backfill] ${store.store_id} - ERROR:`, err.message);
    }
    summary.stores.push(storeSummary);
  }

  return summary;
}

async function incrementalSyncAllStores() {
  const stores = await loadStoresRows();
  const summary = { stores: [], total_new_orders: 0, total_updated_orders: 0 };

  for (const store of stores) {
    const startTime = new Date();
    const storeSummary = {
      store_id: store.store_id,
      fetched: 0,
      new_orders: 0,
      pages: 0,
      error: null,
      checkpoint_before: null,
      checkpoint_after: null,
      db_count_before: 0,
      db_count_after: 0,
    };

    try {
      const domain = String(store.shopify_domain || '').trim();
      if (!domain) throw new Error('Missing shopify_domain');

      // Mark run as started
      await upsertSyncState(store.store_id, {
        last_run_started_at: startTime.toISOString(),
        last_run_error: null,
      });

      const state = await getSyncState(store.store_id);

      // Get current DB counts for logging
      const dbCountBefore = await getOrdersCount(store.store_id);
      const dbDetailCountBefore = await getOrderDetailsCount(store.store_id);
      storeSummary.db_count_before = dbCountBefore;

      // Determine checkpoint - NO SAFETY WINDOW!
      const checkpointDate = state?.last_updated_at
        ? new Date(state.last_updated_at)
        : new Date(BACKFILL_START_ISO);

      const updated_at_min = checkpointDate.toISOString();
      storeSummary.checkpoint_before = updated_at_min;

      console.log(
        `[incremental] ${store.store_id} - START: ` +
        `DB has ${dbCountBefore} index / ${dbDetailCountBefore} details, ` +
        `checkpoint: ${updated_at_min}`
      );

      let page_info = null;
      let keepGoing = true;
      let maxUpdatedAt = checkpointDate;
      let maxOrderId = state?.last_order_id || null;
      let newOrdersThisRun = 0;
      const seenOrderIds = new Set();

      while (keepGoing) {
        const query = {
          status: 'any',
          limit: PAGE_LIMIT,
          order: 'updated_at asc',
          updated_at_min,
          fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,billing_address,shipping_address,customer,line_items',
        };
        if (page_info) query.page_info = page_info;

        // Rate limiting
        if (storeSummary.pages > 0) {
          await sleep(RATE_LIMIT_DELAY_MS);
        }

        const batch = await fetchOrdersBatch(store, query);
        storeSummary.pages += 1;
        storeSummary.fetched += batch.orders.length;

        // Track new orders (never seen before in this run)
        for (const order of batch.orders) {
          const orderId = String(order.id);
          if (!seenOrderIds.has(orderId)) {
            seenOrderIds.add(orderId);
            newOrdersThisRun += 1;
          }
        }

        // 1. Store full raw order details (JSONB)
        if (batch.orders.length) {
          await upsertOrderDetails(store.store_id, batch.orders);
        }

        // 2. Normalize and store index entries
        const normalized = batch.orders.map((o) =>
          normalizeOrderListEntry(o, {
            store_id: store.store_id,
            store_name: store.store_name || store.store_id,
            shopify_domain: domain,
          })
        );

        const rows = normalized.map((o) => {
          // Track the highest updated_at timestamp
          if (o.updated_at) {
            const d = new Date(o.updated_at);
            if (!Number.isNaN(d.getTime())) {
              if (d > maxUpdatedAt) {
                maxUpdatedAt = d;
                maxOrderId = Number(o.id);
              } else if (d.getTime() === maxUpdatedAt.getTime()) {
                // Same timestamp - use higher order ID as tie-breaker
                const oid = Number(o.id);
                if (oid > (maxOrderId || 0)) {
                  maxOrderId = oid;
                }
              }
            }
          }
          return toDbRow(o, store);
        });

        if (rows.length) {
          await upsertOrders(rows);
        }

        // Progressive checkpoint - save every N pages
        if (storeSummary.pages % CHECKPOINT_EVERY_N_PAGES === 0 && maxUpdatedAt > checkpointDate) {
          await upsertSyncState(store.store_id, {
            last_updated_at: maxUpdatedAt.toISOString(),
            last_order_id: maxOrderId,
          });
        }

        // Throttled logging
        if (storeSummary.pages % LOG_EVERY_N_PAGES === 0) {
          console.log(
            `[incremental] ${store.store_id} - Page ${storeSummary.pages}: ` +
            `${storeSummary.fetched} fetched, ${newOrdersThisRun} new in this run`
          );
        }

        // Pagination
        page_info = batch.nextPageInfo;
        keepGoing = !!page_info && batch.orders.length > 0;

        // Safety: stop if checkpoint didn't advance (prevents infinite loops)
        if (batch.orders.length === 0) {
          keepGoing = false;
        }
      }

      // Final checkpoint update
      const finalCheckpoint = maxUpdatedAt.toISOString();
      storeSummary.checkpoint_after = finalCheckpoint;
      storeSummary.new_orders = newOrdersThisRun;

      // Get final DB counts
      const dbCountAfter = await getOrdersCount(store.store_id);
      const dbDetailCountAfter = await getOrderDetailsCount(store.store_id);
      storeSummary.db_count_after = dbCountAfter;

      const endTime = new Date();
      await upsertSyncState(store.store_id, {
        last_updated_at: finalCheckpoint,
        last_order_id: maxOrderId,
        last_run_finished_at: endTime.toISOString(),
        last_run_new_orders: newOrdersThisRun,
      });

      console.log(
        `[incremental] ${store.store_id} - COMPLETE: ` +
        `${storeSummary.fetched} fetched, ${newOrdersThisRun} new orders, ${storeSummary.pages} pages. ` +
        `DB: ${dbCountBefore} → ${dbCountAfter} index (${dbDetailCountBefore} → ${dbDetailCountAfter} details). ` +
        `Final checkpoint: ${finalCheckpoint}`
      );

      summary.total_new_orders += newOrdersThisRun;
    } catch (err) {
      storeSummary.error = err.message || String(err);
      console.error(`[incremental] ${store.store_id} - ERROR:`, err.message);

      // Record error in checkpoint (with improved error handling)
      try {
        await upsertSyncState(store.store_id, {
          last_run_finished_at: new Date().toISOString(),
          last_run_error: err.message || String(err),
        });
      } catch (checkpointErr) {
        // If checkpoint write fails, log concisely (one line only)
        console.error(`[incremental] ${store.store_id} - Checkpoint save failed: ${checkpointErr.message}`);
      }
    }
    summary.stores.push(storeSummary);
  }

  return summary;
}

module.exports = {
  backfillAllStores,
  incrementalSyncAllStores,
};