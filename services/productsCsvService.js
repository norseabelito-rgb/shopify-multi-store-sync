// services/productsCsvService.js
// CSV Import/Export functionality for Products Module
// Handles master product bulk operations via CSV

const { getMasterProducts, bulkUpsertMasterProducts } = require('./productsService');

// CSV column definitions
const CSV_COLUMNS = [
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

const REQUIRED_COLUMNS = ['sku', 'title_default'];

/**
 * Generate CSV template (empty with headers)
 * @returns {string} CSV content
 */
function generateCsvTemplate() {
  const header = CSV_COLUMNS.join(',');
  const exampleRow = [
    'SKU-001',
    'Nume Produs Exemplu',
    'Descriere produs aici (poate include HTML)',
    '99.99',
    '149.99',
    '45.00',
    'Titlu SEO (max 70 caractere)',
    'Meta descriere SEO (max 160 caractere)',
    'https://drive.google.com/drive/folders/...',
  ].map(escapeCSVField).join(',');

  return `${header}\n${exampleRow}`;
}

/**
 * Export all master products to CSV
 * @returns {Promise<string>} CSV content
 */
async function exportMasterProductsToCsv() {
  const { products } = await getMasterProducts({ limit: 10000, sortBy: 'sku', sortOrder: 'asc' });

  const header = CSV_COLUMNS.join(',');

  const rows = products.map(p => {
    return CSV_COLUMNS.map(col => {
      const value = p[col];
      return escapeCSVField(value);
    }).join(',');
  });

  return `${header}\n${rows.join('\n')}`;
}

/**
 * Escape a field for CSV output
 * @param {any} value - Field value
 * @returns {string} Escaped CSV field
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Parse CSV content to array of products
 * @param {string} csvContent - Raw CSV content
 * @returns {{products: Array, errors: Array}} Parsed products and validation errors
 */
function parseCsv(csvContent) {
  const errors = [];
  const products = [];

  // Handle different line endings
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  if (lines.length < 2) {
    errors.push({ row: 0, error: 'Fișierul CSV trebuie să conțină cel puțin headerul și o linie de date' });
    return { products, errors };
  }

  // Parse header
  const header = parseCSVLine(lines[0]);
  const columnMap = {};

  header.forEach((col, index) => {
    const normalizedCol = col.trim().toLowerCase();
    columnMap[normalizedCol] = index;
  });

  // Validate required columns
  for (const requiredCol of REQUIRED_COLUMNS) {
    if (!(requiredCol in columnMap)) {
      errors.push({ row: 0, error: `Coloana obligatorie "${requiredCol}" lipsește din header` });
    }
  }

  if (errors.length > 0) {
    return { products, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    try {
      const values = parseCSVLine(line);
      const product = {};

      // Map columns to product fields
      for (const col of CSV_COLUMNS) {
        const index = columnMap[col];
        if (index !== undefined && index < values.length) {
          const value = values[index]?.trim();

          // Handle numeric fields
          if (['price_default', 'compare_at_price_default', 'cost'].includes(col)) {
            if (value && value !== '') {
              const num = parseFloat(value.replace(',', '.'));
              if (isNaN(num)) {
                errors.push({ row: i + 1, sku: values[columnMap.sku], error: `Valoare numerică invalidă pentru "${col}": ${value}` });
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
        errors.push({ row: i + 1, sku: product.sku, error: 'Titlul (title_default) este obligatoriu' });
        continue;
      }

      // Validate SEO lengths (warnings, not errors)
      if (product.seo_title_default && product.seo_title_default.length > 70) {
        // Just a warning, still add the product
        console.log(`[csv] Warning: SEO title for ${product.sku} exceeds 70 characters`);
      }

      if (product.seo_meta_default && product.seo_meta_default.length > 160) {
        console.log(`[csv] Warning: SEO meta for ${product.sku} exceeds 160 characters`);
      }

      products.push(product);
    } catch (err) {
      errors.push({ row: i + 1, error: `Eroare la parsarea liniei: ${err.message}` });
    }
  }

  return { products, errors };
}

/**
 * Parse a single CSV line, handling quoted fields
 * @param {string} line - CSV line
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // End of field
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Add last field
  fields.push(current);

  return fields;
}

/**
 * Import products from CSV content
 * @param {string} csvContent - Raw CSV content
 * @returns {Promise<object>} Import results
 */
async function importFromCsv(csvContent) {
  console.log('[csv] Starting CSV import...');

  // Parse CSV
  const { products, errors: parseErrors } = parseCsv(csvContent);

  if (parseErrors.length > 0 && products.length === 0) {
    console.log(`[csv] Parse failed with ${parseErrors.length} errors`);
    return {
      success: false,
      parseErrors,
      imported: 0,
      updated: 0,
      errors: [],
    };
  }

  console.log(`[csv] Parsed ${products.length} products, ${parseErrors.length} parse errors`);

  // Bulk upsert products
  const { inserted, updated, errors: importErrors } = await bulkUpsertMasterProducts(products);

  console.log(`[csv] Import complete: ${inserted} inserted, ${updated} updated, ${importErrors.length} errors`);

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
 * Validate CSV content without importing
 * @param {string} csvContent - Raw CSV content
 * @returns {object} Validation results
 */
function validateCsv(csvContent) {
  const { products, errors } = parseCsv(csvContent);

  return {
    valid: errors.length === 0,
    productCount: products.length,
    errors,
    preview: products.slice(0, 5), // First 5 products for preview
  };
}

module.exports = {
  CSV_COLUMNS,
  REQUIRED_COLUMNS,
  generateCsvTemplate,
  exportMasterProductsToCsv,
  parseCsv,
  parseCSVLine,
  importFromCsv,
  validateCsv,
  escapeCSVField,
};
