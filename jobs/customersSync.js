// jobs/customersSync.js
const { loadStoresRows } = require('../lib/stores');
const { getShopifyAccessTokenForStore, fetchCustomersPage } = require('../lib/shopify');
const { normalizeCustomerListEntry } = require('../lib/customerUtils');
const {
  upsertCustomers,
  getCustomersSyncState,
  upsertCustomersSyncState,
  getCustomersCount,
  getMaxUpdatedAtFromDB,
} = require('../services/customersIndexService');
const { upsertCustomerDetails, getCustomerDetailsCount } = require('../services/customersDetailService');

const BACKFILL_START_ISO = '2024-01-01T00:00:00Z';
const PAGE_LIMIT = 250;
const LOG_EVERY_N_PAGES = 10; // Log progress every N pages
const CHECKPOINT_EVERY_N_PAGES = 5; // Update checkpoint every N pages (progressive saving)
const RATE_LIMIT_DELAY_MS = 500; // Delay between requests to avoid rate limits

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCustomersBatch(store, query) {
  const domain = String(store.shopify_domain || '').trim();
  const token = getShopifyAccessTokenForStore(store.store_id);
  const { customers, nextPageInfo } = await fetchCustomersPage(domain, token, query);
  return { customers: customers || [], nextPageInfo: nextPageInfo || null };
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

    console.log(`[customers-backfill] Starting backfill for store: ${store.store_id}`);

    try {
      const domain = String(store.shopify_domain || '').trim();
      if (!domain) throw new Error('Missing shopify_domain');

      let page_info = null;
      let keepGoing = true;

      while (keepGoing) {
        const query = {
          limit: PAGE_LIMIT,
          order: 'created_at asc',
          created_at_min: BACKFILL_START_ISO,
          // Fetch ALL fields for full customer details
          fields: 'id,email,phone,first_name,last_name,created_at,updated_at,orders_count,total_spent,last_order_id,last_order_name,verified_email,state,tags,default_address,addresses,marketing_opt_in_level,email_marketing_consent,sms_marketing_consent',
        };
        if (page_info) query.page_info = page_info;

        const batch = await fetchCustomersBatch(store, query);

        storeSummary.pages += 1;
        storeSummary.fetched += batch.customers.length;

        // 1. Store full raw customer details (JSONB)
        if (batch.customers.length) {
          const detailResult = await upsertCustomerDetails(store.store_id, batch.customers);
          storeSummary.details_upserted += detailResult.upserted;
          summary.total_details_upserted += detailResult.upserted;
        }

        // 2. Normalize and store index entries
        const normalized = batch.customers.map((c) =>
          normalizeCustomerListEntry(c, {
            store_id: store.store_id,
            store_name: store.store_name || store.store_id,
            shopify_domain: domain,
          })
        );

        if (normalized.length) {
          const wr = await upsertCustomers(normalized);
          storeSummary.upserted += wr.upserted;
          summary.total_upserted += wr.upserted;
        }

        // Log progress every N pages
        if (storeSummary.pages % LOG_EVERY_N_PAGES === 0) {
          console.log(
            `[customers-backfill] ${store.store_id} - Page ${storeSummary.pages}: ` +
            `${storeSummary.fetched} fetched, ${storeSummary.upserted} index, ${storeSummary.details_upserted} details`
          );
        }

        // next page
        page_info = batch.nextPageInfo;
        keepGoing = !!page_info && batch.customers.length > 0;

        // safety: if Shopify returns empty page, stop
        if (batch.customers.length === 0) keepGoing = false;
      }

      console.log(
        `[customers-backfill] ${store.store_id} - COMPLETE: ` +
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
        checkpointUpdate.last_customer_id = dbMax.max_customer_id;
        console.log(
          `[customers-backfill] ${store.store_id} - Setting checkpoint: ` +
          `last_updated_at=${checkpointUpdate.last_updated_at}, last_customer_id=${dbMax.max_customer_id}`
        );
      }

      await upsertCustomersSyncState(store.store_id, checkpointUpdate);
    } catch (err) {
      storeSummary.error = err.message || String(err);
      console.error(`[customers-backfill] ${store.store_id} - ERROR:`, err.message);
    }
    summary.stores.push(storeSummary);
  }

  return summary;
}

