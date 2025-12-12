// jobs/ordersSync.js
const { loadStoresRows } = require('../lib/stores');
const { getShopifyAccessTokenForStore, fetchOrdersPage } = require('../lib/shopify');
const { normalizeOrderListEntry } = require('../lib/orderUtils');
const {
  upsertOrders,
  getSyncState,
  upsertSyncState,
  getOrdersCount,
  getMaxUpdatedAtFromDB,
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

      // Mark backfill done AND set checkpoint from DB
      // This ensures incremental sync knows where to start from
      const dbMax = await getMaxUpdatedAtFromDB(store.store_id);
      const checkpointUpdate = {
        backfill_done: true,
      };

      if (dbMax.max_updated_at) {
        checkpointUpdate.last_updated_at = new Date(dbMax.max_updated_at).toISOString();
        checkpointUpdate.last_order_id = dbMax.max_order_id;
        console.log(
          `[backfill] ${store.store_id} - Setting checkpoint: ` +
          `last_updated_at=${checkpointUpdate.last_updated_at}, last_order_id=${dbMax.max_order_id}`
        );
      }

      await upsertSyncState(store.store_id, checkpointUpdate);
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

      // Get current DB counts for logging
      const dbCountBefore = await getOrdersCount(store.store_id);
      const dbDetailCountBefore = await getOrderDetailsCount(store.store_id);
      storeSummary.db_count_before = dbCountBefore;

      // BOOTSTRAP CHECKPOINT FROM DB IF MISSING OR STUCK AT 2024-01-01
      // CRITICAL: Must use Date comparison, not string comparison (Postgres format varies)
      let state = await getSyncState(store.store_id);
      let checkpointBootstrapped = false;

      // Helper: Check if checkpoint is stuck at or before 2024-01-02
      const isCheckpointStuck = (checkpoint) => {
        if (!checkpoint) return true;
        const checkpointDate = new Date(checkpoint);
        const cutoffDate = new Date('2024-01-02T00:00:00Z');
        return checkpointDate <= cutoffDate;
      };

      // FAIL-FAST: If DB has data but checkpoint is invalid, ABORT
      if (dbCountBefore > 0 && isCheckpointStuck(state?.last_updated_at)) {
        const dbMax = await getMaxUpdatedAtFromDB(store.store_id);

        if (!dbMax.max_updated_at) {
          throw new Error(
            `FATAL: Incremental sync aborted – DB has ${dbCountBefore} orders but no valid updated_at timestamps. ` +
            `This indicates data corruption. Manual intervention required.`
          );
        }

        // Bootstrap from DB
        checkpointBootstrapped = true;

        await upsertSyncState(store.store_id, {
          last_updated_at: new Date(dbMax.max_updated_at).toISOString(),
          last_order_id: dbMax.max_order_id,
          backfill_done: true,
        });

        console.log(
          `[incremental] ${store.store_id} - BOOTSTRAPPED checkpoint from DB: ` +
          `${new Date(dbMax.max_updated_at).toISOString()} (order_id: ${dbMax.max_order_id}, DB has ${dbCountBefore} orders)`
        );

        // RE-FETCH state to ensure we use the bootstrapped checkpoint
        state = await getSyncState(store.store_id);
      }

      // FINAL VALIDATION: Ensure checkpoint is now valid
      if (dbCountBefore > 0 && isCheckpointStuck(state?.last_updated_at)) {
        throw new Error(
          `FATAL: Incremental sync aborted – checkpoint is invalid (${state?.last_updated_at || 'NULL'}) ` +
          `while DB has ${dbCountBefore} orders. This should never happen after bootstrap.`
        );
      }

      // Single source of truth: Use checkpoint from freshly read state
      const checkpointDate = state?.last_updated_at
        ? new Date(state.last_updated_at)
        : new Date(BACKFILL_START_ISO);

      const updated_at_min = checkpointDate.toISOString();
      storeSummary.checkpoint_before = updated_at_min;

      // Log query parameters BEFORE first Shopify call
      console.log(
        `[incremental] ${store.store_id} - START${checkpointBootstrapped ? ' (BOOTSTRAPPED)' : ''}: ` +
        `DB has ${dbCountBefore} index / ${dbDetailCountBefore} details, ` +
        `checkpoint: ${updated_at_min}`
      );

      let page_info = null;
      let keepGoing = true;
      let maxUpdatedAt = checkpointDate;
      let maxOrderId = state?.last_order_id || null;

      while (keepGoing) {
        const query = {
          status: 'any',
          limit: PAGE_LIMIT,
          order: 'updated_at asc',
          updated_at_min,
          fields: 'id,name,order_number,created_at,updated_at,financial_status,fulfillment_status,total_price,currency,email,phone,billing_address,shipping_address,customer,line_items',
        };
        if (page_info) query.page_info = page_info;

        // Log Shopify query parameters on FIRST call
        if (storeSummary.pages === 0) {
          console.log(
            `[shopify-query] store=${store.store_id}, ` +
            `updated_at_min=${query.updated_at_min}, ` +
            `order=${query.order}, ` +
            `limit=${query.limit}`
          );
        }

        // Rate limiting
        if (storeSummary.pages > 0) {
          await sleep(RATE_LIMIT_DELAY_MS);
        }

        const batch = await fetchOrdersBatch(store, query);
        storeSummary.pages += 1;
        storeSummary.fetched += batch.orders.length;

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
            `${storeSummary.fetched} fetched so far`
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

      // Get final DB counts
      const dbCountAfter = await getOrdersCount(store.store_id);
      const dbDetailCountAfter = await getOrderDetailsCount(store.store_id);
      storeSummary.db_count_after = dbCountAfter;

      // Calculate ACTUAL new orders as DB growth (not fetched count)
      const actualNewOrders = dbCountAfter - dbCountBefore;
      storeSummary.new_orders = actualNewOrders;

      const endTime = new Date();
      await upsertSyncState(store.store_id, {
        last_updated_at: finalCheckpoint,
        last_order_id: maxOrderId,
        last_run_finished_at: endTime.toISOString(),
        last_run_new_orders: actualNewOrders,
      });

      console.log(
        `[incremental] ${store.store_id} - COMPLETE: ` +
        `${storeSummary.fetched} fetched, ${actualNewOrders} new orders, ${storeSummary.pages} pages. ` +
        `DB: ${dbCountBefore} → ${dbCountAfter} index (${dbDetailCountBefore} → ${dbDetailCountAfter} details). ` +
        `Final checkpoint: ${finalCheckpoint}`
      );

      summary.total_new_orders += actualNewOrders;
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