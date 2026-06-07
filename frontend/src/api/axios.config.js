import axios from 'axios';
import { clearUserSession } from '../utils/session';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - إضافة JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - معالجة الأخطاء
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect for auth endpoints - let the component handle the error
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password') || url.includes('/auth/verify-email') || url.includes('/auth/resend-verification');
      if (!isAuthEndpoint) {
        // Session expired or revoked. Wipe the full per-user session so
        // chats / avatar don't leak to whoever logs in next on this
        // browser (and aren't shown to the same user as 'previous state').
        clearUserSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
