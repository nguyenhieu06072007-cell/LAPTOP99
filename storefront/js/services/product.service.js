/* ==========================================================================
   STOREFRONT MVC SERVICE: Product, Category & Brand API Service
   ========================================================================== */

const ProductService = {
  async getProducts(params = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.limit) qs.set('limit', params.limit);
    const searchTerm = params.q || params.search;
    if (searchTerm) {
      qs.set('q', searchTerm);
      qs.set('search', searchTerm);
    }
    if (params.cat) qs.set('cat', params.cat);
    if (params.brand) qs.set('brand', params.brand);
    if (params.price) qs.set('price', params.price);
    if (params.ram) qs.set('ram', params.ram);
    if (params.cpu) qs.set('cpu', params.cpu);
    if (params.ssd) qs.set('ssd', params.ssd);
    if (params.sort) qs.set('sort', params.sort);
    if (params.bestseller) qs.set('bestseller', 1);
    if (params.newArrival) qs.set('newArrival', 1);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return await API.get(`/products${query}`, true);
  },

  async getProductDetail(id) {
    return await API.get(`/products/${id}`, true);
  },

  async getCategories() {
    return await API.get('/categories', true);
  },

  async getBrands() {
    return await API.get('/brands', true);
  },
};

