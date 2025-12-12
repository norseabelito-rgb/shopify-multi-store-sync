// lib/customerUtils.js
// Shared helpers for working with Shopify customer payloads and normalization logic.

function safeNumber(value) {
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Normalize a Shopify customer object into a DB row for customers_index
 * @param {object} customer - Raw Shopify customer object
 * @param {object} store - Store context
 * @returns {object} - Normalized customer row
 */
function normalizeCustomerListEntry(customer, store) {
  const first_name = customer.first_name || '';
  const last_name = customer.last_name || '';
  const display_name = [first_name, last_name].filter(Boolean).join(' ').trim() || customer.email || 'Guest';

  // Extract default address fields
  const defaultAddress = customer.default_address || {};
  const default_address_city = defaultAddress.city || null;
  const default_address_province = defaultAddress.province || defaultAddress.province_code || null;
  const default_address_country = defaultAddress.country || defaultAddress.country_code || null;

  // Parse tags
  const tags = Array.isArray(customer.tags)
    ? customer.tags.join(', ')
    : (typeof customer.tags === 'string' ? customer.tags : null);

  // Last order info
  const last_order = customer.last_order || null;
  const last_order_id = last_order?.id ? Number(last_order.id) : null;
  const last_order_name = last_order?.name || null;

  return {
    store_id: store.store_id,
    customer_id: Number(customer.id),
    created_at: customer.created_at || null,
    updated_at: customer.updated_at || customer.created_at || null,
    email: customer.email || null,
    phone: customer.phone || null,
    first_name: first_name || null,
    last_name: last_name || null,
    display_name,
    tags,
    orders_count: customer.orders_count != null ? Number(customer.orders_count) : 0,
    total_spent: customer.total_spent != null ? safeNumber(customer.total_spent) : 0,
    last_order_id,
    last_order_name,
    verified_email: customer.verified_email === true,
    state: customer.state || null,
    default_address_city,
    default_address_province,
    default_address_country,
  };
}

module.exports = {
  normalizeCustomerListEntry,
  safeNumber,
};
