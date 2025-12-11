// lib/orderUtils.js
// Shared helpers for working with Shopify order payloads and normalization logic.

function safePrice(value) {
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}

function parseDateParam(raw, endOfDay = false) {
  if (!raw) return null;
  const isoCandidate = raw.includes('T') ? raw : `${raw}T00:00:00Z`;
  const d = new Date(isoCandidate);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d.toISOString();
}

function orderMatchesQuery(order, queryText) {
  if (!queryText) return true;
  const needle = queryText.toLowerCase();
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const customerName = order.customer
    ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`
    : '';
  const emails = [order.email, order.customer && order.customer.email]
    .filter(Boolean)
    .join(' ');
  const productNames = lineItems.map((li) => li.title || '').join(' ');
  const billingName = order.billing_address ? order.billing_address.name || '' : '';
  const shippingName = order.shipping_address
    ? order.shipping_address.name ||
      order.shipping_address.first_name ||
      order.shipping_address.last_name ||
      ''
    : '';

  const haystack = [
    order.name,
    order.order_number,
    customerName,
    emails,
    productNames,
    billingName,
    shippingName,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

function normalizeOrderListEntry(order, store) {
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const qtyTotal = lineItems.reduce((acc, li) => acc + (li.quantity || 0), 0);

  const simpleLineItems = lineItems.map((li) => ({
    id: li.id,
    product_id: li.product_id,
    title: li.title,
    quantity: li.quantity || 0,
  }));

  const summaryParts = lineItems.slice(0, 3).map((li) => {
    const qty = li.quantity || 1;
    const title = li.title || 'Item';
    return `${qty} × ${title}`;
  });
  if (lineItems.length > 3) {
    summaryParts.push(`+${lineItems.length - 3} more`);
  }
  const itemsSummary =
    summaryParts.join(', ') || (lineItems[0] && lineItems[0].title) || '—';

  const customerName =
    (order.customer &&
      `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()) ||
    (order.shipping_address && order.shipping_address.name) ||
    (order.billing_address && order.billing_address.name) ||
    'Guest';

  return {
    id: order.id,
    store_id: store.store_id,
    store_name: store.store_name || store.store_id,
    shopify_domain: store.shopify_domain || '',
    customer_id: order.customer && order.customer.id ? order.customer.id : null,
    customer_email: order.email || (order.customer && order.customer.email) || '',
    name: order.name || `#${order.order_number || order.id}`,
    created_at: order.created_at,
    customer_name: customerName || 'Guest',
    items_count: qtyTotal || lineItems.length || 0,
    items_summary: itemsSummary,
    total_price: safePrice(order.total_price),
    currency: order.currency || store.currency || 'RON',
    financial_status: order.financial_status || null,
    fulfillment_status: order.fulfillment_status || null,
    line_items: simpleLineItems,
  };
}

function normalizeOrderDetail(order, store) {
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const mappedLineItems = lineItems.map((li) => {
    const imageFromProps =
      li.properties && Array.isArray(li.properties)
        ? (li.properties.find(
            (p) =>
              (p.name && (p.name === 'image' || p.name === 'image_src')) ||
              (p.key && (p.key === 'image' || p.key === 'image_src'))
          ) || {}).value
        : null;
    const imageSrc =
      (li.image && (li.image.src || li.image.original_src)) ||
      li.image ||
      li.image_url ||
      li.imageUrl ||
      (li.variant && li.variant.image && (li.variant.image.src || li.variant.image.original_src)) ||
      imageFromProps ||
      null;
    return {
      id: li.id,
      product_id: li.product_id,
      variant_id: li.variant_id,
      title: li.title,
      sku: li.sku,
      quantity: li.quantity || 0,
      price: safePrice(li.price),
      total: safePrice(li.price) * (li.quantity || 0),
      fulfillment_status: li.fulfillment_status || null,
      image_src: imageSrc,
    };
  });
  const itemsCount = mappedLineItems.reduce((acc, li) => acc + (li.quantity || 0), 0);

  return {
    id: order.id,
    name: order.name || `#${order.order_number || order.id}`,
    order_number: order.order_number,
    store_id: store.store_id,
    store_name: store.store_name || store.store_id,
    created_at: order.created_at,
    processed_at: order.processed_at,
    currency: order.currency || store.currency || 'RON',
    subtotal_price: safePrice(order.subtotal_price || order.current_subtotal_price),
    total_price: safePrice(order.total_price || order.current_total_price),
    total_tax: safePrice(order.total_tax || order.current_total_tax),
    total_discounts: safePrice(order.total_discounts),
    shopify_domain: store.shopify_domain || '',
    financial_status: order.financial_status || null,
    fulfillment_status: order.fulfillment_status || null,
    payment_gateway_names: order.payment_gateway_names || [],
    billing_address: order.billing_address || null,
    shipping_address: order.shipping_address || null,
    shipping_lines: order.shipping_lines || [],
    customer: order.customer
      ? {
          id: order.customer.id,
          first_name: order.customer.first_name || '',
          last_name: order.customer.last_name || '',
          email: order.customer.email || order.email || '',
          phone: order.customer.phone || order.phone || '',
        }
      : null,
    contact_email: order.contact_email || order.email || null,
    phone: order.phone || null,
    line_items: mappedLineItems,
    items_count: itemsCount,
    fulfillments: order.fulfillments || [],
    tags: order.tags || '',
  };
}

module.exports = {
  safePrice,
  parseDateParam,
  orderMatchesQuery,
  normalizeOrderListEntry,
  normalizeOrderDetail,
};
