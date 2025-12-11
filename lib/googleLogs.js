// lib/googleLogs.js
// Helpers for interacting with the Logs spreadsheet (OrdersLog, CustomersLog).
const { getSheetsClient, loadSheet } = require('./google');
const { parseDateParam } = require('./orderUtils');

const ORDERS_SHEET = 'OrdersLog';
const CUSTOMERS_SHEET = 'CustomersLog';

const ORDER_HEADERS = [
  'store_id',
  'store_name',
  'shopify_domain',
  'order_id',
  'order_name',
  'order_number',
  'created_at',
  'updated_at',
  'financial_status',
  'fulfillment_status',
  'currency',
  'total_price',
  'items_count',
  'items_summary',
  'customer_id',
  'customer_email',
  'customer_name',
  'raw_json',
];

const CUSTOMER_HEADERS = [
  'store_id',
  'store_name',
  'customer_id',
  'customer_email',
  'customer_name',
  'first_order_date',
  'last_order_date',
  'total_orders',
  'total_spent',
  'currency',
  'created_at',
  'updated_at',
];

function getLogsSpreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_LOGS_ID;
  if (!id) {
    throw new Error('Missing GOOGLE_SHEETS_LOGS_ID env var');
  }
  return id;
}

function buildOrderKey(row) {
  if (!row) return null;
  const storeId = row.store_id || row.storeId;
  const orderId = row.order_id || row.orderId || row.id;
  if (!storeId || !orderId) return null;
  return `${storeId}::${orderId}`;
}

function buildCustomerKey(row) {
  if (!row) return null;
  const storeId = row.store_id || row.storeId;
  const customerId = row.customer_id || row.customerId;
  const email = row.customer_email || row.customerEmail || row.email;
  if (storeId && customerId) return `${storeId}::${customerId}`;
  if (storeId && email) return `${storeId}::${email}`;
  return null;
}

function mapRowValues(headers, obj) {
  return headers.map((h) => (obj[h] !== undefined && obj[h] !== null ? obj[h] : ''));
}

function buildIndex(rows = [], keyBuilder = buildOrderKey) {
  const index = new Map();
  let maxRowIndex = 1;
  rows.forEach((row) => {
    const key = keyBuilder(row);
    if (!key) return;
    const rowIndex = Number(row._rowIndex || 0);
    if (rowIndex > maxRowIndex) {
      maxRowIndex = rowIndex;
    }
    index.set(key, rowIndex);
  });
  return { index, nextRow: maxRowIndex + 1 };
}

async function loadOrdersLogSheet() {
  const spreadsheetId = getLogsSpreadsheetId();
  return loadSheet(spreadsheetId, ORDERS_SHEET);
}

async function loadCustomersLogSheet() {
  const spreadsheetId = getLogsSpreadsheetId();
  return loadSheet(spreadsheetId, CUSTOMERS_SHEET);
}

async function upsertOrdersLogRows(rows, options = {}) {
  if (!Array.isArray(rows) || !rows.length) {
    return { updated: 0, appended: 0, total: 0 };
  }

  const seenKeys = new Set();
  const deduped = [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const key = buildOrderKey(rows[i]);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.unshift(rows[i]);
  }

  const spreadsheetId = getLogsSpreadsheetId();
  const sheets = await getSheetsClient();
  const existingRows = options.existingRows || (await loadOrdersLogSheet()).rows || [];
  const indexInfo = options.indexInfo || buildIndex(existingRows, buildOrderKey);
  const index = indexInfo.index;
  let nextRow = options.nextRow || indexInfo.nextRow;

  const updates = [];
  const appends = [];

  deduped.forEach((row) => {
    const key = buildOrderKey(row);
    if (!key) return;
    const values = mapRowValues(ORDER_HEADERS, row);
    const existingRowIndex = index.get(key);
    if (existingRowIndex) {
      updates.push({
        range: `${ORDERS_SHEET}!A${existingRowIndex}:R${existingRowIndex}`,
        values: [values],
      });
    } else {
      appends.push(values);
      index.set(key, nextRow);
      nextRow += 1;
    }
  });

  let updated = 0;
  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        data: updates,
        valueInputOption: 'RAW',
      },
    });
    updated = updates.length;
  }

  let appended = 0;
  if (appends.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: ORDERS_SHEET,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: appends,
      },
    });
    appended = appends.length;
  }

  return { updated, appended, total: updated + appended, indexInfo: { index, nextRow } };
}

async function appendOrdersLogRows(rows) {
  return upsertOrdersLogRows(rows);
}

async function upsertCustomersLogRows(rows, options = {}) {
  if (!Array.isArray(rows) || !rows.length) {
    return { updated: 0, appended: 0, total: 0 };
  }

  const seenKeys = new Set();
  const deduped = [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const key = buildCustomerKey(rows[i]);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.unshift(rows[i]);
  }

  const spreadsheetId = getLogsSpreadsheetId();
  const sheets = await getSheetsClient();
  const existingRows = options.existingRows || (await loadCustomersLogSheet()).rows || [];
  const indexInfo = options.indexInfo || buildIndex(existingRows, buildCustomerKey);
  const index = indexInfo.index;
  let nextRow = options.nextRow || indexInfo.nextRow;

  const updates = [];
  const appends = [];

  deduped.forEach((row) => {
    const key = buildCustomerKey(row);
    if (!key) return;
    const values = mapRowValues(CUSTOMER_HEADERS, row);
    const existingRowIndex = index.get(key);
    if (existingRowIndex) {
      updates.push({
        range: `${CUSTOMERS_SHEET}!A${existingRowIndex}:L${existingRowIndex}`,
        values: [values],
      });
    } else {
      appends.push(values);
      index.set(key, nextRow);
      nextRow += 1;
    }
  });

  let updated = 0;
  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        data: updates,
        valueInputOption: 'RAW',
      },
    });
    updated = updates.length;
  }

  let appended = 0;
  if (appends.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: CUSTOMERS_SHEET,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: appends,
      },
    });
    appended = appends.length;
  }

  return { updated, appended, total: updated + appended, indexInfo: { index, nextRow } };
}

