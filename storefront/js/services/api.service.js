/* ==========================================================================
   SERVICE LAYER (MVC): API Service communicating with Backend REST API
   ========================================================================== */
const API = {
  BASE_URL: (function() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('LAPTOP99_API_URL')) {
        return localStorage.getItem('LAPTOP99_API_URL');
      }
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:4000/api/client';
      }
    } catch(e) {}
    return 'https://laptop99-ejug.onrender.com/api/client';
  })(),
  TOKEN_KEY: 'laptop99_client_token',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    else localStorage.removeItem(this.TOKEN_KEY);
  },

  async request(path, options = {}) {
    const url = this.BASE_URL + path;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), options.timeout || 4500) : null;

    try {
      const res = await fetch(url, {
        cache: 'no-cache',
        signal: controller ? controller.signal : undefined,
        ...options,
        headers,
      });
      if (timeoutId) clearTimeout(timeoutId);

      let data = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        const msg = (data && data.error && data.error.message) || (data && data.message) || ('Lỗi máy chủ (' + res.status + ')');
        if (!options.silent && typeof toast === 'function') toast(msg, 1);
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netMsg = 'Không kết nối được máy chủ (' + this.BASE_URL + ')';
        if (!options.silent && typeof toast === 'function') toast(netMsg, 1);
        throw new Error(netMsg);
      }
      throw err;
    }
  },

  get(path, silent = false) {
    return this.request(path, { method: 'GET', silent });
  },

  post(path, body, silent = false) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body || {}), silent });
  },

  put(path, body, silent = false) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body || {}), silent });
  },
};

