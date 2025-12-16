// services/productsPushService.js
// Shopify Push Service for Products Module
// Handles pushing master products to Shopify stores with SKU collision detection/resolution
// Business Rules:
//   - Products pushed as DRAFT with CASHSYNC tag
//   - If SKU collision detected (product exists WITHOUT CASHSYNC tag):
//     - Rename existing product SKU to [originalSKU]OLD
//     - Add tag: "SKU existent la sincronizare, modificat SKU"
//     - Log collision in products_sku_collisions table

const { query } = require('../lib/db');
const {
  getShopifyAccessTokenForStore,
  shopifyGraphQL,
  shopifyREST,
  createProductInStore,
  updateProductInStore,
} = require('../lib/shopify');
const { loadStoresRows } = require('../lib/stores');
const { getEffectiveProduct, upsertStoreSyncStatus, logSkuCollision } = require('./productsService');

// Constants
const CASHSYNC_TAG = 'CASHSYNC';
const COLLISION_TAG = 'SKU existent la sincronizare, modificat SKU';

/**
 * Get store by ID from Google Sheets
 * @param {string} storeId - Store ID
 * @returns {Promise<object|null>} Store object or null
 */
async function getStoreById(storeId) {
  const stores = await loadStoresRows();
  const store = stores.find(s => s.store_id === storeId);
  return store || null;
}

/**
 * Search for existing products with a given SKU in a store
 * Returns ALL products with this SKU (regardless of CASHSYNC tag)
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Shopify access token
 * @param {string} sku - SKU to search for
 * @returns {Promise<Array>} Array of matching products with their tags
 */
