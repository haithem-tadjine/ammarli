/**
 * ─── AsyncStorage Helpers ─────────────────────────────────────────────────────
 * Typed wrappers around AsyncStorage for common operations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] set error:', e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] remove error:', e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
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
