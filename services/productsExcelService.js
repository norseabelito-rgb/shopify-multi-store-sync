// services/productsExcelService.js
// Excel (.xlsx) Import/Export functionality for Products Module
// Handles master product bulk operations via Excel files

const XLSX = require('xlsx');
const { getMasterProducts, bulkUpsertMasterProducts } = require('./productsService');

// Excel column definitions
const EXCEL_COLUMNS = [
  'sku',
  'title_default',
  'description_default',
  'price_default',
  'compare_at_price_default',
  'cost',
  'seo_title_default',
  'seo_meta_default',
  'drive_folder_url',
];

// Human-readable column headers for Excel
const COLUMN_HEADERS = {
  sku: 'SKU',
  title_default: 'Titlu',
  description_default: 'Descriere',
  price_default: 'Pret (RON)',
  compare_at_price_default: 'Pret vechi',
  cost: 'Cost produs',
  seo_title_default: 'SEO Title',
  seo_meta_default: 'SEO Meta',
  drive_folder_url: 'Google Drive URL',
};

const REQUIRED_COLUMNS = ['sku', 'title_default'];

/**
 * Generate Excel template with headers and example row
 * @returns {Buffer} Excel file buffer
 */
function generateExcelTemplate() {
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();

  // Headers row
  const headers = EXCEL_COLUMNS.map(col => COLUMN_HEADERS[col] || col);

  // Example data row
  const exampleRow = [
    'SKU-001',
    'Nume Produs Exemplu',
    'Descriere produs aici (poate include HTML)',
    99.99,
    149.99,
    45.00,
    'Titlu SEO (max 70 caractere)',
    'Meta descriere SEO (max 160 caractere)',
    'https://drive.google.com/drive/folders/...',
  ];

  // Create worksheet data
  const wsData = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths for better readability
  ws['!cols'] = [
    { wch: 15 },  // SKU
    { wch: 30 },  // Titlu
    { wch: 40 },  // Descriere
    { wch: 12 },  // Pret
    { wch: 12 },  // Pret vechi
    { wch: 12 },  // Cost
    { wch: 25 },  // SEO Title
    { wch: 35 },  // SEO Meta
    { wch: 45 },  // Drive URL
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Produse');

  // Generate buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Export all master products to Excel
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function exportMasterProductsToExcel() {
  const { products } = await getMasterProducts({ limit: 10000, sortBy: 'sku', sortOrder: 'asc' });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();

  // Headers row
  const headers = EXCEL_COLUMNS.map(col => COLUMN_HEADERS[col] || col);

  // Data rows
  const dataRows = products.map(p => {
    return EXCEL_COLUMNS.map(col => {
      const value = p[col];
      if (value === null || value === undefined) return '';
      return value;
    });
  });

  // Create worksheet
  const wsData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 },  // SKU
    { wch: 30 },  // Titlu
    { wch: 40 },  // Descriere
    { wch: 12 },  // Pret
    { wch: 12 },  // Pret vechi
    { wch: 12 },  // Cost
    { wch: 25 },  // SEO Title
    { wch: 35 },  // SEO Meta
    { wch: 45 },  // Drive URL
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Produse');

  // Generate buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Parse Excel buffer to array of products
 * @param {Buffer} buffer - Excel file buffer
 * @returns {{products: Array, errors: Array}} Parsed products and validation errors
 */
function parseExcel(buffer) {
  const errors = [];
  const products = [];

  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    errors.push({ row: 0, error: `Fișierul nu este un Excel valid: ${err.message}` });
    return { products, errors };
  }

  // Get first sheet
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    errors.push({ row: 0, error: 'Fișierul Excel nu conține nicio foaie de calcul' });
    return { products, errors };
  }

  const ws = wb.Sheets[sheetName];

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (data.length < 2) {
    errors.push({ row: 0, error: 'Fișierul Excel trebuie să conțină cel puțin headerul și o linie de date' });
    return { products, errors };
  }

  // Parse header - map human-readable names back to column names
  const headerRow = data[0];
  const columnMap = {};

  // Create reverse mapping from human-readable to column name
  const reverseHeaders = {};
  for (const [col, header] of Object.entries(COLUMN_HEADERS)) {
    reverseHeaders[header.toLowerCase()] = col;
  }

  headerRow.forEach((header, index) => {
    const normalizedHeader = String(header).trim().toLowerCase();

    // Try to find matching column
    let columnName = reverseHeaders[normalizedHeader];

    // Also check if header is the raw column name
    if (!columnName && EXCEL_COLUMNS.includes(normalizedHeader)) {
      columnName = normalizedHeader;
    }

    if (columnName) {
      columnMap[columnName] = index;
    }
  });

  // Validate required columns
  for (const requiredCol of REQUIRED_COLUMNS) {
    if (!(requiredCol in columnMap)) {
      const humanName = COLUMN_HEADERS[requiredCol] || requiredCol;
      errors.push({ row: 0, error: `Coloana obligatorie "${humanName}" lipsește din header` });
    }
  }

  if (errors.length > 0) {
    return { products, errors };
  }

  // Parse data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip completely empty rows
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue;
    }

    try {
      const product = {};

      // Map columns to product fields
      for (const col of EXCEL_COLUMNS) {
        const index = columnMap[col];
        if (index !== undefined && index < row.length) {
          let value = row[index];

          // Clean up value
          if (value === null || value === undefined) {
            value = '';
          }
          value = String(value).trim();

          // Handle numeric fields
          if (['price_default', 'compare_at_price_default', 'cost'].includes(col)) {
            if (value && value !== '') {
              // Handle both comma and dot as decimal separator
              const num = parseFloat(value.replace(',', '.'));
              if (isNaN(num)) {
                const sku = row[columnMap.sku] || '?';
                errors.push({ row: i + 1, sku, error: `Valoare numerică invalidă pentru "${COLUMN_HEADERS[col]}": ${value}` });
              } else {
                product[col] = num;
              }
            } else {
              product[col] = null;
            }
          } else {
            product[col] = value || null;
          }
        }
      }

      // Validate required fields
      if (!product.sku || !product.sku.trim()) {
        errors.push({ row: i + 1, error: 'SKU este obligatoriu' });
        continue;
      }

      if (!product.title_default || !product.title_default.trim()) {
        errors.push({ row: i + 1, sku: product.sku, error: 'Titlul este obligatoriu' });
        continue;
      }

      // Validate SEO lengths (warnings, not errors)
      if (product.seo_title_default && product.seo_title_default.length > 70) {
        console.log(`[excel] Warning: SEO title for ${product.sku} exceeds 70 characters`);
      }

      if (product.seo_meta_default && product.seo_meta_default.length > 160) {
        console.log(`[excel] Warning: SEO meta for ${product.sku} exceeds 160 characters`);
      }

      products.push(product);
    } catch (err) {
      errors.push({ row: i + 1, error: `Eroare la parsarea rândului: ${err.message}` });
    }
  }

  return { products, errors };
}

