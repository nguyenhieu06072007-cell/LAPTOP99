import axios from 'axios';

const api = axios.create({
  baseURL: 'https://laptop99-ejug.onrender.com/api/admin',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      const errorMessage = error.response.data?.error?.message || error.response.data?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.';
      error.message = errorMessage;
    } else if (error.request) {
      error.message = 'Không thể kết nối đến máy chủ.';
    } else {
      error.message = 'Đã xảy ra lỗi hệ thống.';
    }
    return Promise.reject(error);
  }
);

export default api;
