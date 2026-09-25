import axios from 'axios';

// Base URL: reads from VITE_API_BASE_URL env variable (set in .env)
// Fallback → Railway production URL
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://ammarli-production.up.railway.app/api/v1';

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