function matchesOrderStatus(row, status) {
  if (!status || status === 'all') return true;
  const fin = (row.financial_status || '').toLowerCase();
  const full = (row.fulfillment_status || '').toLowerCase();
  const normalized = status.toLowerCase();
  if (normalized === 'paid') return fin === 'paid';
  if (normalized === 'fulfilled') return full === 'fulfilled';
  if (normalized === 'cancelled')
    return full === 'cancelled' || fin === 'voided' || fin === 'refunded';
  if (normalized === 'open') return full !== 'cancelled';
  return true;
}

function orderRowMatchesSearch(row, search) {
  if (!search) return true;
  const needle = search.toLowerCase();
  const haystack = [
    row.order_id,
    row.order_name,
    row.order_number,
    row.customer_name,
    row.customer_email,
    row.items_summary,
    row.store_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

function filterOrdersRows(rows = [], filters = {}) {
  const { storeId = 'all', from, to, status = 'all', q } = filters;
  const minDate = parseDateParam(from, false);
  const maxDate = parseDateParam(to, true);
  const search = (q || '').trim().toLowerCase();

  return rows.filter((row) => {
    if (storeId && storeId !== 'all' && String(row.store_id) !== String(storeId)) {
      return false;
    }
    if (minDate && row.created_at && new Date(row.created_at) < new Date(minDate)) {
      return false;
    }
    if (maxDate && row.created_at && new Date(row.created_at) > new Date(maxDate)) {
      return false;
    }
    if (!matchesOrderStatus(row, status)) {
      return false;
    }
    if (!orderRowMatchesSearch(row, search)) {
      return false;
    }
    return true;
  });
}

async function readOrdersLog(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 100, 1), 500);

  const sheet = await loadOrdersLogSheet();
  const rows = sheet.rows || [];
  const filtered = filterOrdersRows(rows, filters);

  filtered.sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });

  const start = (page - 1) * limit;
  const sliced = filtered.slice(start, start + limit);
  const total = filtered.length;

  return {
    rows: sliced,
    total,
    page,
    limit,
    hasNext: start + sliced.length < total,
    hasPrev: page > 1 && start > 0,
  };
}

function customerRowMatchesSearch(row, search) {
  if (!search) return true;
  const haystack = [
    row.customer_name,
    row.customer_email,
    row.customer_id,
    row.store_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function filterCustomersRows(rows = [], filters = {}) {
  const { storeId = 'all', from, to, q } = filters;
  const minDate = parseDateParam(from, false);
  const maxDate = parseDateParam(to, true);
  const search = (q || '').trim().toLowerCase();

  return rows.filter((row) => {
    if (storeId && storeId !== 'all' && String(row.store_id) !== String(storeId)) {
      return false;
    }
    if (minDate && row.last_order_date && new Date(row.last_order_date) < new Date(minDate)) {
      return false;
    }
    if (maxDate && row.last_order_date && new Date(row.last_order_date) > new Date(maxDate)) {
      return false;
    }
    if (!customerRowMatchesSearch(row, search)) {
      return false;
    }
    return true;
  });
}

async function readCustomersLog(filters = {}) {
  const page = Math.max(parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 100, 1), 500);

  const sheet = await loadCustomersLogSheet();
  const rows = sheet.rows || [];
  const filtered = filterCustomersRows(rows, filters);

  filtered.sort((a, b) => {
    const ta = a.last_order_date ? Date.parse(a.last_order_date) : 0;
    const tb = b.last_order_date ? Date.parse(b.last_order_date) : 0;
    return tb - ta;
  });

  const start = (page - 1) * limit;
  const sliced = filtered.slice(start, start + limit);
  const total = filtered.length;

  return {
    rows: sliced,
    total,
    page,
    limit,
    hasNext: start + sliced.length < total,
    hasPrev: page > 1 && start > 0,
  };
}

module.exports = {
  ORDER_HEADERS,
  CUSTOMER_HEADERS,
  getLogsSpreadsheetId,
  loadOrdersLogSheet,
  loadCustomersLogSheet,
  upsertOrdersLogRows,
  appendOrdersLogRows,
  upsertCustomersLogRows,
  readOrdersLog,
  readCustomersLog,
  filterOrdersRows,
  filterCustomersRows,
  buildOrderKey,
  buildCustomerKey,
  appendTestOrdersLogRow,
};

async function appendTestOrdersLogRow() {
  const spreadsheetId = getLogsSpreadsheetId();
  const sheets = await getSheetsClient();
  const nowIso = new Date().toISOString();
  const row = [
    'TEST',
    'TEST STORE',
    'test.myshopify.com',
    'TEST_ORDER',
    'Test Order',
    'TEST_NUMBER',
    nowIso,
    nowIso,
    '',
    '',
    'RON',
    '0',
    '0',
    'Test item',
    'TEST_CUSTOMER',
    'test@example.com',
    'Test Customer',
    '{}',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: ORDERS_SHEET,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [row],
    },
  });
  console.log('[googleLogs] appendTestOrdersLogRow: wrote 1 dummy row');
}
