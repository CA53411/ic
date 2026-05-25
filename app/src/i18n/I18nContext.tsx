/**
 * I18nContext.tsx — Global Internationalization
 * 4 languages: en (default), zh, ja, ko
 * Persists preference to localStorage + profiles table
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, type Language } from './translations';

const I18nContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}>({ lang: 'en', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const stored = localStorage.getItem('language') as Language | null;
    return stored && translations[stored] ? stored : 'en';
  });

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem('language', l);
    document.documentElement.lang = l;
  }, []);

  // Sync language across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'language' && e.newValue && translations[e.newValue as Language]) {
        setLangState(e.newValue as Language);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[lang][key] ?? translations['en'][key] ?? key;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
