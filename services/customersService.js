// services/customersService.js
// Service for deriving customer data from live Shopify orders

const { fetchOrders } = require('./ordersService');
const { safePrice } = require('../lib/orderUtils');

/**
 * Build customers from a set of orders (in-memory aggregation)
 * Similar to buildCustomersFromOrdersLog but works on normalized order objects
 */
function buildCustomersFromOrders(orders = []) {
  const map = new Map();

  orders.forEach(order => {
    // Build key from customer_id or email
    const key =
      (order.customer_id && `${order.store_id}::${order.customer_id}`) ||
      (order.customer_email && `${order.store_id}::${order.customer_email}`);

    if (!key) return;

    const existing = map.get(key) || {
      store_id: order.store_id,
      store_name: order.store_name || order.store_id,
      shopify_domain: order.shopify_domain || '',
      customer_id: order.customer_id || null,
      email: order.customer_email || '',
      name: order.customer_name || '',
      first_name: '',
      last_name: '',
      total_orders: 0,
      total_spent: 0,
      first_order_date: null,
      last_order_date: null,
      created_at: null,
      updated_at: null,
      currency: order.currency || 'RON',
    };

    // Parse name into first/last
    if (order.customer_name && !existing.first_name) {
      const parts = String(order.customer_name).trim().split(' ').filter(Boolean);
      existing.first_name = parts[0] || '';
      existing.last_name = parts.slice(1).join(' ') || '';
    }

    existing.total_orders += 1;
    const priceNum = safePrice(order.total_price);
    if (!isNaN(priceNum)) {
      existing.total_spent += priceNum;
    }

    const createdAt = order.created_at ? new Date(order.created_at) : null;
    if (createdAt && !isNaN(createdAt.getTime())) {
      const iso = createdAt.toISOString();
      if (!existing.first_order_date || createdAt < new Date(existing.first_order_date)) {
        existing.first_order_date = iso;
        existing.created_at = iso;
      }
      if (!existing.last_order_date || createdAt > new Date(existing.last_order_date)) {
        existing.last_order_date = iso;
      }
      existing.updated_at = new Date().toISOString();
    }

    map.set(key, existing);
  });

  return Array.from(map.values());
}

/**
 * Fetch customers by deriving them from current orders
 * Uses the same filters as orders (store, date range, search)
 */
async function fetchCustomers(filters = {}) {
  const {
    store_id: storeIdFilter = 'all',
    from = null,
    to = null,
    q: searchQuery = '',
    limit = 100,
  } = filters;

  // Fetch orders with a higher limit to get more customer data
  const ordersLimit = Math.min(parseInt(limit, 10) * 2, 500);
  const ordersResult = await fetchOrders({
    store_id: storeIdFilter,
    from,
    to,
    status: 'any',
    limit: ordersLimit,
  });

  // Build customers from orders
  const customers = buildCustomersFromOrders(ordersResult.orders);

  // Apply search filter to customers
  let filtered = customers;
  if (searchQuery) {
    const needle = searchQuery.toLowerCase();
    filtered = customers.filter(customer => {
      const haystack = [
        customer.name,
        customer.email,
        customer.customer_id,
        customer.store_name,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(needle);
    });
  }

  // Sort by last_order_date descending
  filtered.sort((a, b) => {
    const ta = a.last_order_date ? Date.parse(a.last_order_date) : 0;
    const tb = b.last_order_date ? Date.parse(b.last_order_date) : 0;
    return tb - ta;
  });

  // Apply limit
  const limitNum = parseInt(limit, 10) || 100;
  const sliced = filtered.slice(0, limitNum);

  return {
    customers: sliced,
    page: 1,
    limit: limitNum,
    total: filtered.length,
    hasNext: filtered.length > limitNum,
    hasPrev: false,
  };
}

/**
 * Get customer details with their order history
 */
async function getCustomerDetail(storeId, customerId, filters = {}) {
  const { from = null, to = null } = filters;

  // Fetch orders for this customer
  // We'll fetch all recent orders for the store and then filter by customer
  const ordersResult = await fetchOrders({
    store_id: storeId,
    from,
    to,
    status: 'any',
    limit: 250, // Fetch more to ensure we get this customer's orders
  });

  // Filter orders for this specific customer
  const customerOrders = ordersResult.orders.filter(order => {
    const idMatch = order.customer_id && String(order.customer_id) === String(customerId);
    const emailMatch = order.customer_email &&
      String(order.customer_email).toLowerCase() === String(customerId).toLowerCase();
    return idMatch || emailMatch;
  });

  if (customerOrders.length === 0) {
    return null; // Customer not found
  }

  // Build customer aggregate from their orders
  const customers = buildCustomersFromOrders(customerOrders);
  const customer = customers[0];

  if (!customer) {
    return null;
  }

  // Extract phone and address from most recent order
  const mostRecent = customerOrders[0];
  const phone = mostRecent?.phone ||
    mostRecent?.customer?.phone ||
    mostRecent?.billing_address?.phone ||
    mostRecent?.shipping_address?.phone ||
    null;

  const defaultAddress = mostRecent?.shipping_address || mostRecent?.billing_address || null;

  return {
    customer: {
      ...customer,
      phone,
      default_address: defaultAddress,
    },
    orders: customerOrders,
  };
}

module.exports = {
  fetchCustomers,
  getCustomerDetail,
  buildCustomersFromOrders,
};
