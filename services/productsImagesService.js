// services/productsImagesService.js
// Handles product images from Google Drive with DB-first caching
// Images are fetched from Drive folders and cached in products_images table

const { query } = require('../lib/db');
const { getDriveClient } = require('../lib/google');

// Cache TTL: 1 hour (in milliseconds)
const IMAGE_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Extract folder ID from Drive URL or direct ID
 * @param {string} urlOrId - Drive folder URL or ID
 * @returns {string|null} - Folder ID or null
 */
function extractDriveFolderId(urlOrId) {
  if (!urlOrId) return null;

  const trimmed = urlOrId.trim();

  // Direct ID (no URL)
  if (!trimmed.includes('http') && !trimmed.includes('/')) {
    return trimmed;
  }

  // URL format: https://drive.google.com/drive/folders/FOLDER_ID
  const match = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];

  // URL format with id param
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  return null;
}

/**
 * Fetch images from Google Drive folder
 * @param {string} folderId - Drive folder ID
 * @param {number} maxFiles - Max files to fetch
 * @returns {Promise<Array>} - Array of image objects
 */
async function fetchImagesFromDrive(folderId, maxFiles = 20) {
  if (!folderId) {
    console.log('[productsImages] No folder ID provided');
    return [];
  }

  try {
    const drive = await getDriveClient();

    console.log(`[productsImages] Fetching images from Drive folder: ${folderId}`);

    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      orderBy: 'name',
      pageSize: maxFiles,
      fields: 'files(id, name, mimeType, createdTime, thumbnailLink, webContentLink)',
    });

    const files = res.data.files || [];
    console.log(`[productsImages] Found ${files.length} images in Drive folder`);

    return files.map((file, index) => ({
      image_id: file.id,
      image_name: file.name,
      // Direct view URL (works for publicly shared files)
      image_url: `https://drive.google.com/uc?export=view&id=${file.id}`,
      // Thumbnail URL (smaller, faster loading)
      thumbnail_url: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
      sort_order: index,
      source: 'drive',
    }));
  } catch (err) {
    console.error('[productsImages] Drive fetch error:', err.message);
    return [];
  }
}

/**
 * Get cached images for a product from DB
 * @param {string} sku - Product SKU
 * @returns {Promise<Array>} - Cached images
 */
async function getCachedImages(sku) {
  const result = await query(
    `SELECT image_url, image_id, image_name, sort_order, source, fetched_at
     FROM products_images
     WHERE sku = $1
     ORDER BY sort_order ASC`,
    [sku]
  );
  return result.rows;
}

/**
 * Cache images for a product in DB
 * @param {string} sku - Product SKU
 * @param {Array} images - Images to cache
 * @returns {Promise<void>}
 */
async function cacheImages(sku, images) {
  // Delete old cached images for this SKU
  await query(`DELETE FROM products_images WHERE sku = $1`, [sku]);

  if (!images || images.length === 0) {
    console.log(`[productsImages] No images to cache for SKU: ${sku}`);
    return;
  }

  // Insert new images
  for (const img of images) {
    await query(
      `INSERT INTO products_images (sku, image_url, image_id, image_name, sort_order, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (sku, image_url) DO UPDATE SET
         image_id = EXCLUDED.image_id,
         image_name = EXCLUDED.image_name,
         sort_order = EXCLUDED.sort_order,
         fetched_at = NOW()`,
      [sku, img.image_url, img.image_id, img.image_name, img.sort_order, img.source || 'drive']
    );
  }

  console.log(`[productsImages] Cached ${images.length} images for SKU: ${sku}`);
}

/**
 * Check if cache is still valid (not expired)
 * @param {Array} cachedImages - Cached images from DB
 * @returns {boolean} - True if cache is valid
 */
function isCacheValid(cachedImages) {
  if (!cachedImages || cachedImages.length === 0) {
    return false;
  }

  const oldestFetch = cachedImages.reduce((min, img) => {
    const fetchedAt = new Date(img.fetched_at).getTime();
    return fetchedAt < min ? fetchedAt : min;
  }, Date.now());

  const age = Date.now() - oldestFetch;
  return age < IMAGE_CACHE_TTL_MS;
}

