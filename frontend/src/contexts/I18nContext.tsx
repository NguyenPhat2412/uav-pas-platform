'use client';

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState,} from 'react';
import {
  defaultLocale,
  LocaleInput,
  LocaleMeta,
  localeMetaMap,
  normalizeLocale,
  SupportedLocale,
  supportedLocales,
} from '@/i18n/config';
import viMessages from '@/messages/vi.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';

import customerVi from '@/messages/customer/vi.json';
import customerEn from '@/messages/customer/en.json';
import customerJa from '@/messages/customer/ja.json';
import {setPresentationLocale} from '@/components/shared/presentation';
import {sectionMessages} from '@/messages/sections';

type MessageRecord = Record<string, unknown>;

function deepMerge(target: MessageRecord, source: MessageRecord): MessageRecord {
    const output: MessageRecord = {...target};
    for (const key of Object.keys(source)) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            output[key] &&
            typeof output[key] === 'object' &&
            !Array.isArray(output[key])
        ) {
            output[key] = deepMerge(output[key] as MessageRecord, source[key] as MessageRecord);
        } else {
            output[key] = source[key];
        }
    }
    return output;
}

const defaultMessagesMap: Record<SupportedLocale, MessageRecord> = {
    vi: {...viMessages as MessageRecord, ...sectionMessages.vi},
    en: {...enMessages as MessageRecord, ...sectionMessages.en},
    ja: {...jaMessages as MessageRecord, ...sectionMessages.ja},
};

const customerMessagesMap: Record<SupportedLocale, MessageRecord> = {
    vi: deepMerge(defaultMessagesMap.vi, customerVi as MessageRecord),
    en: deepMerge(defaultMessagesMap.en, customerEn as MessageRecord),
    ja: deepMerge(defaultMessagesMap.ja, customerJa as MessageRecord),
};

interface I18nContextType {
    locale: SupportedLocale;
    localeMeta: LocaleMeta;
    setLocale: (locale: LocaleInput) => void;
    toggleLocale: () => void;
    isVietnamese: boolean;
    isEnglish: boolean;
    isJapanese: boolean;
    t: (key: string, params?: Record<string, string | number>) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'uav_locale';
const LEGACY_STORAGE_KEY = 'uav_customer_locale';

export function I18nProvider({children, area = 'operations'}: {
    children: ReactNode;
    area?: 'customer' | 'operations' | 'admin'
}) {
    const activeCatalog = area === 'customer' ? customerMessagesMap : defaultMessagesMap;

    // SSR-safe initialization: start with defaultLocale on server and client initial render
    const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

    // Synchronize saved locale from localStorage/query param after hydration
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const queryLang = params.get('lang') || params.get('locale');
            if (queryLang) {
                const normalized = normalizeLocale(queryLang);
                setLocaleState(normalized);
                localStorage.setItem(STORAGE_KEY, normalized);
                localStorage.setItem(LEGACY_STORAGE_KEY, normalized);
                return;
            }
            const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
            if (saved) {
                const normalized = normalizeLocale(saved);
                setLocaleState(normalized);
                localStorage.setItem(STORAGE_KEY, normalized);
            }
        } catch {
            // localStorage not available
        }
    }, []);

    // Plain label helpers read this during the same render pass, so it must be set before children render.
    setPresentationLocale(locale);

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
            localStorage.setItem(LEGACY_STORAGE_KEY, canonical);
        } catch {
            // localStorage not accessible
        }
    }, []);

    const toggleLocale = useCallback(() => {
        const nextIndex = (supportedLocales.indexOf(locale) + 1) % supportedLocales.length;
        setLocale(supportedLocales[nextIndex]);
    }, [locale, setLocale]);

    const t = useCallback(
        (key: string, params?: Record<string, string | number>): string => {
            const keys = key.split('.');

            const lookup = (catalog: MessageRecord | undefined): unknown => {
                if (!catalog) return undefined;
                let current: unknown = catalog;
                for (const k of keys) {
                    if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
                        current = (current as Record<string, unknown>)[k];
                    } else {
                        return undefined;
                    }
                }
                return current;
            };

            // 1. Look up in active catalog with current locale
            let val = lookup(activeCatalog[locale]);

            // 2. Fallback to Vietnamese in active catalog
            if (typeof val !== 'string') {
                val = lookup(activeCatalog.vi);
            }

            // 3. Cascade fallback to root catalog if in customer area
            if (typeof val !== 'string' && area === 'customer') {
                val = lookup(defaultMessagesMap[locale]) ?? lookup(defaultMessagesMap.vi);
            }

            // 4. Return raw key if not resolved
            if (typeof val !== 'string') {
                return key;
            }

            let result = val;
            if (params) {
                for (const [paramKey, paramVal] of Object.entries(params)) {
                    const escaped = paramKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    result = result.replace(new RegExp(`\\{${escaped}\\}`, 'g'), String(paramVal));
                }
            }

            return result;
        },
        [locale, activeCatalog, area]
    );

    const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
        try {
            return new Intl.NumberFormat(locale, options).format(value);
        } catch {
            return String(value);
        }
    }, [locale]);

    const formatDate = useCallback((date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
        try {
            const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
            return new Intl.DateTimeFormat(locale, options ?? { dateStyle: 'medium', timeStyle: 'short' }).format(d);
        } catch {
            return String(date);
        }
    }, [locale]);

    const formatCurrency = useCallback((amount: number, currency = 'VND'): string => {
        try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
        } catch {
            return `${amount} ${currency}`;
        }
    }, [locale]);

    const value: I18nContextType = {
        locale,
        localeMeta: localeMetaMap[locale],
        setLocale,
        toggleLocale,
        isVietnamese: locale === 'vi',
        isEnglish: locale === 'en',
        isJapanese: locale === 'ja',
        t,
        formatNumber,
        formatDate,
        formatCurrency,
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
