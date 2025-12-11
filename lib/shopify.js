// lib/shopify.js
const fetch = require('node-fetch');
const { SHOPIFY_API_VERSION } = require('../config');

function getShopifyAccessTokenForStore(storeId) {
  const envName = `SHOPIFY_ACCESS_TOKEN_${storeId}`;
  const token = process.env[envName];
  if (!token) {
    throw new Error(`Missing env var ${envName} for store_id=${storeId}`);
  }
  return token;
}

async function shopifyGraphQL(storeDomain, accessToken, query, variables = {}) {
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify GraphQL error: ${res.status} ${text}`);
  }

  const data = await res.json();
  if (data.errors) {
    console.error('GraphQL errors', data.errors);
    throw new Error('Shopify GraphQL returned errors');
  }
  return data.data;
}

async function shopifyREST(storeDomain, accessToken, path, method = 'GET', body = null) {
  const url = `https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify REST error: ${method} ${path} -> ${res.status} ${text}`);
  }

  return res.json();
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

async function fetchOrdersPage(storeDomain, accessToken, query = {}) {
  const search = buildSearchParams(query);
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

  return {
    orders: data.orders || [],
    nextPageInfo,
    linkHeader,
  };
}

async function fetchAllOrdersPaginated(storeDomain, accessToken, query = {}) {
  const all = [];
  const baseQuery = { ...query };
  let pageInfo = baseQuery.page_info || null;
  delete baseQuery.page_info;

  while (true) {
    const pageQuery = { ...baseQuery };
    if (pageInfo) {
      pageQuery.page_info = pageInfo;
    }
    const { orders, nextPageInfo } = await fetchOrdersPage(storeDomain, accessToken, pageQuery);
    if (!orders || !orders.length) {
      break;
    }
    all.push(...orders);
    if (!nextPageInfo) {
      break;
    }
    pageInfo = nextPageInfo;
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
  fetchOrdersList,
  fetchOrderDetail,
  fetchOrdersPage,
  fetchAllOrdersPaginated,
  extractPageInfo,
};
