// services/deploymentVerification.js
// Post-deployment verification to ensure sync system is healthy

const { query } = require('../lib/db');
const { loadStoresRows } = require('../lib/stores');
const { getSyncState, getOrdersCount, getMaxUpdatedAtFromDB } = require('./ordersIndexService');
const { getOrderDetailsCount } = require('./ordersDetailService');

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
        AND table_name IN ('orders_index', 'orders_detail', 'sync_state')
      ORDER BY table_name;
    `);

    const existingTables = tableCheck.rows.map(r => r.table_name);
    results.tables_exist = {
      orders_index: existingTables.includes('orders_index'),
      orders_detail: existingTables.includes('orders_detail'),
      sync_state: existingTables.includes('sync_state'),
    };

    console.log('✓ Tables:', existingTables.join(', '));

    if (!results.tables_exist.orders_index || !results.tables_exist.orders_detail || !results.tables_exist.sync_state) {
      results.issues.push('Missing required tables');
      console.log('✗ WARNING: Some required tables are missing');
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
          storeResult.issues.push('sync_state row missing');
        }

        // Detect issues
        if (!syncState) {
          storeResult.issues.push('sync_state row does not exist');
          results.issues.push(`${store.store_id}: sync_state row missing`);
        } else {
          // Check if checkpoint stuck at 2024-01-01 while DB has newer data
          if (syncState.last_updated_at === BACKFILL_START_ISO && dbMax.max_updated_at) {
            const dbMaxDate = new Date(dbMax.max_updated_at);
            const checkpointDate = new Date(BACKFILL_START_ISO);
            if (dbMaxDate > checkpointDate) {
              storeResult.issues.push('Checkpoint stuck at 2024-01-01 but DB has newer orders');
              results.issues.push(`${store.store_id}: Checkpoint stuck (will auto-bootstrap on next sync)`);
            }
          }

          // Check if backfill_done false while DB has large count
          if (!syncState.backfill_done && indexCount > 1000) {
            storeResult.issues.push(`backfill_done=false but DB has ${indexCount} orders`);
            results.issues.push(`${store.store_id}: backfill_done should be true`);
          }

          // Check if last_order_id null when DB has data
          if (!syncState.last_order_id && indexCount > 0) {
            storeResult.issues.push('last_order_id is NULL but DB has orders');
            results.issues.push(`${store.store_id}: last_order_id missing (will auto-bootstrap on next sync)`);
          }
        }

        // Log store summary
        console.log(
          `  ${store.store_id}: ` +
          `index=${indexCount}, detail=${detailCount}, ` +
          `checkpoint=${syncState?.last_updated_at || 'NONE'}, ` +
          `backfill_done=${syncState?.backfill_done || false}` +
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
      const hasCheckpointIssues = results.issues.some(i => i.includes('Checkpoint stuck') || i.includes('last_order_id missing'));
      if (hasCheckpointIssues) {
        results.recommendations.push('Run incremental sync - it will auto-bootstrap checkpoints from DB');
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
