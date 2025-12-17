// services/productsService.js
// Core Products Module Service
// Handles CRUD operations for master products, store overrides, and sync metadata
// SKU is the PRIMARY KEY and is NOT editable

const { query } = require('../lib/db');

// ==================== MASTER PRODUCTS ====================

/**
 * Get all master products with optional filters
 * @param {object} options - Query options
 * @param {string} options.search - Search term (SKU or title)
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - 'asc' or 'desc'
 * @param {number} options.limit - Max results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<{products: Array, total: number}>}
 */
async function getMasterProducts(options = {}) {
  const {
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 100,
    offset = 0,
  } = options;

  // Validate sort fields to prevent SQL injection
  const allowedSortFields = ['sku', 'title_default', 'price_default', 'cost', 'created_at', 'updated_at'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = '';
  const params = [];

  if (search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    whereClause = `WHERE LOWER(sku) LIKE $1 OR LOWER(title_default) LIKE $1`;
  }

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM products_master ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get products
  const sql = `
    SELECT
      sku,
      title_default,
      description_default,
      price_default,
      compare_at_price_default,
      cost,
      seo_title_default,
      seo_meta_default,
      drive_folder_url,
      created_at,
      updated_at
    FROM products_master
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const result = await query(sql, [...params, limit, offset]);

  return {
    products: result.rows,
    total,
    limit,
    offset,
  };
}

/**
 * Get a single master product by SKU
 * @param {string} sku - Product SKU
 * @returns {Promise<object|null>}
 */
async function getMasterProductBySku(sku) {
  const result = await query(
    `SELECT * FROM products_master WHERE sku = $1`,
    [sku]
  );
  return result.rows[0] || null;
}

/**
 * Create a new master product
 * @param {object} product - Product data
 * @returns {Promise<object>} Created product
 */
async function createMasterProduct(product) {
  const {
    sku,
    title_default,
    description_default = null,
    price_default = 0,
    compare_at_price_default = null,
    cost = null,
    seo_title_default = null,
    seo_meta_default = null,
    drive_folder_url = null,
  } = product;

  if (!sku || !sku.trim()) {
    throw new Error('SKU is required');
  }

  if (!title_default || !title_default.trim()) {
    throw new Error('Title is required');
  }

  const result = await query(
    `INSERT INTO products_master (
      sku, title_default, description_default, price_default, compare_at_price_default,
      cost, seo_title_default, seo_meta_default, drive_folder_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      sku.trim(),
      title_default.trim(),
      description_default,
      parseFloat(price_default) || 0,
      compare_at_price_default != null ? parseFloat(compare_at_price_default) : null,
      cost != null ? parseFloat(cost) : null,
      seo_title_default,
      seo_meta_default,
      drive_folder_url,
    ]
  );

  console.log(`[products] Created master product: ${sku}`);
  return result.rows[0];
}

/**
 * Update a master product (SKU cannot be changed)
 * @param {string} sku - Product SKU
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated product
 */
