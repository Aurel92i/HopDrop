// mobile/src/i18n/i18nContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import { fr } from './translations/fr';
import { en } from './translations/en';
import { es } from './translations/es';
import { ar } from './translations/ar';
import { pt } from './translations/pt';

export type Language = 'fr' | 'en' | 'es' | 'ar' | 'pt';

export const languageLabels: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  pt: 'Português',
};

const translations: Record<Language, typeof fr> = { fr, en, es, ar, pt };

interface I18nContextType {
  t: (key: string) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  t: (key: string) => key,
  language: 'fr',
  setLanguage: () => {},
  isRTL: false,
});

const STORAGE_KEY = 'hopdrop_language';

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && stored in translations) {
        setLanguageState(stored as Language);
      }
    });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    const isRTL = lang === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  };

  const t = (key: string): string => {
    const value = getNestedValue(translations[language], key);
    if (value !== undefined) return value;
    // Fallback to French
    const fallback = getNestedValue(translations.fr, key);
    if (fallback !== undefined) return fallback;
    return key;
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage, isRTL: language === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
