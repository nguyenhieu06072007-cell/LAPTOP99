/* ==========================================================================
   STOREFRONT MVC SERVICE: Customer Authentication & Profile Service
   ========================================================================== */

const AuthService = {
  async login(email, password) {
    const res = await API.post('/auth/login', { email, password }, true);
    if (res && res.token) {
      API.setToken(res.token);
    }
    return res;
  },

  async register(payload) {
    const res = await API.post('/auth/register', payload, true);
    if (res && res.token) {
      API.setToken(res.token);
    }
    return res;
  },

  async getMe() {
    return await API.get('/auth/me', true);
  },

  async updateProfile(payload) {
    return await API.put('/auth/profile', payload, false);
  },

  async forgotPassword(email) {
    return await API.post('/auth/forgot-password', { email }, true);
  },

  logout() {
    API.setToken(null);
  },
};

