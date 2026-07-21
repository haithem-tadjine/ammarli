/**
 * ─── AsyncStorage Helpers ─────────────────────────────────────────────────────
 * Typed wrappers around AsyncStorage for common operations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      let value: string | null = null;
      if (key === 'AUTH_TOKEN' && !isWeb) {
        value = await SecureStore.getItemAsync(key);
      } else {
        value = await AsyncStorage.getItem(key);
      }
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (key === 'AUTH_TOKEN' && !isWeb) {
        await SecureStore.setItemAsync(key, stringValue);
      } else {
        await AsyncStorage.setItem(key, stringValue);
      }
    } catch (e) {
      console.warn('[Storage] set error:', e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (key === 'AUTH_TOKEN' && !isWeb) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[Storage] remove error:', e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      if (!isWeb) {
        await SecureStore.deleteItemAsync('AUTH_TOKEN');
      }
    } catch (e) {
      console.warn('[Storage] clear error:', e);
    }
  },
};

// ── Storage Keys (centralized to avoid typos) ─────────────────────────────────
export const STORAGE_KEYS = {
  USER_ROLE: 'ammarli_user_role',
  USER_PROFILE: 'ammarli_user_profile',
  APP_LANGUAGE: 'ammarli_language',
} as const;
