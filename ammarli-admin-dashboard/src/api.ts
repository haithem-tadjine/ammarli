import axios from 'axios';

// ====================================================================
// Production API base URL (hardcoded to prevent Netlify build issues)
// VITE_API_BASE_URL env var is supported as override for local dev only
// ====================================================================
const PRODUCTION_API = 'https://ammarli-production.up.railway.app/api/v1';

const rawEnvUrl = import.meta.env.VITE_API_BASE_URL;
const BASE_URL =
  typeof rawEnvUrl === 'string' && rawEnvUrl.trim().startsWith('https://')
    ? rawEnvUrl.trim()
    : PRODUCTION_API;

// Create an Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request Interceptor: Attach the JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_role');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