/**
 * Get images for a product (from cache or Drive)
 * DB-first: always checks cache first, fetches from Drive only if needed
 * @param {string} sku - Product SKU
 * @param {string} driveFolderUrl - Drive folder URL (from products_master)
 * @param {boolean} forceRefresh - Force refresh from Drive
 * @returns {Promise<Array>} - Array of image objects
 */
async function getProductImages(sku, driveFolderUrl, forceRefresh = false) {
  console.log(`[productsImages] Getting images for SKU: ${sku}, driveFolderUrl: ${driveFolderUrl || 'none'}, forceRefresh: ${forceRefresh}`);

  // Check cache first (DB-first approach)
  const cachedImages = await getCachedImages(sku);

  if (!forceRefresh && isCacheValid(cachedImages)) {
    console.log(`[productsImages] Returning ${cachedImages.length} cached images for SKU: ${sku}`);
    return cachedImages.map(img => ({
      ...img,
      thumbnail_url: `https://drive.google.com/thumbnail?id=${img.image_id}&sz=w400`,
      cached: true,
    }));
  }

  // No valid cache - fetch from Drive
  const folderId = extractDriveFolderId(driveFolderUrl);

  if (!folderId) {
    console.log(`[productsImages] No valid Drive folder for SKU: ${sku}`);
    // Return cached images if any (even if expired), otherwise empty
    return cachedImages.map(img => ({
      ...img,
      thumbnail_url: `https://drive.google.com/thumbnail?id=${img.image_id}&sz=w400`,
      cached: true,
      expired: true,
    }));
  }

  // Fetch fresh images from Drive
  const freshImages = await fetchImagesFromDrive(folderId);

  // Cache the results
  await cacheImages(sku, freshImages);

  console.log(`[productsImages] Returning ${freshImages.length} fresh images for SKU: ${sku}`);
  return freshImages.map(img => ({
    ...img,
    cached: false,
  }));
}

/**
 * Refresh images for a product (force fetch from Drive)
 * @param {string} sku - Product SKU
 * @param {string} driveFolderUrl - Drive folder URL
 * @returns {Promise<Array>} - Fresh images
 */
async function refreshProductImages(sku, driveFolderUrl) {
  return getProductImages(sku, driveFolderUrl, true);
}

/**
 * Get images for multiple products (batch operation)
 * @param {Array} products - Array of {sku, drive_folder_url}
 * @returns {Promise<Object>} - Map of SKU -> images
 */
async function getProductImagesBatch(products) {
  const results = {};

  for (const product of products) {
    try {
      results[product.sku] = await getProductImages(product.sku, product.drive_folder_url);
    } catch (err) {
      console.error(`[productsImages] Error fetching images for ${product.sku}:`, err.message);
      results[product.sku] = [];
    }
  }

  return results;
}

/**
 * Clear image cache for a product
 * @param {string} sku - Product SKU
 * @returns {Promise<void>}
 */
async function clearImageCache(sku) {
  await query(`DELETE FROM products_images WHERE sku = $1`, [sku]);
  console.log(`[productsImages] Cleared image cache for SKU: ${sku}`);
}

/**
 * Clear all expired image caches (cleanup job)
 * @returns {Promise<number>} - Number of deleted entries
 */
async function clearExpiredCaches() {
  const ttlInterval = `${Math.floor(IMAGE_CACHE_TTL_MS / 1000)} seconds`;
  const result = await query(
    `DELETE FROM products_images WHERE fetched_at < NOW() - INTERVAL '${ttlInterval}' RETURNING sku`
  );
  console.log(`[productsImages] Cleared ${result.rowCount} expired cache entries`);
  return result.rowCount;
}

module.exports = {
  getProductImages,
  refreshProductImages,
  getProductImagesBatch,
  getCachedImages,
  cacheImages,
  clearImageCache,
  clearExpiredCaches,
  extractDriveFolderId,
  fetchImagesFromDrive,
};
