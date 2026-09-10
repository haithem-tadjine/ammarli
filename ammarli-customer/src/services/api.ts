import axios from 'axios';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { Alert } from 'react-native';

// Use EXPO_PUBLIC_API_URL from .env — fallback to localhost for web/dev
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://amerli-backend.onrender.com';
const API_URL = `${BASE_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': 'ar',
    'x-lang': 'ar',
  },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await storage.get<string>('AUTH_TOKEN');
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (error) {
    console.warn('Error reading auth token', error);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Handle 401 for all routes
    if (error.response?.status === 401 && config?.url !== '/auth/logout') {
      const { useAuthStore } = require('../store/useAuthStore');
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // Exponential Backoff Setup
    if (config && (!error.response || error.response.status >= 500)) {
      config.retryCount = config.retryCount || 0;
      
      if (config.retryCount < 3) {
        config.retryCount += 1;
        const delay = Math.pow(2, config.retryCount) * 1000;
        console.log(`[API] Retrying ${config.url} (Attempt ${config.retryCount}) after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    if (!error.response && error.message === 'Network Error') {
      Alert.alert('خطأ في الاتصال', 'انقطع الاتصال بالإنترنت، يرجى التحقق من الشبكة وإعادة المحاولة.');
    }

    return Promise.reject(error);
  }
);
