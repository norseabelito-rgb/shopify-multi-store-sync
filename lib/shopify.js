// lib/shopify.js
const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const config = require('../config');
const { createLogger } = require('./logger');

const logger = createLogger('shopify');
const { SHOPIFY_API_VERSION, SHOPIFY_REQUEST_TIMEOUT_MS, SHOPIFY_RATE_LIMIT_DELAY_MS } = config;

/**
 * Create a fetch request with timeout
 * @param {string} url - Request URL
 * @param {object} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = SHOPIFY_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep helper for rate limiting
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getShopifyAccessTokenForStore(storeId) {
  const envName = `SHOPIFY_ACCESS_TOKEN_${storeId}`;
  const token = process.env[envName];
  if (!token) {
    throw new Error(`Missing env var ${envName} for store_id=${storeId}`);
  }
  return token;
}

/**
 * Execute Shopify GraphQL query with timeout and retries
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Access token
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 * @param {object} options - Options (retries, retryDelay)
 * @returns {Promise<object>} Query result
 */
async function shopifyGraphQL(storeDomain, accessToken, query, variables = {}, options = {}) {
  const { retries = config.SHOPIFY_MAX_RETRIES, retryDelay = SHOPIFY_RATE_LIMIT_DELAY_MS } = options;
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!res.ok) {
        const text = await res.text();

        // Retry on rate limit or server errors
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const waitTime = res.status === 429 ? retryDelay * 2 : retryDelay;
          logger.warn('Shopify API error, retrying', { status: res.status, attempt, waitTime });
          await sleep(waitTime * attempt);
          continue;
        }

        throw new Error(`Shopify GraphQL error: ${res.status} ${text}`);
      }

      const data = await res.json();
      if (data.errors) {
        logger.error('GraphQL errors', { errors: data.errors });
        throw new Error('Shopify GraphQL returned errors');
      }
      return data.data;

    } catch (err) {
      if (attempt < retries && (err.message.includes('timeout') || err.code === 'ECONNRESET')) {
        logger.warn('Shopify request failed, retrying', { error: err.message, attempt });
        await sleep(retryDelay * attempt);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Execute Shopify REST API request with timeout and retries
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Access token
 * @param {string} path - API path
 * @param {string} method - HTTP method
 * @param {object} body - Request body
 * @param {boolean} returnFullResponse - Return full response object
 * @param {object} options - Options (retries, retryDelay)
 * @returns {Promise<object|Response>} API response
 */
async function shopifyREST(storeDomain, accessToken, path, method = 'GET', body = null, returnFullResponse = false, options = {}) {
  const { retries = config.SHOPIFY_MAX_RETRIES, retryDelay = SHOPIFY_RATE_LIMIT_DELAY_MS } = options;
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method,
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (returnFullResponse) {
        return res;
      }

      if (!res.ok) {
        const text = await res.text();

        // Retry on rate limit or server errors
        if ((res.status === 429 || res.status >= 500) && attempt < retries) {
          const waitTime = res.status === 429 ? retryDelay * 2 : retryDelay;
          logger.warn('Shopify REST error, retrying', { status: res.status, path, attempt, waitTime });
          await sleep(waitTime * attempt);
          continue;
        }

        throw new Error(`Shopify REST error: ${method} ${path} -> ${res.status} ${text}`);
      }

      return res.json();

    } catch (err) {
      if (attempt < retries && (err.message.includes('timeout') || err.code === 'ECONNRESET')) {
        logger.warn('Shopify REST request failed, retrying', { error: err.message, path, attempt });
        await sleep(retryDelay * attempt);
        continue;
      }
      throw err;
    }
  }
}

function buildSearchParams(obj = {}) {
  const search = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function fetchOrdersList(storeDomain, accessToken, query = {}) {
  const search = buildSearchParams(query);
  const path = `/orders.json${search}`;
  return shopifyREST(storeDomain, accessToken, path, 'GET');
}

function extractPageInfo(linkHeader, rel = 'next') {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const sections = part.split(';').map((s) => s.trim());
    const urlPart = sections[0] || '';
    const relPart = sections[1] || '';
    if (!relPart.includes(`rel=\"${rel}\"`)) continue;
    const match = urlPart.match(/page_info=([^&>]+)/);
    if (match && match[1]) {
      return match[1].replace(/["<>]/g, '');
    }
  }
  return null;
}

function buildOrdersQuery(query = {}) {
  const hasPageInfo = !!query.page_info;
  if (!hasPageInfo) {
    return query;
  }
  const minimal = {};
  if (query.page_info) minimal.page_info = query.page_info;
  if (query.limit) minimal.limit = query.limit;
  if (query.fields) minimal.fields = query.fields;
  return minimal;
}

async function fetchOrdersPage(storeDomain, accessToken, query = {}) {
  const search = buildSearchParams(buildOrdersQuery(query));
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json${search}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify REST error: GET /orders.json${search} -> ${res.status} ${text}`);
  }

  const data = await res.json();
  const linkHeader = res.headers.get('link');
  const nextPageInfo = extractPageInfo(linkHeader, 'next');
  const prevPageInfo = extractPageInfo(linkHeader, 'previous');

  return {
    orders: data.orders || [],
    nextPageInfo,
    prevPageInfo,
    linkHeader,
  };
}

async function fetchOrdersCount(storeDomain, accessToken, query = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.created_at_min) params.set('created_at_min', query.created_at_min);
  if (query.created_at_max) params.set('created_at_max', query.created_at_max);
  if (query.financial_status) params.set('financial_status', query.financial_status);
  if (query.fulfillment_status) params.set('fulfillment_status', query.fulfillment_status);

  const search = params.toString() ? '?' + params.toString() : '';
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/orders/count.json${search}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Shopify orders count error: ${res.status} ${text}`);
    return 0;
  }

  const data = await res.json();
  return data.count || 0;
}

