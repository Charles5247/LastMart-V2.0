/**
 * ─── i18n (Internationalization) Configuration ────────────────────────────────
 * Supported languages: English, Yoruba, Hausa, Igbo
 *
 * Usage in components:
 *   import { useTranslation } from 'react-i18next';
 *   const { t, i18n } = useTranslation();
 *   t('nav.home')          // → "Home" / "Ilé" / "Gida" / "Ụlọ"
 *   i18n.changeLanguage('yo') // switch to Yoruba
 * ─────────────────────────────────────────────────────────────────────────────
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import yo from '../locales/yo.json';
import ha from '../locales/ha.json';
import ig from '../locales/ig.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',  flag: '🇬🇧', nativeName: 'English' },
  { code: 'yo', name: 'Yoruba',   flag: '🇳🇬', nativeName: 'Yorùbá'  },
  { code: 'ha', name: 'Hausa',    flag: '🇳🇬', nativeName: 'Hausa'   },
  { code: 'ig', name: 'Igbo',     flag: '🇳🇬', nativeName: 'Igbo'    },
];

const isClient = typeof window !== 'undefined';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      resources: {
        en: { translation: en },
        yo: { translation: yo },
        ha: { translation: ha },
        ig: { translation: ig },
      },
      fallbackLng: 'en',
      supportedLngs: ['en', 'yo', 'ha', 'ig'],
      interpolation: { escapeValue: false },
      detection: isClient ? {
        order:           ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'lastmart_language',
        caches:          ['localStorage'],
      } : {},
      /* SSR: default to English on server */
      lng: isClient ? undefined : 'en',
    });
}

export default i18n;

/* Convenience: change language and persist to localStorage */
export function setLanguage(code: string): void {
  i18n.changeLanguage(code);
  if (isClient) localStorage.setItem('lastmart_language', code);
}

/* Get current language code */
export function getCurrentLanguage(): string {
  return i18n.language?.slice(0, 2) || 'en';
}
