import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import ptTranslations from './locales/pt.json';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import itTranslations from './locales/it.json';
import deTranslations from './locales/de.json';
import zhTranslations from './locales/zh.json';
import gnTranslations from './locales/gn.json';

// Supported languages configuration
export const supportedLanguages = {
  pt: { name: 'Português', flag: '🇧🇷', nativeName: 'Português' },
  en: { name: 'English', flag: '🇺🇸', nativeName: 'English' },
  es: { name: 'Español', flag: '🇪🇸', nativeName: 'Español' },
  fr: { name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  it: { name: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano' },
  de: { name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch' },
  zh: { name: '中文', flag: '🇨🇳', nativeName: '中文' },
  gn: { name: 'Guaraní', flag: '🇵🇾', nativeName: 'Avañe\'ẽ' },
};

const resources = {
  pt: { translation: ptTranslations },
  en: { translation: enTranslations },
  es: { translation: esTranslations },
  fr: { translation: frTranslations },
  it: { translation: itTranslations },
  de: { translation: deTranslations },
  zh: { translation: zhTranslations },
  gn: { translation: gnTranslations },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt', // Default language is Portuguese
    debug: false, // Disable debug to reduce console noise
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'telemed-language',
    },
    
    cleanCode: true, // Clean language codes (en-US -> en)
    
    react: {
      useSuspense: false, // Avoid suspense issues with SSR
    },
  });

export default i18n;