async function findProductsBySku(storeDomain, accessToken, sku) {
  if (!sku) return [];

  const gqlQuery = `
    query getVariantsBySku($query: String!) {
      productVariants(first: 50, query: $query) {
        edges {
          node {
            id
            sku
            product {
              id
              title
              handle
              status
              tags
              variants(first: 1) {
                edges {
                  node {
                    id
                    sku
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(storeDomain, accessToken, gqlQuery, {
    query: `sku:${JSON.stringify(sku)}`,
  });

  const edges = data.productVariants?.edges || [];
  const products = [];
  const seenProductIds = new Set();

  for (const edge of edges) {
    const variant = edge.node;
    if (!variant || !variant.product) continue;

    // Only include products where the SKU matches exactly
    if (variant.sku !== sku) continue;

    const product = variant.product;
    const productGid = product.id;

    // Dedupe by product ID
    if (seenProductIds.has(productGid)) continue;
    seenProductIds.add(productGid);

    const tags = product.tags || [];
    const hasCashsyncTag = tags.includes(CASHSYNC_TAG);

    products.push({
      productGid,
      productNumericId: productGid.split('/').pop(),
      title: product.title,
      handle: product.handle,
      status: product.status,
      tags,
      hasCashsyncTag,
      variantGid: variant.id,
      variantNumericId: variant.id.split('/').pop(),
      sku: variant.sku,
    });
  }

  return products;
}

/**
 * Rename an existing product's SKU to [SKU]OLD and add collision tag
 * @param {object} store - Store object
 * @param {string} accessToken - Shopify access token
 * @param {object} existingProduct - Existing product info from findProductsBySku
 * @returns {Promise<object>} Result of the rename operation
 */
async function renameExistingProductSku(store, accessToken, existingProduct) {
  const { productNumericId, variantNumericId, sku, tags } = existingProduct;

  const newSku = `${sku}OLD`;

  // Add collision tag to existing tags
  const newTags = [...tags];
  if (!newTags.includes(COLLISION_TAG)) {
    newTags.push(COLLISION_TAG);
  }

  console.log(`[push] Renaming existing product SKU from ${sku} to ${newSku} in store ${store.store_id}`);

  // Update the variant's SKU
  const variantPath = `/variants/${variantNumericId}.json`;
  await shopifyREST(store.shopify_domain, accessToken, variantPath, 'PUT', {
    variant: {
      id: variantNumericId,
      sku: newSku,
    },
  });

  // Update the product's tags
  const productPath = `/products/${productNumericId}.json`;
  await shopifyREST(store.shopify_domain, accessToken, productPath, 'PUT', {
    product: {
      id: productNumericId,
      tags: newTags.join(', '),
    },
  });

  return {
    renamed: true,
    oldSku: sku,
    newSku,
    productId: productNumericId,
  };
}

/**
 * Build Shopify product payload from effective product data
 * @param {object} effectiveProduct - Merged master + override product data
 * @param {Array<string>} imageUrls - Optional image URLs to attach
 * @returns {object} Shopify product payload
 */
function buildProductPayload(effectiveProduct, imageUrls = []) {
  const {
    sku,
    title,
    description,
    price,
    compare_at_price,
    seo_title,
    seo_meta,
  } = effectiveProduct;

  const payload = {
    title: title || sku,
    body_html: description || '',
    status: 'draft', // Always push as DRAFT
    tags: CASHSYNC_TAG, // Always add CASHSYNC tag
    metafields_global_title_tag: seo_title || undefined,
    metafields_global_description_tag: seo_meta || undefined,
    variants: [
      {
        sku,
        price: price ? String(price) : '0.00',
        compare_at_price: compare_at_price ? String(compare_at_price) : undefined,
        taxable: true,
        inventory_management: null, // Don't track inventory by default
      },
    ],
  };

  // Add images if provided
  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    payload.images = imageUrls.map(url => ({ src: url }));
  }

  return payload;
}

/**
 * Push a single product to a specific store
 * Handles SKU collision detection and resolution
 *
 * @param {string} sku - Product SKU (primary key)
 * @param {string} storeId - Target store ID
 * @param {object} options - Push options
 * @param {Array<string>} options.imageUrls - Optional image URLs
 * @param {boolean} options.forceUpdate - If true, update even if product exists with CASHSYNC
 * @returns {Promise<object>} Push result
 */
async function pushProductToStore(sku, storeId, options = {}) {
  const { imageUrls = [], forceUpdate = false } = options;

  console.log(`[push] Pushing product ${sku} to store ${storeId}`);

  // Get store info
  const store = await getStoreById(storeId);
  if (!store) {
    return {
      success: false,
      action: 'error',
      error: `Magazin negăsit: ${storeId}`,
    };
  }

  const storeDomain = String(store.shopify_domain || '').trim();
  if (!storeDomain) {
    return {
      success: false,
      action: 'error',
      error: `Magazin fără domeniu Shopify: ${storeId}`,
    };
  }

  // Get access token
  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(storeId);
  } catch (err) {
    return {
      success: false,
      action: 'error',
      error: `Token lipsă pentru magazin: ${storeId}`,
    };
  }

  // Get effective product data (master + override merged)
  const effectiveProduct = await getEffectiveProduct(sku, storeId);
  if (!effectiveProduct) {
    return {
      success: false,
      action: 'error',
      error: `Produs negăsit în DB: ${sku}`,
    };
  }

  // Search for existing products with this SKU
  const existingProducts = await findProductsBySku(storeDomain, accessToken, sku);

  console.log(`[push] Found ${existingProducts.length} existing products with SKU ${sku}`);

  // Check for collision (product exists WITHOUT CASHSYNC tag)
  const collisionProducts = existingProducts.filter(p => !p.hasCashsyncTag);
  const cashsyncProducts = existingProducts.filter(p => p.hasCashsyncTag);

  let collisionResolved = false;
  let collisionInfo = null;

  // Handle SKU collisions - rename existing products
  for (const collisionProduct of collisionProducts) {
    console.log(`[push] SKU collision detected: ${sku} exists without CASHSYNC tag`);

    try {
      const renameResult = await renameExistingProductSku(store, accessToken, collisionProduct);

      // Log collision to database
      await logSkuCollision({
        store_id: storeId,
        original_sku: sku,
        new_sku: renameResult.newSku,
        shopify_product_id: Number(collisionProduct.productNumericId),
        notes: `Renamed from "${collisionProduct.title}" to avoid collision`,
      });

      collisionResolved = true;
      collisionInfo = {
        existingProductId: collisionProduct.productNumericId,
        existingProductTitle: collisionProduct.title,
        renamedTo: renameResult.newSku,
      };

      console.log(`[push] Collision resolved: renamed ${sku} to ${renameResult.newSku}`);
    } catch (err) {
      console.error(`[push] Failed to resolve collision:`, err);
      return {
        success: false,
        action: 'collision_failed',
        error: `Nu s-a putut rezolva coliziunea SKU: ${err.message}`,
        collision: {
          existingProductId: collisionProduct.productNumericId,
          existingProductTitle: collisionProduct.title,
        },
      };
    }
  }

  // Build product payload
  const payload = buildProductPayload(effectiveProduct, imageUrls);

  let result;

  // If product exists with CASHSYNC tag, update it
  if (cashsyncProducts.length > 0) {
    const existingCashsyncProduct = cashsyncProducts[0];

    if (!forceUpdate) {
      // Check if we actually need to update
      console.log(`[push] Product ${sku} already exists with CASHSYNC tag, updating...`);
    }

    try {
      const updatedProduct = await updateProductInStore(
        store,
        accessToken,
        existingCashsyncProduct.productGid,
        payload
      );

      // Update sync status in DB
      await upsertStoreSyncStatus(sku, storeId, {
        status: 'draft',
        shopify_product_id: Number(updatedProduct.id),
        last_pushed_at: new Date().toISOString(),
        last_push_error: null,
        has_cashsync_tag: true,
      });

      result = {
        success: true,
        action: 'updated',
        shopifyProductId: updatedProduct.id,
        shopifyHandle: updatedProduct.handle,
        collisionResolved,
        collisionInfo,
      };
    } catch (err) {
      console.error(`[push] Failed to update product:`, err);

      await upsertStoreSyncStatus(sku, storeId, {
        status: 'failed',
        last_push_error: err.message,
      });

      result = {
        success: false,
        action: 'update_failed',
        error: err.message,
      };
    }
  } else {
    // Create new product
    try {
      console.log(`[push] Creating new product ${sku} in store ${storeId}`);

      const createdProduct = await createProductInStore(store, accessToken, payload);

      // Update sync status in DB
      await upsertStoreSyncStatus(sku, storeId, {
        status: 'draft',
        shopify_product_id: Number(createdProduct.id),
        last_pushed_at: new Date().toISOString(),
        last_push_error: null,
        has_cashsync_tag: true,
        created_by_system: true,
      });

      result = {
        success: true,
        action: 'created',
        shopifyProductId: createdProduct.id,
        shopifyHandle: createdProduct.handle,
        collisionResolved,
        collisionInfo,
      };
    } catch (err) {
      console.error(`[push] Failed to create product:`, err);

      await upsertStoreSyncStatus(sku, storeId, {
        status: 'failed',
        last_push_error: err.message,
      });

      result = {
        success: false,
        action: 'create_failed',
        error: err.message,
      };
    }
  }

  console.log(`[push] Result for ${sku} -> ${storeId}:`, result.action);
  return result;
}

/**
 * Push multiple products to a store in batch
 * Rate-limited to avoid Shopify API throttling
 *
 * @param {Array<string>} skus - Array of SKUs to push
 * @param {string} storeId - Target store ID
 * @param {object} options - Push options
 * @param {number} options.delayMs - Delay between pushes (default 500ms)
 * @param {Function} options.onProgress - Progress callback(current, total, result)
 * @returns {Promise<object>} Batch result summary
 */
async function pushProductsBatch(skus, storeId, options = {}) {
  const { delayMs = 500, onProgress = null } = options;

  const results = {
    total: skus.length,
    success: 0,
    failed: 0,
    created: 0,
    updated: 0,
    collisions_resolved: 0,
    errors: [],
    details: [],
  };

  for (let i = 0; i < skus.length; i++) {
    const sku = skus[i];

    try {
      const result = await pushProductToStore(sku, storeId);

      if (result.success) {
        results.success++;
        if (result.action === 'created') results.created++;
        if (result.action === 'updated') results.updated++;
        if (result.collisionResolved) results.collisions_resolved++;
      } else {
        results.failed++;
        results.errors.push({ sku, error: result.error || result.action });
      }

      results.details.push({ sku, ...result });

      if (onProgress) {
        onProgress(i + 1, skus.length, result);
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ sku, error: err.message });
      results.details.push({ sku, success: false, error: err.message });

      if (onProgress) {
        onProgress(i + 1, skus.length, { success: false, error: err.message });
      }
    }

    // Rate limiting delay (except for last item)
    if (i < skus.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get push preview for a product to a store
 * Shows what would happen without making changes
 *
 * @param {string} sku - Product SKU
 * @param {string} storeId - Target store ID
 * @returns {Promise<object>} Preview info
 */
async function getProductPushPreview(sku, storeId) {
  // Get store info
  const store = await getStoreById(storeId);
  if (!store) {
    return {
      canPush: false,
      error: `Magazin negăsit: ${storeId}`,
    };
  }

  const storeDomain = String(store.shopify_domain || '').trim();
  if (!storeDomain) {
    return {
      canPush: false,
      error: `Magazin fără domeniu Shopify: ${storeId}`,
    };
  }

  // Get access token
  let accessToken;
  try {
    accessToken = getShopifyAccessTokenForStore(storeId);
  } catch (err) {
    return {
      canPush: false,
      error: `Token lipsă pentru magazin: ${storeId}`,
    };
  }

  // Get effective product data
  const effectiveProduct = await getEffectiveProduct(sku, storeId);
  if (!effectiveProduct) {
    return {
      canPush: false,
      error: `Produs negăsit în DB: ${sku}`,
    };
  }

  // Search for existing products
  const existingProducts = await findProductsBySku(storeDomain, accessToken, sku);

  const collisionProducts = existingProducts.filter(p => !p.hasCashsyncTag);
  const cashsyncProducts = existingProducts.filter(p => p.hasCashsyncTag);

  let plannedAction = 'create';
  let collisionWarning = null;
  let existingProductInfo = null;

  if (cashsyncProducts.length > 0) {
    plannedAction = 'update';
    existingProductInfo = {
      productId: cashsyncProducts[0].productNumericId,
      title: cashsyncProducts[0].title,
      handle: cashsyncProducts[0].handle,
      status: cashsyncProducts[0].status,
    };
  }

  if (collisionProducts.length > 0) {
    collisionWarning = {
      message: `SKU ${sku} există deja în magazin FĂRĂ tag-ul CASHSYNC. Va fi redenumit la ${sku}OLD.`,
      existingProducts: collisionProducts.map(p => ({
        productId: p.productNumericId,
        title: p.title,
        currentSku: p.sku,
        willBeRenamedTo: `${p.sku}OLD`,
      })),
    };
  }

  // Build preview payload
  const payload = buildProductPayload(effectiveProduct);

  return {
    canPush: true,
    plannedAction,
    collisionWarning,
    existingProductInfo,
    productPreview: {
      sku,
      title: payload.title,
      description: payload.body_html?.substring(0, 200) + (payload.body_html?.length > 200 ? '...' : ''),
      price: payload.variants[0].price,
      compare_at_price: payload.variants[0].compare_at_price,
      status: payload.status,
      tags: payload.tags,
    },
    effectiveData: effectiveProduct,
  };
}

module.exports = {
  pushProductToStore,
  pushProductsBatch,
  getProductPushPreview,
  findProductsBySku,
  getStoreById,
  CASHSYNC_TAG,
  COLLISION_TAG,
};
