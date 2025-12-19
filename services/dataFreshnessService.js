// services/dataFreshnessService.js
// Service to check data freshness and trigger auto-refresh when data is stale

const { query } = require('../lib/db');

// Default stale threshold: 60 minutes
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

// Track in-flight refreshes to prevent duplicate triggers
const refreshInProgress = {
  orders: new Set(),
  customers: new Set(),
};

/**
 * Get the last sync time for orders
 * @param {string} storeId - Store ID or 'all'
 * @returns {Promise<{lastSync: Date|null, isStale: boolean, ageMinutes: number|null}>}
 */
async function getOrdersSyncStatus(storeId = 'all') {
  try {
    let result;
    if (storeId && storeId !== 'all') {
      result = await query(
        `SELECT last_run_finished_at FROM sync_state WHERE store_id = $1`,
        [storeId]
      );
    } else {
      // For 'all', get the oldest (most stale) sync time across all stores
      result = await query(
        `SELECT MIN(last_run_finished_at) as last_run_finished_at FROM sync_state`
      );
    }

    const lastSync = result.rows[0]?.last_run_finished_at;
    if (!lastSync) {
      return { lastSync: null, isStale: true, ageMinutes: null };
    }

    const lastSyncDate = new Date(lastSync);
    const ageMs = Date.now() - lastSyncDate.getTime();
    const ageMinutes = Math.round(ageMs / 60000);
    const isStale = ageMs > STALE_THRESHOLD_MS;

    return { lastSync: lastSyncDate, isStale, ageMinutes };
  } catch (err) {
    console.error('[dataFreshness] Error checking orders sync status:', err.message);
    return { lastSync: null, isStale: true, ageMinutes: null };
  }
}

/**
 * Get the last sync time for customers
 * @param {string} storeId - Store ID or 'all'
 * @returns {Promise<{lastSync: Date|null, isStale: boolean, ageMinutes: number|null}>}
 */
async function getCustomersSyncStatus(storeId = 'all') {
  try {
    let result;
    if (storeId && storeId !== 'all') {
      result = await query(
        `SELECT last_run_finished_at FROM customers_sync_state WHERE store_id = $1`,
        [storeId]
      );
    } else {
      // For 'all', get the oldest (most stale) sync time across all stores
      result = await query(
        `SELECT MIN(last_run_finished_at) as last_run_finished_at FROM customers_sync_state`
      );
    }

    const lastSync = result.rows[0]?.last_run_finished_at;
    if (!lastSync) {
      return { lastSync: null, isStale: true, ageMinutes: null };
    }

    const lastSyncDate = new Date(lastSync);
    const ageMs = Date.now() - lastSyncDate.getTime();
    const ageMinutes = Math.round(ageMs / 60000);
    const isStale = ageMs > STALE_THRESHOLD_MS;

    return { lastSync: lastSyncDate, isStale, ageMinutes };
  } catch (err) {
    console.error('[dataFreshness] Error checking customers sync status:', err.message);
    return { lastSync: null, isStale: true, ageMinutes: null };
  }
}

/**
 * Trigger background orders sync if data is stale
 * Returns immediately, sync runs in background
 * @param {string} storeId - Store ID or 'all'
 * @returns {Promise<{triggered: boolean, reason: string}>}
 */
async function triggerOrdersRefreshIfStale(storeId = 'all') {
  const cacheKey = storeId || 'all';

  // Check if already in progress
  if (refreshInProgress.orders.has(cacheKey)) {
    return { triggered: false, reason: 'refresh_already_in_progress' };
  }

  const status = await getOrdersSyncStatus(storeId);

  if (!status.isStale) {
    return { triggered: false, reason: 'data_fresh', ageMinutes: status.ageMinutes };
  }

  // Mark as in progress
  refreshInProgress.orders.add(cacheKey);

  console.log(`[dataFreshness] Orders data is stale (${status.ageMinutes} min old), triggering background refresh for store: ${cacheKey}`);

  // Import and run sync in background (don't await)
  const { incrementalSyncAllStores } = require('../jobs/ordersSync');

  incrementalSyncAllStores()
    .then((summary) => {
      console.log('[dataFreshness] Orders background refresh completed:', JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('[dataFreshness] Orders background refresh failed:', err.message);
    })
    .finally(() => {
      refreshInProgress.orders.delete(cacheKey);
    });

  return { triggered: true, reason: 'stale_data', ageMinutes: status.ageMinutes };
}

/**
 * Trigger background customers sync if data is stale
 * Returns immediately, sync runs in background
 * @param {string} storeId - Store ID or 'all'
 * @returns {Promise<{triggered: boolean, reason: string}>}
 */
async function triggerCustomersRefreshIfStale(storeId = 'all') {
  const cacheKey = storeId || 'all';

  // Check if already in progress
  if (refreshInProgress.customers.has(cacheKey)) {
    return { triggered: false, reason: 'refresh_already_in_progress' };
  }

  const status = await getCustomersSyncStatus(storeId);

  if (!status.isStale) {
    return { triggered: false, reason: 'data_fresh', ageMinutes: status.ageMinutes };
  }

  // Mark as in progress
  refreshInProgress.customers.add(cacheKey);

  console.log(`[dataFreshness] Customers data is stale (${status.ageMinutes} min old), triggering background refresh for store: ${cacheKey}`);

  // Import and run sync in background (don't await)
  const { incrementalSyncAllStores } = require('../jobs/customersSync');

  incrementalSyncAllStores()
    .then((summary) => {
      console.log('[dataFreshness] Customers background refresh completed:', JSON.stringify(summary, null, 2));
    })
    .catch((err) => {
      console.error('[dataFreshness] Customers background refresh failed:', err.message);
    })
    .finally(() => {
      refreshInProgress.customers.delete(cacheKey);
    });

  return { triggered: true, reason: 'stale_data', ageMinutes: status.ageMinutes };
}

/**
 * Get freshness info for both orders and customers
 * @param {string} storeId - Store ID or 'all'
 * @returns {Promise<{orders: object, customers: object}>}
 */
async function getDataFreshnessStatus(storeId = 'all') {
  const [orders, customers] = await Promise.all([
    getOrdersSyncStatus(storeId),
    getCustomersSyncStatus(storeId),
  ]);

  return { orders, customers };
}

module.exports = {
  getOrdersSyncStatus,
  getCustomersSyncStatus,
  triggerOrdersRefreshIfStale,
  triggerCustomersRefreshIfStale,
  getDataFreshnessStatus,
  STALE_THRESHOLD_MS,
};
