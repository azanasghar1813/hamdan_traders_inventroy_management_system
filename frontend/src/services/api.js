import axios from 'axios';
import { setupCache } from 'axios-cache-interceptor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const baseApi = axios.create({
  baseURL: API_URL,
});

// Setup global cache for all GET requests (5 minutes TTL)
const api = setupCache(baseApi, {
  ttl: 1000 * 60 * 5, 
});

// Request interceptor to add the auth token to headers
api.interceptors.request.use(
  (config) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo && userInfo.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 unauthorized globally and clear cache on mutations
api.interceptors.response.use(
  (response) => {
    // If the request was a mutation (create, update, delete), clear the entire cache
    if (['post', 'put', 'patch', 'delete'].includes(response.config.method)) {
      api.storage.clear();
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear user and optionally redirect to login
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
