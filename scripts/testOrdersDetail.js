#!/usr/bin/env node
// scripts/testOrdersDetail.js
// Test script to verify orders_detail table and service functionality

const { initDb, query } = require('../lib/db');
const { upsertOrderDetails, getOrderDetail, getOrderDetailsCount } = require('../services/ordersDetailService');

async function main() {
  console.log('Testing orders_detail implementation...\n');

  try {
    // 1. Initialize database (creates tables if they don't exist)
    console.log('[1/5] Initializing database...');
    await initDb();
    console.log('✓ Database initialized\n');

    // 2. Verify orders_detail table exists
    console.log('[2/5] Verifying orders_detail table...');
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'orders_detail'
    `);
    if (tableCheck.rows.length === 0) {
      throw new Error('orders_detail table not found!');
    }
    console.log('✓ orders_detail table exists\n');

    // 3. Verify table structure
    console.log('[3/5] Checking table columns...');
    const columnsCheck = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'orders_detail'
      ORDER BY ordinal_position
    `);
    console.log('Columns:');
    columnsCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    // 4. Test upsert functionality
    console.log('[4/5] Testing upsert functionality...');
    const testOrders = [
      {
        id: 999999001,
        name: '#TEST-001',
        order_number: 1001,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        financial_status: 'paid',
        fulfillment_status: 'fulfilled',
        total_price: '99.99',
        currency: 'RON',
        email: 'test@example.com',
        phone: '+40700000000',
        customer: {
          id: 123456,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        },
        line_items: [
          { id: 1, name: 'Test Product', quantity: 2, price: '49.99' },
        ],
        billing_address: { city: 'Bucharest', country: 'Romania' },
        shipping_address: { city: 'Bucharest', country: 'Romania' },
      },
      {
        id: 999999002,
        name: '#TEST-002',
        order_number: 1002,
        created_at: '2024-01-16T11:00:00Z',
        updated_at: '2024-01-16T11:00:00Z',
        financial_status: 'pending',
        fulfillment_status: null,
        total_price: '149.99',
        currency: 'RON',
        email: 'test2@example.com',
        customer: { id: 123457, email: 'test2@example.com' },
        line_items: [
          { id: 2, name: 'Another Product', quantity: 1, price: '149.99' },
        ],
      },
    ];

    const result = await upsertOrderDetails('test_store', testOrders);
    console.log(`✓ Upserted ${result.upserted} order details\n`);

    // 5. Test retrieval
    console.log('[5/5] Testing retrieval...');
    const retrieved = await getOrderDetail('test_store', 999999001);
    if (!retrieved) {
      throw new Error('Failed to retrieve test order!');
    }
    console.log('Retrieved order:');
    console.log(`  - ID: ${retrieved.id}`);
    console.log(`  - Name: ${retrieved.name}`);
    console.log(`  - Email: ${retrieved.email}`);
    console.log(`  - Total: ${retrieved.total_price} ${retrieved.currency}`);
    console.log(`  - Line items: ${retrieved.line_items.length}`);
    console.log(`  - Fetched at: ${retrieved._db_fetched_at}`);
    console.log('');

    // Get count
    const count = await getOrderDetailsCount('test_store');
    console.log(`✓ Total order details in test_store: ${count}\n`);

    // Cleanup test data
    console.log('Cleaning up test data...');
    await query(`DELETE FROM orders_detail WHERE store_id = 'test_store'`);
    console.log('✓ Test data cleaned up\n');

    console.log('✅ All tests passed!\n');
    console.log('orders_detail table is ready for production use.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
