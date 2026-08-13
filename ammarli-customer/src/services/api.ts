import axios from 'axios';
import { storage, STORAGE_KEYS } from '../utils/storage';

// Use EXPO_PUBLIC_API_URL from .env — fallback to localhost for web/dev
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
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
    if (error.response?.status === 401 && error.config?.url !== '/auth/logout') {
      const { useAuthStore } = require('../store/useAuthStore');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
