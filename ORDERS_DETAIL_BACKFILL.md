# Orders Detail Backfill Guide

This document describes the new `orders_detail` table and how to safely run backfills.

## Overview

The `orders_detail` table stores complete Shopify order payloads as JSONB, enabling the Orders drawer/tabs to load full order information from the database without re-querying Shopify every time.

## Database Schema

### orders_detail Table

```sql
CREATE TABLE orders_detail (
  store_id TEXT NOT NULL,
  order_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_json JSONB NOT NULL,
  PRIMARY KEY (store_id, order_id)
);

-- Indexes
CREATE INDEX idx_orders_detail_updated_at ON orders_detail (updated_at DESC);
CREATE INDEX idx_orders_detail_store_updated_at ON orders_detail (store_id, updated_at DESC);
```

**Columns:**
- `store_id` - Store identifier
- `order_id` - Shopify order ID (numeric)
- `created_at` - Order creation timestamp (from Shopify)
- `updated_at` - Order last update timestamp (from Shopify)
- `fetched_at` - When we fetched this data from Shopify (auto-updated on upsert)
- `raw_json` - Complete Shopify order payload as JSONB

**Features:**
- Primary key on `(store_id, order_id)` ensures deduplication
- On conflict, updates `updated_at`, `fetched_at`, and `raw_json`
- JSONB type enables efficient querying and indexing if needed
- Indexes on `updated_at` for efficient sync queries

## Service API

### ordersDetailService.js

```javascript
// Batch upsert order details
await upsertOrderDetails(storeId, ordersArray);
// Returns: { upserted: number }

// Get single order detail
const order = await getOrderDetail(storeId, orderId);
// Returns: full order object or null

// Get multiple order details
const orders = await getOrderDetailsBatch(storeId, [orderId1, orderId2, ...]);
// Returns: array of order objects

// Check if order exists
const exists = await orderDetailExists(storeId, orderId);
// Returns: boolean

// Get count of stored orders
const count = await getOrderDetailsCount(storeId); // or 'all'
// Returns: number
```

## Testing the Implementation

Before running a full backfill, test the implementation:

```bash
# Test the orders_detail table and service
node scripts/testOrdersDetail.js
```

This will:
1. Initialize the database (create tables)
2. Verify `orders_detail` table exists
3. Check table structure
4. Test upsert functionality
5. Test retrieval functionality
6. Clean up test data

Expected output:
```
✅ All tests passed!
orders_detail table is ready for production use.
```

## Running Backfill

### Initial Backfill

The backfill will fetch all orders since `2024-01-01` and store both:
1. Index entries in `orders_index` (list fields only)
2. Full order details in `orders_detail` (complete JSON)

**Important:** The backfill now fetches ALL order fields including:
- `billing_address`
- `shipping_address`
- `customer`
- `line_items`

```bash
# Run the backfill
node jobs/runBackfill.js
```

### What to Expect

**Console Output:**
```
[backfill] Starting backfill for store: store_1
[backfill] store_1 - Page 10: 2500 fetched, 2500 index, 2500 details
[backfill] store_1 - Page 20: 5000 fetched, 5000 index, 5000 details
...
[backfill] store_1 - COMPLETE: 12345 fetched, 12345 index, 12345 details in 50 pages
```

**Logging:**
- Progress logged every 10 pages (configurable via `LOG_EVERY_N_PAGES`)
- Shows counts for both index upserts and detail upserts
- Logs start and completion for each store
- Errors are logged with store context

**Performance:**
- Processes orders in streaming batches (250 per page)
- Does NOT keep all orders in memory
- Each page upserts to DB immediately
- Safe for large datasets (10k+ orders)

### Incremental Sync

After backfill, run incremental sync to keep data up-to-date:

```bash
# Run incremental sync (fetches orders updated since last sync)
node jobs/runIncrementalSync.js
```

The incremental sync:
- Uses `updated_at` checkpoint from `sync_state` table
- Includes 10-minute safety window
- Updates both `orders_index` and `orders_detail`
- Also fetches ALL order fields

