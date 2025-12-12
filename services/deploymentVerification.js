// services/deploymentVerification.js
// Post-deployment verification to ensure sync system is healthy

const { query } = require('../lib/db');
const { loadStoresRows } = require('../lib/stores');
const { getSyncState, getOrdersCount, getMaxUpdatedAtFromDB } = require('./ordersIndexService');
const { getOrderDetailsCount } = require('./ordersDetailService');
const { getCustomersSyncState, getCustomersCount, getMaxUpdatedAtFromDB: getMaxCustomerUpdatedAtFromDB } = require('./customersIndexService');
const { getCustomerDetailsCount } = require('./customersDetailService');

const BACKFILL_START_ISO = '2024-01-01T00:00:00Z';

let verificationRun = false; // Guard to run only once per boot

async function runDeploymentVerification() {
  if (verificationRun) {
    return { skipped: true, reason: 'Already run in this container' };
  }
  verificationRun = true;

  console.log('\n========== POST-DEPLOY VERIFICATION ==========');

  const results = {
    timestamp: new Date().toISOString(),
    db_connectivity: false,
    tables_exist: {},
    stores: [],
    issues: [],
    recommendations: [],
  };

  try {
    // 1. DB connectivity check
    await query('SELECT 1');
    results.db_connectivity = true;
    console.log('✓ DB connectivity: OK');

    // 2. Check required tables exist
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('orders_index', 'orders_detail', 'sync_state', 'customers_index', 'customers_detail', 'customers_sync_state')
      ORDER BY table_name;
    `);

    const existingTables = tableCheck.rows.map(r => r.table_name);
    results.tables_exist = {
      orders_index: existingTables.includes('orders_index'),
      orders_detail: existingTables.includes('orders_detail'),
      sync_state: existingTables.includes('sync_state'),
      customers_index: existingTables.includes('customers_index'),
      customers_detail: existingTables.includes('customers_detail'),
      customers_sync_state: existingTables.includes('customers_sync_state'),
    };

    console.log('✓ Tables:', existingTables.join(', '));

    const missingTables = [];
    if (!results.tables_exist.orders_index) missingTables.push('orders_index');
    if (!results.tables_exist.orders_detail) missingTables.push('orders_detail');
    if (!results.tables_exist.sync_state) missingTables.push('sync_state');
    if (!results.tables_exist.customers_index) missingTables.push('customers_index');
    if (!results.tables_exist.customers_detail) missingTables.push('customers_detail');
    if (!results.tables_exist.customers_sync_state) missingTables.push('customers_sync_state');

    if (missingTables.length > 0) {
      results.issues.push(`Missing required tables: ${missingTables.join(', ')}`);
      console.log(`✗ WARNING: Missing tables: ${missingTables.join(', ')}`);
    }

    // 3. Check each store
    const stores = await loadStoresRows();
    console.log(`\nChecking ${stores.length} stores:`);

    for (const store of stores) {
      const storeResult = {
        store_id: store.store_id,
        has_token: false,
        counts: {},
        db_max: {},
        sync_state: null,
        customers_counts: {},
        customers_db_max: {},
        customers_sync_state: null,
        issues: [],
      };

      try {
        // Check if token is configured
        const envKey = `SHOPIFY_ACCESS_TOKEN_${store.store_id}`;
        storeResult.has_token = !!process.env[envKey];

        if (!storeResult.has_token) {
          storeResult.issues.push('No access token configured');
          results.stores.push(storeResult);
          continue;
        }

        // ===== ORDERS CHECKS =====
        // Get DB counts
        const indexCount = await getOrdersCount(store.store_id);
        const detailCount = await getOrderDetailsCount(store.store_id);
        storeResult.counts = {
          orders_index: indexCount,
          orders_detail: detailCount,
        };

        // Get max updated_at from DB
        const dbMax = await getMaxUpdatedAtFromDB(store.store_id);
        storeResult.db_max = {
          max_updated_at: dbMax.max_updated_at,
          max_order_id: dbMax.max_order_id,
        };

        // Get sync_state
        const syncState = await getSyncState(store.store_id);
        if (syncState) {
          storeResult.sync_state = {
            last_updated_at: syncState.last_updated_at,
            last_order_id: syncState.last_order_id,
            backfill_done: syncState.backfill_done,
            last_run_finished_at: syncState.last_run_finished_at,
          };
        } else {
          storeResult.issues.push('orders sync_state row missing');
        }

        // ===== CUSTOMERS CHECKS =====
        const customersIndexCount = await getCustomersCount({ store_id: store.store_id });
        const customersDetailCount = await getCustomerDetailsCount(store.store_id);
        storeResult.customers_counts = {
          customers_index: customersIndexCount,
          customers_detail: customersDetailCount,
        };

        // Get max updated_at from customers DB
        const customersDbMax = await getMaxCustomerUpdatedAtFromDB(store.store_id);
        storeResult.customers_db_max = {
          max_updated_at: customersDbMax.max_updated_at,
          max_customer_id: customersDbMax.max_customer_id,
        };

        // Get customers sync_state
        const customersSyncState = await getCustomersSyncState(store.store_id);
        if (customersSyncState) {
          storeResult.customers_sync_state = {
            last_updated_at: customersSyncState.last_updated_at,
            last_customer_id: customersSyncState.last_customer_id,
            backfill_done: customersSyncState.backfill_done,
            last_run_finished_at: customersSyncState.last_run_finished_at,
          };
        } else {
          storeResult.issues.push('customers_sync_state row missing');
        }

        // Detect issues
        if (!syncState) {
          storeResult.issues.push('sync_state row does not exist');
          results.issues.push(`${store.store_id}: sync_state row missing`);
        } else {
          // CRITICAL: Check if checkpoint is stuck at or before 2024-01-02 while DB has data
          const isCheckpointStuck = (checkpoint) => {
            if (!checkpoint) return true;
            const checkpointDate = new Date(checkpoint);
            const cutoffDate = new Date('2024-01-02T00:00:00Z');
            return checkpointDate <= cutoffDate;
          };

          if (indexCount > 0 && isCheckpointStuck(syncState.last_updated_at)) {
            storeResult.issues.push(
              `CRITICAL: Checkpoint stuck at ${syncState.last_updated_at || 'NULL'} but DB has ${indexCount} orders`
            );
            results.issues.push(
              `${store.store_id}: CRITICAL - Invalid checkpoint (will auto-bootstrap on next sync)`
            );
          }

          // Check if checkpoint is significantly behind DB max (>24 hours old)
          if (syncState.last_updated_at && dbMax.max_updated_at && indexCount > 100) {
            const checkpointDate = new Date(syncState.last_updated_at);
            const dbMaxDate = new Date(dbMax.max_updated_at);
            const hoursDiff = (dbMaxDate - checkpointDate) / (1000 * 60 * 60);
            if (hoursDiff > 24) {
              storeResult.issues.push(`Checkpoint is ${Math.round(hoursDiff)} hours behind DB max`);
              results.issues.push(`${store.store_id}: Checkpoint lag detected (will auto-bootstrap on next sync)`);
            }
          }

          // Check if backfill_done false while DB has large count
          if (!syncState.backfill_done && indexCount > 1000) {
            storeResult.issues.push(`backfill_done=false but DB has ${indexCount} orders`);
            results.issues.push(`${store.store_id}: backfill_done should be true (will auto-fix on next sync)`);
          }

          // Check if last_order_id null when DB has data
          if (!syncState.last_order_id && indexCount > 0) {
            storeResult.issues.push('last_order_id is NULL but DB has orders');
            results.issues.push(`${store.store_id}: last_order_id missing (will auto-bootstrap on next sync)`);
          }
        }

        // ===== CUSTOMERS VALIDATION =====
        if (!customersSyncState) {
          storeResult.issues.push('customers_sync_state row does not exist');
          results.issues.push(`${store.store_id}: customers_sync_state row missing`);
        } else {
          // CRITICAL: Check if checkpoint is stuck at or before 2024-01-02 while DB has data
          const isCheckpointStuck = (checkpoint) => {
            if (!checkpoint) return true;
            const checkpointDate = new Date(checkpoint);
            const cutoffDate = new Date('2024-01-02T00:00:00Z');
            return checkpointDate <= cutoffDate;
          };

          if (customersIndexCount > 0 && isCheckpointStuck(customersSyncState.last_updated_at)) {
            storeResult.issues.push(
              `CRITICAL: Customers checkpoint stuck at ${customersSyncState.last_updated_at || 'NULL'} but DB has ${customersIndexCount} customers`
            );
            results.issues.push(
              `${store.store_id}: CRITICAL - Invalid customers checkpoint (will auto-bootstrap on next sync)`
            );
          }

          // Check if checkpoint is significantly behind DB max (>24 hours old)
          if (customersSyncState.last_updated_at && customersDbMax.max_updated_at && customersIndexCount > 100) {
            const checkpointDate = new Date(customersSyncState.last_updated_at);
            const dbMaxDate = new Date(customersDbMax.max_updated_at);
            const hoursDiff = (dbMaxDate - checkpointDate) / (1000 * 60 * 60);
            if (hoursDiff > 24) {
              storeResult.issues.push(`Customers checkpoint is ${Math.round(hoursDiff)} hours behind DB max`);
              results.issues.push(`${store.store_id}: Customers checkpoint lag detected (will auto-bootstrap on next sync)`);
            }
          }

          // Check if backfill_done false while DB has large count
          if (!customersSyncState.backfill_done && customersIndexCount > 500) {
            storeResult.issues.push(`customers backfill_done=false but DB has ${customersIndexCount} customers`);
            results.issues.push(`${store.store_id}: customers backfill_done should be true (will auto-fix on next sync)`);
          }

          // Check if last_customer_id null when DB has data
          if (!customersSyncState.last_customer_id && customersIndexCount > 0) {
            storeResult.issues.push('last_customer_id is NULL but DB has customers');
            results.issues.push(`${store.store_id}: last_customer_id missing (will auto-bootstrap on next sync)`);
          }
        }

        // Log store summary
        console.log(
          `  ${store.store_id}: ` +
          `orders(index=${indexCount}, detail=${detailCount}, checkpoint=${syncState?.last_updated_at || 'NONE'}), ` +
          `customers(index=${customersIndexCount}, detail=${customersDetailCount}, checkpoint=${customersSyncState?.last_updated_at || 'NONE'})` +
          (storeResult.issues.length > 0 ? ` [${storeResult.issues.length} issues]` : '')
        );

      } catch (err) {
        storeResult.issues.push(`Error: ${err.message}`);
        results.issues.push(`${store.store_id}: ${err.message}`);
      }

      results.stores.push(storeResult);
    }

    // Generate recommendations
    if (results.issues.length > 0) {
      console.log('\n⚠️  ISSUES DETECTED:');
      results.issues.forEach(issue => console.log(`  - ${issue}`));

      // Add recommendations
      const hasOrdersCheckpointIssues = results.issues.some(i =>
        (i.includes('Checkpoint stuck') || i.includes('last_order_id missing')) &&
        !i.includes('Customers')
      );
      const hasCustomersCheckpointIssues = results.issues.some(i =>
        i.includes('Customers checkpoint') || i.includes('last_customer_id missing')
      );

      if (hasOrdersCheckpointIssues) {
        results.recommendations.push('Run orders incremental sync - it will auto-bootstrap checkpoints from DB');
      }

      if (hasCustomersCheckpointIssues) {
        results.recommendations.push('Run customers incremental sync - it will auto-bootstrap checkpoints from DB');
      }

      const hasBackfillDoneIssues = results.issues.some(i => i.includes('backfill_done'));
      if (hasBackfillDoneIssues) {
        results.recommendations.push('Checkpoints will be fixed automatically on next incremental sync run');
      }

      if (results.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        results.recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
    } else {
      console.log('\n✓ No issues detected - system healthy');
    }

    console.log('==============================================\n');

    return results;

  } catch (err) {
    console.error('✗ Verification failed:', err.message);
    results.issues.push(`Verification error: ${err.message}`);
    console.log('==============================================\n');
    return results;
  }
}

module.exports = {
  runDeploymentVerification,
};
