/* ==========================================================================
   STOREFRONT MVC SERVICE: Order & Checkout Service
   ========================================================================== */

const OrderService = {
  async createOrder(payload) {
    return await API.post('/orders', payload, false);
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
};