async function fetchAllOrdersPaginated(storeDomain, accessToken, query = {}) {
  const all = [];
  const baseQuery = { ...query };
  let pageInfo = baseQuery.page_info || null;
  delete baseQuery.page_info;

  let isFirstPage = !pageInfo;

  while (true) {
    const pageQuery = isFirstPage
      ? { ...baseQuery }
      : {
          page_info: pageInfo,
          limit: baseQuery.limit,
          fields: baseQuery.fields,
        };

    const { orders, nextPageInfo } = await fetchOrdersPage(storeDomain, accessToken, pageQuery);
    if (!orders || !orders.length) {
      break;
    }
    all.push(...orders);
    if (!nextPageInfo) {
      break;
    }
    pageInfo = nextPageInfo;
    isFirstPage = false;
  }

  return all;
}

async function fetchOrderDetail(storeDomain, accessToken, orderId, query = {}) {
  const safeId = encodeURIComponent(orderId);
  const search = buildSearchParams(query);
  const path = `/orders/${safeId}.json${search}`;
  return shopifyREST(storeDomain, accessToken, path, 'GET');
}

async function findProductIdByHandle(storeDomain, accessToken, handle) {
  const query = `
    query getProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        status
        tags
      }
    }
  `;
  const data = await shopifyGraphQL(storeDomain, accessToken, query, { handle });
  return data.productByHandle ? data.productByHandle.id : null;
}

