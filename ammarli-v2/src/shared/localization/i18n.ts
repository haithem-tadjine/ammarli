/**
 * ─── Ammarli i18n Configuration ──────────────────────────────────────────────
 * Supports Arabic (default/RTL) and English (LTR).
 * RTL is applied at startup via applyStoredRTL() called from _layout.tsx.
 *
 * RTL Rule: All Styles must use marginStart/End & paddingStart/End.
 * Changing direction requires an app reload to fully apply.
 */

import { STORAGE_KEYS } from '../../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { changeLanguage as i18nChangeLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './ar.json';
import en from './en.json';

const DEFAULT_LANGUAGE = 'ar';

// ── Custom language detector (reads from AsyncStorage) ───────────────────────
const languageDetector: any = {
  type: 'languageDetector',
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.APP_LANGUAGE);
      callback(saved ?? DEFAULT_LANGUAGE);
    } catch {
      callback(DEFAULT_LANGUAGE);
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_LANGUAGE, language);
    } catch {
      /* silent */
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

/**
 * Apply RTL direction from stored language.
 * Must be called as early as possible (before any UI renders).
 * Returns the detected language.
 */
export const applyStoredRTL = async (): Promise<string> => {
  try {
    const lang = (await AsyncStorage.getItem(STORAGE_KEYS.APP_LANGUAGE)) ?? DEFAULT_LANGUAGE;
    const isRTL = lang === 'ar';
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    return lang;
  } catch {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
    return DEFAULT_LANGUAGE;
  }
};

/**
 * Change language at runtime.
 * @returns true if RTL direction changed (app reload required by the caller)
 */
export const changeLanguage = async (language: string): Promise<boolean> => {
  await AsyncStorage.setItem(STORAGE_KEYS.APP_LANGUAGE, language);
  await i18nChangeLanguage(language);

  const isRTL = language === 'ar';
  const needsRTLChange = I18nManager.isRTL !== isRTL;

  if (needsRTLChange) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    return true;
  }
  return false;
};

export default i18n;
