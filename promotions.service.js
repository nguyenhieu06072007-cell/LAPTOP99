/* ==========================================================================
   STOREFRONT MVC SERVICE: Promotions, News, Banners, Trade-In & Warranty Service
   ========================================================================== */

const PromotionsService = {
  async getPromotions() {
    return await API.get('/promotions', true);
  },

  async checkCoupon(code, subtotal) {
    return await API.post('/promotions/check', { code, subtotal }, true);
  },

  async getNews() {
    return await API.get('/news', true);
  },

  async getBanners() {
    return await API.get('/banners', true);
  },

  async lookupWarranty(serial) {
    return await API.get(`/warranty?serial=${encodeURIComponent(serial)}`, false);
  },

  async submitReview(payload) {
    return await API.post('/reviews', payload, false);
  },

  async submitTradeIn(payload) {
    return await API.post('/trade-in', payload, false);
  },

  async getMyTradeIns() {
    return await API.get('/trade-in/my-requests', false);
  },

  async submitRma(payload) {
    return await API.post('/rma', payload, false);
  },

  async getMyRmas() {
    return await API.get('/rma/my-requests', false);
  },
};

