// lib/mapping.js
const { SCRIPT_TAG } = require('../config');
const { findProductIdBySkuAndTag } = require('./shopify');

function buildProductPayload(product, store, psRow, imageUrls = []) {
  const title = psRow.title || product.internal_name || product.master_sku;
  const body_html = psRow.description_html || '';

  let price = psRow.price;
  if (!price && product.base_price) {
    const mult = store.price_multiplier ? parseFloat(store.price_multiplier) : 1;
    price = (parseFloat(product.base_price) * mult).toFixed(2);
  }

  const compare_at_price = psRow.compare_at_price || undefined;
  const sku = psRow.store_sku || product.master_sku || product.internal_product_id;

  const baseTagsString = psRow.tags_override || product.tags || '';
  const tagsArray = baseTagsString
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!tagsArray.includes(SCRIPT_TAG)) {
    tagsArray.push(SCRIPT_TAG);
  }

  const tags = tagsArray.join(', ');
  const status = (psRow.status || 'active').toLowerCase();

  const payload = {
    title,
    body_html,
    handle: psRow.handle || undefined,
    status,
    tags,
    metafields_global_title_tag: psRow.seo_title || undefined,
    metafields_global_description_tag: psRow.seo_description || undefined,
    variants: [
      {
        price: price || '0.00',
        compare_at_price: compare_at_price || undefined,
        sku,
        taxable: true
      }
    ]
  };

  if (Array.isArray(imageUrls) && imageUrls.length) {
    payload.images = imageUrls.map((u) => ({ src: u }));
  }

  return payload;
}

async function determinePlannedActionForRow(store, accessToken, product, psRow) {
  const rawAction = (psRow.sync_action || '').toLowerCase();
  const validActions = ['create', 'update', 'delete'];

  if (!validActions.includes(rawAction)) {
    return { plannedAction: 'skip', reason: 'sync_action not in create/update/delete' };
  }

  if (rawAction === 'delete') {
    return { plannedAction: 'delete', reason: 'explicit delete' };
  }

  const sku = psRow.store_sku || product.master_sku || product.internal_product_id;

  const existingProductId = await findProductIdBySkuAndTag(
    store.shopify_domain,
    accessToken,
    sku,
    SCRIPT_TAG
  );

  if (existingProductId) {
    return {
      plannedAction: 'update',
      reason: 'existing product found by SKU + script tag',
      existingProductId
    };
  }

  return {
    plannedAction: 'create',
    reason: 'no existing product with SKU + script tag'
  };
}

module.exports = {
  buildProductPayload,
  determinePlannedActionForRow
};