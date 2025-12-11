// lib/stores.js
const { loadSheet } = require('./google');

async function loadStoresRows() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    throw new Error('Missing GOOGLE_SHEETS_ID env var');
  }
  const storesSheet = await loadSheet(spreadsheetId, 'Stores');
  return storesSheet.rows || [];
}

module.exports = {
  loadStoresRows,
};
