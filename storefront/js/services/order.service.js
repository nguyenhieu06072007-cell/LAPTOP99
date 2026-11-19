/* ==========================================================================
   STOREFRONT MVC SERVICE: Order & Checkout Service
   ========================================================================== */

const OrderService = {
  async createOrder(payload) {
    return await API.post('/orders', payload, true);
  },

  async getMyOrders() {
    return await API.get('/orders/my-orders', false);
  },

  async cancelOrder(code, reason) {
    return await API.post(`/orders/${code}/cancel`, { reason }, false);
  },

  async confirmPayment(code) {
    return await API.post(`/orders/${code}/confirm-payment`, {}, false);
  },

  async getPaymentStatus(code) {
    return await API.request(`/orders/${encodeURIComponent(code)}/payment-status`, { timeout: 15000 });
  },

  async simulatePaid(code, details = {}) {
    return await API.post(`/orders/${code}/simulate-auto-paid`, details, false);
  },
};

