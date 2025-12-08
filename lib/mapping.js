// lib/mapping.js
const { SCRIPT_TAG } = require('../config');
const { findProductIdBySkuAndTag } = require('./shopify');

/**
 * Construiește payload-ul Shopify pentru un produs
 */
function buildProductPayload(product, store, psRow, imageUrls = []) {
  const title = psRow.title || product.internal_name || product.master_sku;
  const body_html = psRow.description_html || '';

  // preț
  let price = psRow.price;
  if (!price && product.base_price) {
    const mult = store.price_multiplier ? parseFloat(store.price_multiplier) : 1;
    price = (parseFloat(product.base_price) * mult).toFixed(2);
  }

  const compare_at_price = psRow.compare_at_price || undefined;
  const sku = psRow.store_sku || product.master_sku || product.internal_product_id;

  // tags: din Product_Store override sau din Products, plus tag-ul scriptului
  const baseTagsString = psRow.tags_override || product.tags || '';
  const tagsArray = baseTagsString
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!tagsArray.includes(SCRIPT_TAG)) {
    tagsArray.push(SCRIPT_TAG);
  }

  const tags = tagsArray.join(', ');
  const status = (psRow.status || 'active').toLowerCase(); // active/draft/archived

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
        taxable: true,
      },
    ],
  };

  if (Array.isArray(imageUrls) && imageUrls.length) {
    payload.images = imageUrls.map((u) => ({ src: u }));
  }

  return payload;
}

/**
 * Compară produsul existent din Shopify cu payload-ul nou.
 * - hasChanges: există ORICE diferență (inclusiv status)
 * - hasRealChanges: diferențe în afară de "status" (folosit pentru preview)
 */
function diffProduct(existing, payload) {
  const changed = [];

  // titlu
  const eTitle = existing.title || '';
  const pTitle = payload.title || '';
  if (eTitle !== pTitle) changed.push('titlu');

  // TAG-URI – normalizăm ca set (fără ordine, lowercase)
  const normTags = (str) =>
    (str || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join(',');

  if (normTags(existing.tags) !== normTags(payload.tags)) {
    changed.push('tag-uri');
  }

  // descriere
  const eBody = existing.body_html || '';
  const pBody = payload.body_html || '';
  if (eBody !== pBody) changed.push('descriere');

  // variante (doar prima)
  const eVar = (existing.variants && existing.variants[0]) || {};
  const pVar = (payload.variants && payload.variants[0]) || {};

  if ((eVar.price || '') !== (pVar.price || '')) changed.push('preț');

  if ((eVar.compare_at_price || '') !== (pVar.compare_at_price || '')) {
    changed.push('preț vechi');
  }

  // status
  const eStatus = (existing.status || '').toLowerCase();
  const pStatus = (payload.status || '').toLowerCase();
  if (eStatus !== pStatus) changed.push('status');

  // poze – ne uităm doar la număr (simplu și robust)
  const eCount = (existing.images || []).length;
  const pCount = (payload.images || []).length;
  if (eCount !== pCount) changed.push('poze');

  // „schimbări reale” = tot ce nu e doar status
  const realChangedFields = changed.filter((f) => f !== 'status');

  return {
    hasChanges: changed.length > 0,              // orice diferență
    hasRealChanges: realChangedFields.length > 0, // ignoră "doar status"
    changedFields: changed,
    realChangedFields,
  };
}

/**
 * Determină acțiunea reală (create/update/delete/skip) pentru un rând
 */
async function determinePlannedActionForRow(store, accessToken, product, psRow) {
  const rawAction = (psRow.sync_action || '').toLowerCase();
  const validActions = ['create', 'update', 'delete'];

  if (!validActions.includes(rawAction)) {
    return { plannedAction: 'skip', reason: 'sync_action not in create/update/delete' };
  }

  if (rawAction === 'delete') {
    return { plannedAction: 'delete', reason: 'explicit delete' };
  }

  // pentru create/update: dacă există produs cu SKU + tag -> update
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
      existingProductId,
    };
  }

  return {
    plannedAction: 'create',
    reason: 'no existing product with SKU + script tag',
  };
}

module.exports = {
  buildProductPayload,
  diffProduct,
  determinePlannedActionForRow,
};