/**
 * Import products from Excel buffer
 * @param {Buffer} buffer - Excel file buffer
 * @returns {Promise<object>} Import results
 */
async function importFromExcel(buffer) {
  console.log('[excel] Starting Excel import...');

  // Parse Excel
  const { products, errors: parseErrors } = parseExcel(buffer);

  if (parseErrors.length > 0 && products.length === 0) {
    console.log(`[excel] Parse failed with ${parseErrors.length} errors`);
    return {
      success: false,
      parseErrors,
      imported: 0,
      updated: 0,
      errors: [],
    };
  }

  console.log(`[excel] Parsed ${products.length} products, ${parseErrors.length} parse errors`);

  // Bulk upsert products
  const { inserted, updated, errors: importErrors } = await bulkUpsertMasterProducts(products);

  console.log(`[excel] Import complete: ${inserted} inserted, ${updated} updated, ${importErrors.length} errors`);

  return {
    success: true,
    parseErrors,
    imported: inserted,
    updated,
    errors: importErrors,
    total: products.length,
  };
}

/**
 * Validate Excel content without importing
 * @param {Buffer} buffer - Excel file buffer
 * @returns {object} Validation results
 */
function validateExcel(buffer) {
  const { products, errors } = parseExcel(buffer);

  return {
    valid: errors.length === 0,
    productCount: products.length,
    errors,
    preview: products.slice(0, 5), // First 5 products for preview
  };
}

module.exports = {
  EXCEL_COLUMNS,
  REQUIRED_COLUMNS,
  COLUMN_HEADERS,
  generateExcelTemplate,
  exportMasterProductsToExcel,
  parseExcel,
  importFromExcel,
  validateExcel,
};
