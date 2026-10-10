'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  SupportedLocale,
  LocaleInput,
  LocaleMeta,
  defaultLocale,
  localeMetaMap,
  normalizeLocale,
} from '@/i18n/config';
import viMessages from '@/messages/vi.json';
import enMessages from '@/messages/en.json';

type MessageRecord = Record<string, unknown>;

const messagesMap: Record<SupportedLocale, MessageRecord> = {
  vi: viMessages as MessageRecord,
  en: enMessages as MessageRecord,
};

interface I18nContextType {
  locale: SupportedLocale;
  localeMeta: LocaleMeta;
  setLocale: (locale: LocaleInput) => void;
  toggleLocale: () => void;
  isVietnamese: boolean;
  isEnglish: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'uav_locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return normalizeLocale(saved);
        }
      } catch {
        // localStorage not available
      }
    }
    return defaultLocale;
  });

  // Sync html lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((newLocaleInput: LocaleInput) => {
    const canonical = normalizeLocale(newLocaleInput);
    setLocaleState(canonical);
    try {
      localStorage.setItem(STORAGE_KEY, canonical);
    } catch {
      // localStorage not accessible
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'vi' ? 'en' : 'vi');
  }, [locale, setLocale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      let current: unknown = messagesMap[locale];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[k];
        } else {
          // Fallback to Vietnamese
          let fallback: unknown = messagesMap.vi;
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in (fallback as Record<string, unknown>)) {
              fallback = (fallback as Record<string, unknown>)[fk];
            } else {
              fallback = undefined;
              break;
            }
          }
          current = typeof fallback === 'string' ? fallback : key;
          break;
        }
      }

      if (typeof current !== 'string') {
        return key;
      }

      let result = current;
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return result;
    },
    [locale]
  );

  const value: I18nContextType = {
    locale,
    localeMeta: localeMetaMap[locale],
    setLocale,
    toggleLocale,
    isVietnamese: locale === 'vi',
    isEnglish: locale === 'en',
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