## Safety Considerations

### Before Running Backfill

1. **Database Backup:**
   ```bash
   # Create a backup if needed
   pg_dump $DATABASE_URL > backup_before_orders_detail.sql
   ```

2. **Check Database Space:**
   - Estimate: ~5-10KB per order in `orders_detail`
   - 10,000 orders ≈ 50-100 MB
   - 100,000 orders ≈ 500 MB - 1 GB

3. **Test Connection:**
   ```bash
   node scripts/testOrdersDetail.js
   ```

### Running Backfill Safely

1. **Start Fresh:**
   ```bash
   # Initialize tables (idempotent - safe to run multiple times)
   node -e "require('./lib/db').initDb().then(() => console.log('Done')).catch(console.error)"
   ```

2. **Run Backfill:**
   ```bash
   # This is safe to re-run - uses UPSERT (ON CONFLICT DO UPDATE)
   node jobs/runBackfill.js
   ```

3. **Monitor Progress:**
   - Watch console logs for progress updates
   - Check for errors per store
   - Verify counts match expectations

### Re-running Backfill

It's **safe to re-run the backfill** multiple times:
- Uses `ON CONFLICT (store_id, order_id) DO UPDATE`
- Will update existing records with latest data
- Won't create duplicates
- Useful for:
  - Recovering from partial failures
  - Refreshing data
  - Adding new stores

### Troubleshooting

**If backfill fails mid-way:**
1. Check error logs for specific store
2. Fix the issue (e.g., missing access token)
3. Re-run backfill - it will resume/update from where it stopped

**If you need to reset:**
```sql
-- Clear all order details (CAUTION!)
DELETE FROM orders_detail;

-- Clear sync state to re-run backfill
DELETE FROM sync_state;
```

## Verification

After backfill, verify the data:

```sql
-- Check total orders stored
SELECT store_id, COUNT(*) as order_count
FROM orders_detail
GROUP BY store_id;

-- Check a sample order
SELECT
  store_id,
  order_id,
  raw_json->>'name' as order_name,
  raw_json->>'total_price' as total_price,
  jsonb_array_length(raw_json->'line_items') as items_count,
  fetched_at
FROM orders_detail
LIMIT 5;

-- Check index vs details counts (should match)
SELECT
  'index' as source,
  store_id,
  COUNT(*) as count
FROM orders_index
GROUP BY store_id

UNION ALL

SELECT
  'detail' as source,
  store_id,
  COUNT(*) as count
FROM orders_detail
GROUP BY store_id
ORDER BY store_id, source;
```

## Next Steps

Once the backfill is complete:

1. **Verify Data:**
   - Run verification queries above
   - Check a few orders manually in the UI

2. **Update API Endpoints:**
   - Modify `/orders/:store_id/:order_id` to use `getOrderDetail()`
   - Fall back to Shopify API if not in DB

3. **Schedule Incremental Sync:**
   - Run `incrementalSyncAllStores()` periodically (e.g., every 15 minutes)
   - Keeps `orders_detail` up-to-date

4. **Monitor:**
   - Watch database size growth
   - Monitor query performance
   - Check sync job logs

## File Changes Summary

### New Files:
- `services/ordersDetailService.js` - Service for order detail operations
- `scripts/testOrdersDetail.js` - Test script for validation
- `ORDERS_DETAIL_BACKFILL.md` - This documentation

### Modified Files:
- `lib/db.js` - Added `orders_detail` table creation
- `jobs/ordersSync.js` - Updated to persist full order payloads
  - Imports `upsertOrderDetails`
  - Fetches ALL order fields (not just list fields)
  - Stores raw JSON in `orders_detail`
  - Added detailed logging
  - Updated summary objects to include `details_upserted`

### No Changes Required:
- UI files (no changes in this step)
- API routes (will be updated in next step)
- `ordersIndexService.js` (unchanged)