async function findProductIdBySkuAndTag(storeDomain, accessToken, sku, tag) {
  if (!sku) return null;

  const query = `
    query getVariantBySku($query: String!) {
      productVariants(first: 10, query: $query) {
        edges {
          node {
            id
            sku
            product {
              id
              status
              tags
              title
              handle
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(storeDomain, accessToken, query, {
    query: `sku:${JSON.stringify(sku)}`,
  });

  const edges = data.productVariants?.edges || [];
  for (const edge of edges) {
    const v = edge.node;
    if (!v || !v.product) continue;
    const product = v.product;
    const tags = product.tags || [];
    const hasTag = tags.includes(tag);
    const isActive = product.status === 'ACTIVE' || product.status === 'active';

    if (hasTag && isActive) {
      return product.id;
    }
  }

  return null;
}

async function getProductByGid(storeDomain, accessToken, gid) {
  if (!gid) return null;
  const numericId = gid.split('/').pop();
  const path = `/products/${numericId}.json`;
  const res = await shopifyREST(storeDomain, accessToken, path, 'GET');
  return res.product;
}

async function createProductInStore(store, accessToken, productData) {
  const path = '/products.json';
  const body = { product: productData };
  const res = await shopifyREST(store.shopify_domain, accessToken, path, 'POST', body);
  return res.product;
}

async function updateProductInStore(store, accessToken, productId, productData) {
  const numericId = productId.split('/').pop();
  const path = `/products/${numericId}.json`;
  const body = { product: { id: numericId, ...productData } };
  const res = await shopifyREST(store.shopify_domain, accessToken, path, 'PUT', body);
  return res.product;
}

async function deleteProductInStore(store, accessToken, productId) {
  const numericId = productId.split('/').pop();
  const path = `/products/${numericId}.json`;
  await shopifyREST(store.shopify_domain, accessToken, path, 'DELETE');
}

/**
 * Get product images from Shopify
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Access token
 * @param {string} productId - Product ID (numeric or GID)
 * @returns {Promise<Array>} - Array of image objects
 */
async function getProductImages(storeDomain, accessToken, productId) {
  const numericId = String(productId).split('/').pop();
  const path = `/products/${numericId}/images.json`;
  const res = await shopifyREST(storeDomain, accessToken, path, 'GET');
  return res.images || [];
}

/**
 * Delete all images from a Shopify product
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Access token
 * @param {string} productId - Product ID
 * @returns {Promise<number>} - Number of images deleted
 */
async function deleteProductImages(storeDomain, accessToken, productId) {
  const images = await getProductImages(storeDomain, accessToken, productId);
  const numericProductId = String(productId).split('/').pop();

  for (const image of images) {
    const path = `/products/${numericProductId}/images/${image.id}.json`;
    try {
      await shopifyREST(storeDomain, accessToken, path, 'DELETE');
    } catch (err) {
      console.error(`[shopify] Failed to delete image ${image.id}:`, err.message);
    }
  }

  return images.length;
}

/**
 * Upload images to a Shopify product from URLs
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Access token
 * @param {string} productId - Product ID
 * @param {Array<{src: string, position?: number, alt?: string}>} images - Images to upload
 * @returns {Promise<Array>} - Array of created image objects
 */
async function uploadProductImages(storeDomain, accessToken, productId, images) {
  const numericId = String(productId).split('/').pop();
  const uploaded = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const path = `/products/${numericId}/images.json`;

    try {
      const res = await shopifyREST(storeDomain, accessToken, path, 'POST', {
        image: {
          src: img.src,
          position: img.position || (i + 1),
          alt: img.alt || '',
        },
      });
      uploaded.push(res.image);
    } catch (err) {
      console.error(`[shopify] Failed to upload image ${img.src}:`, err.message);
      // Continue with other images
    }
  }

  return uploaded;
}

/**
 * Sync product images - replaces all existing images with new ones if fingerprint changed
 * @param {string} storeDomain - Shopify store domain
 * @param {string} accessToken - Access token
 * @param {string} productId - Product ID
 * @param {Array<{src: string, position?: number, alt?: string}>} images - Images to sync
 * @param {object} options - Sync options
 * @returns {Promise<object>} - Sync result
 */
async function syncProductImages(storeDomain, accessToken, productId, images, options = {}) {
  const { forceReplace = false } = options;

  console.log(`[shopify] Syncing ${images.length} images to product ${productId}`);

  // Get existing images
  const existingImages = await getProductImages(storeDomain, accessToken, productId);
  console.log(`[shopify] Found ${existingImages.length} existing images`);

  // If force replace or we have new images to upload
  if (forceReplace || images.length > 0) {
    // Delete existing images if we're replacing
    if (existingImages.length > 0 && (forceReplace || images.length > 0)) {
      console.log(`[shopify] Deleting ${existingImages.length} existing images`);
      await deleteProductImages(storeDomain, accessToken, productId);
    }

    // Upload new images
    if (images.length > 0) {
      console.log(`[shopify] Uploading ${images.length} new images`);
      const uploaded = await uploadProductImages(storeDomain, accessToken, productId, images);
      console.log(`[shopify] Successfully uploaded ${uploaded.length} images`);

      return {
        success: true,
        deleted: existingImages.length,
        uploaded: uploaded.length,
        images: uploaded,
      };
    }
  }

  return {
    success: true,
    deleted: 0,
    uploaded: 0,
    images: existingImages,
    skipped: true,
  };
}

// ==================== CUSTOMERS ====================

function buildCustomersQuery(query = {}) {
  const hasPageInfo = !!query.page_info;
  if (!hasPageInfo) {
    return query;
  }
  // When using page_info, only include: page_info, limit, fields
  const minimal = {};
  if (query.page_info) minimal.page_info = query.page_info;
  if (query.limit) minimal.limit = query.limit;
  if (query.fields) minimal.fields = query.fields;
  return minimal;
}

async function fetchCustomersPage(storeDomain, accessToken, query = {}) {
  const search = buildSearchParams(buildCustomersQuery(query));
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/customers.json${search}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify REST error: GET /customers.json${search} -> ${res.status} ${text}`);
  }

  const data = await res.json();
  const linkHeader = res.headers.get('link');
  const nextPageInfo = extractPageInfo(linkHeader, 'next');
  const prevPageInfo = extractPageInfo(linkHeader, 'previous');

  return {
    customers: data.customers || [],
    nextPageInfo,
    prevPageInfo,
    linkHeader,
  };
}

async function fetchCustomerDetail(storeDomain, accessToken, customerId, query = {}) {
  const safeId = encodeURIComponent(customerId);
  const search = buildSearchParams(query);
  const path = `/customers/${safeId}.json${search}`;
  return shopifyREST(storeDomain, accessToken, path, 'GET');
}

module.exports = {
  getShopifyAccessTokenForStore,
  shopifyGraphQL,
  shopifyREST,
  findProductIdByHandle,
  findProductIdBySkuAndTag,
  getProductByGid,
  createProductInStore,
  updateProductInStore,
  deleteProductInStore,
  getProductImages,
  deleteProductImages,
  uploadProductImages,
  syncProductImages,
  fetchOrdersList,
  fetchOrderDetail,
  fetchOrdersPage,
  fetchOrdersCount,
  fetchAllOrdersPaginated,
  extractPageInfo,
  fetchCustomersPage,
  fetchCustomerDetail,
};