async function incrementalSyncAllStores() {
  const stores = await loadStoresRows();
  const summary = { stores: [], total_new_customers: 0, total_updated_customers: 0 };

  for (const store of stores) {
    const startTime = new Date();
    const storeSummary = {
      store_id: store.store_id,
      fetched: 0,
      new_customers: 0,
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
      await upsertCustomersSyncState(store.store_id, {
        last_run_started_at: startTime.toISOString(),
        last_run_error: null,
      });

      // Get current DB counts for logging
      const dbCountBefore = await getCustomersCount({ store_id: store.store_id });
      const dbDetailCountBefore = await getCustomerDetailsCount(store.store_id);
      storeSummary.db_count_before = dbCountBefore;

      // BOOTSTRAP CHECKPOINT FROM DB IF MISSING OR STUCK AT 2024-01-01
      // CRITICAL: Must use Date comparison, not string comparison (Postgres format varies)
      let state = await getCustomersSyncState(store.store_id);
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
            `FATAL: Incremental sync aborted – DB has ${dbCountBefore} customers but no valid updated_at timestamps. ` +
            `This indicates data corruption. Manual intervention required.`
          );
        }

        // Bootstrap from DB
        checkpointBootstrapped = true;

        await upsertCustomersSyncState(store.store_id, {
          last_updated_at: new Date(dbMax.max_updated_at).toISOString(),
          last_customer_id: dbMax.max_customer_id,
          backfill_done: true,
        });

        console.log(
          `[customers-incremental] ${store.store_id} - BOOTSTRAPPED checkpoint from DB: ` +
          `${new Date(dbMax.max_updated_at).toISOString()} (customer_id: ${dbMax.max_customer_id}, DB has ${dbCountBefore} customers)`
        );

        // RE-FETCH state to ensure we use the bootstrapped checkpoint
        state = await getCustomersSyncState(store.store_id);
      }

      // FINAL VALIDATION: Ensure checkpoint is now valid
      if (dbCountBefore > 0 && isCheckpointStuck(state?.last_updated_at)) {
        throw new Error(
          `FATAL: Incremental sync aborted – checkpoint is invalid (${state?.last_updated_at || 'NULL'}) ` +
          `while DB has ${dbCountBefore} customers. This should never happen after bootstrap.`
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
        `[customers-incremental] ${store.store_id} - START${checkpointBootstrapped ? ' (BOOTSTRAPPED)' : ''}: ` +
        `DB has ${dbCountBefore} index / ${dbDetailCountBefore} details, ` +
        `checkpoint: ${updated_at_min}`
      );

      let page_info = null;
      let keepGoing = true;
      let maxUpdatedAt = checkpointDate;
      let maxCustomerId = state?.last_customer_id || null;

      while (keepGoing) {
        const query = {
          limit: PAGE_LIMIT,
          order: 'updated_at asc',
          updated_at_min,
          fields: 'id,email,phone,first_name,last_name,created_at,updated_at,orders_count,total_spent,last_order_id,last_order_name,verified_email,state,tags,default_address,addresses,marketing_opt_in_level,email_marketing_consent,sms_marketing_consent',
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

        const batch = await fetchCustomersBatch(store, query);
        storeSummary.pages += 1;
        storeSummary.fetched += batch.customers.length;

        // 1. Store full raw customer details (JSONB)
        if (batch.customers.length) {
          await upsertCustomerDetails(store.store_id, batch.customers);
        }

        // 2. Normalize and store index entries
        const normalized = batch.customers.map((c) =>
          normalizeCustomerListEntry(c, {
            store_id: store.store_id,
            store_name: store.store_name || store.store_id,
            shopify_domain: domain,
          })
        );

        const rows = normalized.map((c) => {
          // Track the highest updated_at timestamp
          if (c.updated_at) {
            const d = new Date(c.updated_at);
            if (!Number.isNaN(d.getTime())) {
              if (d > maxUpdatedAt) {
                maxUpdatedAt = d;
                maxCustomerId = Number(c.customer_id);
              } else if (d.getTime() === maxUpdatedAt.getTime()) {
                // Same timestamp - use higher customer ID as tie-breaker
                const cid = Number(c.customer_id);
                if (cid > (maxCustomerId || 0)) {
                  maxCustomerId = cid;
                }
              }
            }
          }
          return c;
        });

        if (rows.length) {
          await upsertCustomers(rows);
        }

        // Progressive checkpoint - save every N pages
        if (storeSummary.pages % CHECKPOINT_EVERY_N_PAGES === 0 && maxUpdatedAt > checkpointDate) {
          await upsertCustomersSyncState(store.store_id, {
            last_updated_at: maxUpdatedAt.toISOString(),
            last_customer_id: maxCustomerId,
          });
        }

        // Throttled logging
        if (storeSummary.pages % LOG_EVERY_N_PAGES === 0) {
          console.log(
            `[customers-incremental] ${store.store_id} - Page ${storeSummary.pages}: ` +
            `${storeSummary.fetched} fetched so far`
          );
        }

        // Pagination
        page_info = batch.nextPageInfo;
        keepGoing = !!page_info && batch.customers.length > 0;

        // Safety: stop if checkpoint didn't advance (prevents infinite loops)
        if (batch.customers.length === 0) {
          keepGoing = false;
        }
      }

      // Final checkpoint update
      const finalCheckpoint = maxUpdatedAt.toISOString();
      storeSummary.checkpoint_after = finalCheckpoint;

      // Get final DB counts
      const dbCountAfter = await getCustomersCount({ store_id: store.store_id });
      const dbDetailCountAfter = await getCustomerDetailsCount(store.store_id);
      storeSummary.db_count_after = dbCountAfter;

      // Calculate ACTUAL new customers as DB growth (not fetched count)
      const actualNewCustomers = dbCountAfter - dbCountBefore;
      storeSummary.new_customers = actualNewCustomers;

      const endTime = new Date();
      await upsertCustomersSyncState(store.store_id, {
        last_updated_at: finalCheckpoint,
        last_customer_id: maxCustomerId,
        last_run_finished_at: endTime.toISOString(),
        last_run_new_customers: actualNewCustomers,
      });

      console.log(
        `[customers-incremental] ${store.store_id} - COMPLETE: ` +
        `${storeSummary.fetched} fetched, ${actualNewCustomers} new customers, ${storeSummary.pages} pages. ` +
        `DB: ${dbCountBefore} → ${dbCountAfter} index (${dbDetailCountBefore} → ${dbDetailCountAfter} details). ` +
        `Final checkpoint: ${finalCheckpoint}`
      );

      summary.total_new_customers += actualNewCustomers;
    } catch (err) {
      storeSummary.error = err.message || String(err);
      console.error(`[customers-incremental] ${store.store_id} - ERROR:`, err.message);

      // Record error in checkpoint (with improved error handling)
      try {
        await upsertCustomersSyncState(store.store_id, {
          last_run_finished_at: new Date().toISOString(),
          last_run_error: err.message || String(err),
        });
      } catch (checkpointErr) {
        // If checkpoint write fails, log concisely (one line only)
        console.error(`[customers-incremental] ${store.store_id} - Checkpoint save failed: ${checkpointErr.message}`);
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