async function updateMasterProduct(sku, updates) {
  // Remove SKU from updates if present (SKU is not editable)
  const { sku: _ignoredSku, ...safeUpdates } = updates;

  const allowedFields = [
    'title_default', 'description_default', 'price_default', 'compare_at_price_default',
    'cost', 'seo_title_default', 'seo_meta_default', 'drive_folder_url'
  ];

  const setClauses = [];
  const params = [sku];
  let paramIndex = 2;

  for (const field of allowedFields) {
    if (field in safeUpdates) {
      setClauses.push(`${field} = $${paramIndex}`);

      // Handle numeric fields
      if (['price_default', 'compare_at_price_default', 'cost'].includes(field)) {
        params.push(safeUpdates[field] != null ? parseFloat(safeUpdates[field]) : null);
      } else {
        params.push(safeUpdates[field]);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    throw new Error('No valid fields to update');
  }

  setClauses.push(`updated_at = NOW()`);

  const sql = `
    UPDATE products_master
    SET ${setClauses.join(', ')}
    WHERE sku = $1
    RETURNING *
  `;

  const result = await query(sql, params);

  if (result.rows.length === 0) {
    throw new Error(`Product with SKU "${sku}" not found`);
  }

  console.log(`[products] Updated master product: ${sku}`);
  return result.rows[0];
}

/**
 * Delete a master product (cascades to overrides and sync records)
 * @param {string} sku - Product SKU
 * @returns {Promise<boolean>}
 */
async function deleteMasterProduct(sku) {
  const result = await query(
    `DELETE FROM products_master WHERE sku = $1 RETURNING sku`,
    [sku]
  );

  if (result.rows.length === 0) {
    throw new Error(`Product with SKU "${sku}" not found`);
  }

  console.log(`[products] Deleted master product: ${sku}`);
  return true;
}

/**
 * Bulk upsert master products (for CSV import)
 * @param {Array} products - Array of product objects
 * @returns {Promise<{inserted: number, updated: number, errors: Array}>}
 */
async function bulkUpsertMasterProducts(products) {
  const results = {
    inserted: 0,
    updated: 0,
    errors: [],
  };

  for (const product of products) {
    try {
      if (!product.sku || !product.sku.trim()) {
        results.errors.push({ sku: product.sku || 'EMPTY', error: 'SKU is required' });
        continue;
      }

      if (!product.title_default || !product.title_default.trim()) {
        results.errors.push({ sku: product.sku, error: 'Title is required' });
        continue;
      }

      const existing = await getMasterProductBySku(product.sku.trim());

      if (existing) {
        await updateMasterProduct(product.sku.trim(), product);
        results.updated++;
      } else {
        await createMasterProduct(product);
        results.inserted++;
      }
    } catch (err) {
      results.errors.push({ sku: product.sku, error: err.message });
    }
  }

  console.log(`[products] Bulk upsert: ${results.inserted} inserted, ${results.updated} updated, ${results.errors.length} errors`);
  return results;
}

// ==================== STORE OVERRIDES ====================

/**
 * Get store override for a product
 * @param {string} sku - Product SKU
 * @param {string} storeId - Store ID
 * @returns {Promise<object|null>}
 */
async function getStoreOverride(sku, storeId) {
  const result = await query(
    `SELECT * FROM products_store_overrides WHERE sku = $1 AND store_id = $2`,
    [sku, storeId]
  );
  return result.rows[0] || null;
}

/**
 * Get all store overrides for a product
 * @param {string} sku - Product SKU
 * @returns {Promise<Array>}
 */
async function getAllStoreOverrides(sku) {
  const result = await query(
    `SELECT * FROM products_store_overrides WHERE sku = $1 ORDER BY store_id`,
    [sku]
  );
  return result.rows;
}

/**
 * Create or update store override
 * @param {string} sku - Product SKU
 * @param {string} storeId - Store ID
 * @param {object} overrides - Override fields (null = use master default)
 * @returns {Promise<object>}
 */
async function upsertStoreOverride(sku, storeId, overrides) {
  const {
    title_override = null,
    description_override = null,
    price_override = null,
    compare_at_price_override = null,
    seo_title_override = null,
    seo_meta_override = null,
  } = overrides;

  const result = await query(
    `INSERT INTO products_store_overrides (
      sku, store_id, title_override, description_override, price_override,
      compare_at_price_override, seo_title_override, seo_meta_override
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (sku, store_id) DO UPDATE SET
      title_override = EXCLUDED.title_override,
      description_override = EXCLUDED.description_override,
      price_override = EXCLUDED.price_override,
      compare_at_price_override = EXCLUDED.compare_at_price_override,
      seo_title_override = EXCLUDED.seo_title_override,
      seo_meta_override = EXCLUDED.seo_meta_override,
      updated_at = NOW()
    RETURNING *`,
    [
      sku,
      storeId,
      title_override,
      description_override,
      price_override != null ? parseFloat(price_override) : null,
      compare_at_price_override != null ? parseFloat(compare_at_price_override) : null,
      seo_title_override,
      seo_meta_override,
    ]
  );

  console.log(`[products] Upserted store override: ${sku} -> ${storeId}`);
  return result.rows[0];
}

/**
 * Delete store override (reset to master defaults)
 * @param {string} sku - Product SKU
 * @param {string} storeId - Store ID
 * @returns {Promise<boolean>}
 */
async function deleteStoreOverride(sku, storeId) {
  const result = await query(
    `DELETE FROM products_store_overrides WHERE sku = $1 AND store_id = $2 RETURNING sku`,
    [sku, storeId]
  );

  if (result.rows.length > 0) {
    console.log(`[products] Deleted store override: ${sku} -> ${storeId}`);
  }

  return result.rows.length > 0;
}

// ==================== EFFECTIVE VALUES (Master + Override) ====================

/**
 * Get effective product data for a store (master + override merged)
 * @param {string} sku - Product SKU
 * @param {string} storeId - Store ID
 * @returns {Promise<object|null>}
 */
async function getEffectiveProduct(sku, storeId) {
  const result = await query(
    `SELECT
      m.sku,
      COALESCE(o.title_override, m.title_default) as title,
      COALESCE(o.description_override, m.description_default) as description,
      COALESCE(o.price_override, m.price_default) as price,
      COALESCE(o.compare_at_price_override, m.compare_at_price_default) as compare_at_price,
      m.cost,
      COALESCE(o.seo_title_override, m.seo_title_default) as seo_title,
      COALESCE(o.seo_meta_override, m.seo_meta_default) as seo_meta,
      m.drive_folder_url,
      m.created_at,
      m.updated_at as master_updated_at,
      o.updated_at as override_updated_at,
      -- Include raw master and override data for reference
      m.title_default,
      m.description_default,
      m.price_default,
      m.compare_at_price_default,
      m.seo_title_default,
      m.seo_meta_default,
      o.title_override,
      o.description_override,
      o.price_override,
      o.compare_at_price_override,
      o.seo_title_override,
      o.seo_meta_override,
      -- Has override flags
      (o.sku IS NOT NULL) as has_override,
      (o.title_override IS NOT NULL) as has_title_override,
      (o.description_override IS NOT NULL) as has_description_override,
      (o.price_override IS NOT NULL) as has_price_override,
      (o.compare_at_price_override IS NOT NULL) as has_compare_at_price_override,
      (o.seo_title_override IS NOT NULL) as has_seo_title_override,
      (o.seo_meta_override IS NOT NULL) as has_seo_meta_override
    FROM products_master m
    LEFT JOIN products_store_overrides o ON m.sku = o.sku AND o.store_id = $2
    WHERE m.sku = $1`,
    [sku, storeId]
  );

  return result.rows[0] || null;
}

// ==================== STORE SYNC METADATA ====================

/**
 * Get sync status for a product in a store
 * @param {string} sku - Product SKU
 * @param {string} storeId - Store ID
 * @returns {Promise<object|null>}
 */
async function getStoreSyncStatus(sku, storeId) {
  const result = await query(
    `SELECT * FROM products_store_sync WHERE sku = $1 AND store_id = $2`,
    [sku, storeId]
  );
  return result.rows[0] || null;
}

/**
 * Get sync status for all stores for a product
 * @param {string} sku - Product SKU
 * @returns {Promise<Array>}
 */
async function getAllStoreSyncStatuses(sku) {
  const result = await query(
    `SELECT * FROM products_store_sync WHERE sku = $1 ORDER BY store_id`,
    [sku]
  );
  return result.rows;
}

/**
 * Upsert sync status for a product in a store
 * @param {string} sku - Product SKU
 * @param {string} storeId - Store ID
 * @param {object} syncData - Sync metadata
 * @returns {Promise<object>}
 */
async function upsertStoreSyncStatus(sku, storeId, syncData) {
  const {
    shopify_product_id = null,
    status = 'not_pushed',
    last_pushed_at = null,
    last_push_error = null,
    has_cashsync_tag = false,
    created_by_system = false,
    shopify_created_at = null,
    shopify_updated_at = null,
  } = syncData;

  const result = await query(
    `INSERT INTO products_store_sync (
      sku, store_id, shopify_product_id, status, last_pushed_at, last_push_error,
      has_cashsync_tag, created_by_system, shopify_created_at, shopify_updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (sku, store_id) DO UPDATE SET
      shopify_product_id = COALESCE(EXCLUDED.shopify_product_id, products_store_sync.shopify_product_id),
      status = EXCLUDED.status,
      last_pushed_at = COALESCE(EXCLUDED.last_pushed_at, products_store_sync.last_pushed_at),
      last_push_error = EXCLUDED.last_push_error,
      has_cashsync_tag = EXCLUDED.has_cashsync_tag,
      created_by_system = EXCLUDED.created_by_system,
      shopify_created_at = COALESCE(EXCLUDED.shopify_created_at, products_store_sync.shopify_created_at),
      shopify_updated_at = COALESCE(EXCLUDED.shopify_updated_at, products_store_sync.shopify_updated_at),
      updated_at = NOW()
    RETURNING *`,
    [
      sku, storeId, shopify_product_id, status, last_pushed_at, last_push_error,
      has_cashsync_tag, created_by_system, shopify_created_at, shopify_updated_at,
    ]
  );

  return result.rows[0];
}

// ==================== AGGREGATED QUERIES FOR UI ====================

/**
 * Get products with full context for table display
 * Includes master data, effective values for selected store, and sync status across all stores
 * @param {object} options - Query options
 * @returns {Promise<object>}
 */
async function getProductsForTable(options = {}) {
  const {
    storeId = null, // Current store context (for effective values)
    search = '',
    sortBy = 'sku',
    sortOrder = 'asc',
    limit = 100,
    offset = 0,
    // Filters
    hasDriveFolder = null, // true, false, or null (any)
    seoStatus = null, // 'ok', 'missing', 'too_long', or null
    syncStatus = null, // 'not_pushed', 'draft', 'active', 'failed', or null
    marginBelow = null, // Filter products with margin below this %
  } = options;

  // Build WHERE clause
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (search.trim()) {
    conditions.push(`(LOWER(m.sku) LIKE $${paramIndex} OR LOWER(m.title_default) LIKE $${paramIndex})`);
    params.push(`%${search.trim().toLowerCase()}%`);
    paramIndex++;
  }

  if (hasDriveFolder === true) {
    conditions.push(`m.drive_folder_url IS NOT NULL AND m.drive_folder_url != ''`);
  } else if (hasDriveFolder === false) {
    conditions.push(`(m.drive_folder_url IS NULL OR m.drive_folder_url = '')`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort field
  const allowedSortFields = ['sku', 'title_default', 'price_default', 'cost', 'created_at', 'updated_at'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? `m.${sortBy}` : 'm.sku';
  const safeSortOrder = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  // Get total count
  const countSql = `SELECT COUNT(*) as total FROM products_master m ${whereClause}`;
  const countResult = await query(countSql, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Main query with store context
  const storeIdParam = storeId || 'ALL';
  params.push(storeIdParam);
  const storeIdIndex = paramIndex++;
  params.push(limit);
  params.push(offset);

  const sql = `
    SELECT
      m.sku,
      m.title_default,
      m.description_default,
      m.price_default,
      m.compare_at_price_default,
      m.cost,
      m.seo_title_default,
      m.seo_meta_default,
      m.drive_folder_url,
      m.created_at,
      m.updated_at,
      -- Effective values for current store context
      COALESCE(o.title_override, m.title_default) as effective_title,
      COALESCE(o.price_override, m.price_default) as effective_price,
      COALESCE(o.compare_at_price_override, m.compare_at_price_default) as effective_compare_at_price,
      COALESCE(o.seo_title_override, m.seo_title_default) as effective_seo_title,
      COALESCE(o.seo_meta_override, m.seo_meta_default) as effective_seo_meta,
      -- Override flags
      (o.sku IS NOT NULL) as has_store_override,
      -- Calculate margin
      CASE
        WHEN m.cost IS NOT NULL AND m.cost > 0 AND COALESCE(o.price_override, m.price_default) > 0
        THEN ROUND(((COALESCE(o.price_override, m.price_default) - m.cost) / COALESCE(o.price_override, m.price_default)) * 100, 1)
        ELSE NULL
      END as margin_percent,
      -- Store sync aggregation (count of stores where pushed)
      (SELECT COUNT(*) FROM products_store_sync s WHERE s.sku = m.sku AND s.status IN ('draft', 'active')) as stores_pushed_count,
      (SELECT COUNT(*) FROM products_store_sync s WHERE s.sku = m.sku AND s.status = 'failed') as stores_failed_count,
      -- Current store sync status
      ss.shopify_product_id as current_store_shopify_id,
      ss.status as current_store_status,
      ss.last_pushed_at as current_store_last_pushed,
      ss.last_push_error as current_store_error
    FROM products_master m
    LEFT JOIN products_store_overrides o ON m.sku = o.sku AND o.store_id = $${storeIdIndex}
    LEFT JOIN products_store_sync ss ON m.sku = ss.sku AND ss.store_id = $${storeIdIndex}
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const result = await query(sql, params);

  // Add SEO status calculation
  const products = result.rows.map(p => ({
    ...p,
    seo_status: calculateSeoStatus(p),
    has_drive_folder: !!(p.drive_folder_url && p.drive_folder_url.trim()),
  }));

  return {
    products,
    total,
    limit,
    offset,
    store_id: storeId,
  };
}

/**
 * Calculate SEO status for a product
 * @param {object} product - Product with effective SEO fields
 * @returns {string} 'ok', 'missing', or 'too_long'
 */
function calculateSeoStatus(product) {
  const title = product.effective_seo_title || product.seo_title_default || '';
  const meta = product.effective_seo_meta || product.seo_meta_default || '';

  if (!title.trim() || !meta.trim()) {
    return 'missing';
  }

  if (title.length > 70 || meta.length > 160) {
    return 'too_long';
  }

  return 'ok';
}

/**
 * Compute effective values for a store (master + override merged)
 * @param {object} master - Master product
 * @param {object|null} override - Store override (or null)
 * @returns {object} - Effective values with override flags
 */
function computeEffectiveValues(master, override) {
  const ov = override || {};

  return {
    title: ov.title_override ?? master.title_default,
    description: ov.description_override ?? master.description_default,
    price: ov.price_override ?? master.price_default,
    compare_at_price: ov.compare_at_price_override ?? master.compare_at_price_default,
    seo_title: ov.seo_title_override ?? master.seo_title_default,
    seo_meta: ov.seo_meta_override ?? master.seo_meta_default,
    // Global fields (no override)
    cost: master.cost,
    drive_folder_url: master.drive_folder_url,
    // Override flags
    has_title_override: ov.title_override != null,
    has_description_override: ov.description_override != null,
    has_price_override: ov.price_override != null,
    has_compare_at_price_override: ov.compare_at_price_override != null,
    has_seo_title_override: ov.seo_title_override != null,
    has_seo_meta_override: ov.seo_meta_override != null,
    has_any_override: !!(ov.title_override ?? ov.description_override ?? ov.price_override ??
      ov.compare_at_price_override ?? ov.seo_title_override ?? ov.seo_meta_override),
  };
}

/**
 * Get full product detail with all store data for drawer view
 * Includes: master, overrides per store, effective values per store, images
 * @param {string} sku - Product SKU
 * @param {object} options - Options
 * @param {Array} options.stores - List of stores to compute effective values for
 * @param {boolean} options.includeImages - Whether to fetch images (default true)
 * @returns {Promise<object|null>}
 */
async function getProductFullDetail(sku, options = {}) {
  const { stores = [], includeImages = true } = options;

  console.log(`[productsService] getProductFullDetail called for SKU: ${sku}`);

  const master = await getMasterProductBySku(sku);
  if (!master) {
    console.log(`[productsService] Product not found: ${sku}`);
    return null;
  }

  console.log(`[productsService] Found master product: ${master.sku}, title: ${master.title_default}`);

  const overridesArray = await getAllStoreOverrides(sku);
  const syncStatusesArray = await getAllStoreSyncStatuses(sku);

  console.log(`[productsService] Found ${overridesArray.length} overrides, ${syncStatusesArray.length} sync statuses`);

  // Build keyed versions for easy lookup
  const overridesByStore = overridesArray.reduce((acc, o) => {
    acc[o.store_id] = o;
    return acc;
  }, {});

  const syncStatusesByStore = syncStatusesArray.reduce((acc, s) => {
    acc[s.store_id] = s;
    return acc;
  }, {});

  // Compute effective values for each store
  const effectiveByStore = {};
  for (const store of stores) {
    const storeId = store.store_id || store;
    const override = overridesByStore[storeId] || null;
    effectiveByStore[storeId] = computeEffectiveValues(master, override);
  }

  // Fetch images if requested
  let images = [];
  if (includeImages) {
    try {
      const { getProductImages } = require('./productsImagesService');
      images = await getProductImages(sku, master.drive_folder_url);
      console.log(`[productsService] Fetched ${images.length} images for SKU: ${sku}`);
    } catch (err) {
      console.error(`[productsService] Error fetching images for ${sku}:`, err.message);
      images = [];
    }
  }

  // Return structure matching what UI expects
  const result = {
    product: master,  // UI expects 'product', not 'master'
    overrides: overridesArray,  // Return as array for UI iteration
    syncStatuses: syncStatusesArray,  // Return as array for UI iteration
    // Keyed versions for easy lookup
    overridesByStore,
    syncStatusesByStore,
    effectiveByStore,
    // Images
    images,
  };

  console.log(`[productsService] Returning full detail for SKU: ${sku}, has ${images.length} images`);

  return result;
}

/**
 * Get product count and stats
 * @returns {Promise<object>}
 */
async function getProductStats() {
  const result = await query(`
    SELECT
      COUNT(*) as total_products,
      COUNT(*) FILTER (WHERE drive_folder_url IS NOT NULL AND drive_folder_url != '') as with_drive_folder,
      COUNT(*) FILTER (WHERE seo_title_default IS NULL OR seo_title_default = '' OR seo_meta_default IS NULL OR seo_meta_default = '') as missing_seo,
      COUNT(*) FILTER (WHERE cost IS NOT NULL AND cost > 0) as with_cost
    FROM products_master
  `);

  const syncResult = await query(`
    SELECT
      COUNT(DISTINCT sku) as products_in_any_store,
      COUNT(*) FILTER (WHERE status = 'active') as total_active,
      COUNT(*) FILTER (WHERE status = 'draft') as total_draft,
      COUNT(*) FILTER (WHERE status = 'failed') as total_failed
    FROM products_store_sync
  `);

  return {
    ...result.rows[0],
    ...syncResult.rows[0],
  };
}

// ==================== SKU COLLISION LOG ====================

/**
 * Log a SKU collision resolution
 * @param {object} collision - Collision data
 * @returns {Promise<object>}
 */
async function logSkuCollision(collision) {
  const { store_id, original_sku, new_sku, shopify_product_id, notes = null } = collision;

  const result = await query(
    `INSERT INTO products_sku_collisions (store_id, original_sku, new_sku, shopify_product_id, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [store_id, original_sku, new_sku, shopify_product_id, notes]
  );

  console.log(`[products] Logged SKU collision: ${original_sku} -> ${new_sku} in ${store_id}`);
  return result.rows[0];
}

/**
 * Get SKU collision history for a store
 * @param {string} storeId - Store ID
 * @returns {Promise<Array>}
 */
async function getSkuCollisions(storeId) {
  const result = await query(
    `SELECT * FROM products_sku_collisions WHERE store_id = $1 ORDER BY resolved_at DESC`,
    [storeId]
  );
  return result.rows;
}

module.exports = {
  // Master products
  getMasterProducts,
  getMasterProductBySku,
  createMasterProduct,
  updateMasterProduct,
  deleteMasterProduct,
  bulkUpsertMasterProducts,
  // Store overrides
  getStoreOverride,
  getAllStoreOverrides,
  upsertStoreOverride,
  deleteStoreOverride,
  // Effective values
  getEffectiveProduct,
  // Sync metadata
  getStoreSyncStatus,
  getAllStoreSyncStatuses,
  upsertStoreSyncStatus,
  // Aggregated queries
  getProductsForTable,
  getProductFullDetail,
  getProductStats,
  calculateSeoStatus,
  // SKU collision
  logSkuCollision,
  getSkuCollisions,
};
