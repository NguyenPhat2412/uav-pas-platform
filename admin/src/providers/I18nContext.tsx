'use client';

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState, useSyncExternalStore} from 'react';
import {fetchPublicLocaleBundle, switchPublicLocale} from '@/api/i18n.api';
import {useBrowserStorage, writeBrowserStorage} from '@/hooks/useBrowserStorage';
import {
  defaultLocale,
  LocaleInput,
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
import {setPresentationLocale} from '@/lib/presentation';
import {sectionMessages} from '@/messages/sections';
import type {I18nContextType, MessageRecord} from '@/types';

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

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'uav_locale';
const LEGACY_STORAGE_KEY = 'uav_customer_locale';
export const I18N_UPDATED_EVENT = 'uav:i18n-updated';

const STALE_REMOTE_VALUE_RE = new RegExp(
    [
        '\\b' + '3' + 'P\\b',
        '\\b' + 'R' + 'FQ\\b',
        'đấu\\s+' + 'thầu',
        'chào\\s+' + 'giá',
        'VietQR\\s+' + 'EMVCo',
        'GNSS\\s+(?:' + 'FIXED|FLOAT)',
    ].join('|'),
    'i',
);
const BUNDLED_PRIORITY_NAV_KEYS = new Set([
    'adminNavSubGroups.marketplace3p',
    'adminNav.marketplaceStats',
    'adminNav.marketplaceProviders',
    'adminNav.marketplaceListings',
    'adminNav.marketplaceDispatch',
    'adminNav.marketplaceOrders',
    'adminNav.marketplaceProjects',
    'adminNav.billingPayouts',
    'adminPlatform.settings.labels.marketplace_rfq_enabled',
]);

// Shared in-memory cache of PostgreSQL bundles fetched from /api/v1/public/i18n/{locale}
const cachedRemoteBundles: Partial<Record<SupportedLocale, MessageRecord>> = {};

export function notifyI18nCatalogUpdated() {
    for (const key of Object.keys(cachedRemoteBundles) as SupportedLocale[]) {
        delete cachedRemoteBundles[key];
    }
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent(I18N_UPDATED_EVENT));
    }
}

/** The URL does not change under the provider without a reload, so its read needs no subscription. */
const noSubscribe = () => () => {};

function readQueryLocale(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('lang') || params.get('locale');
}

export function I18nProvider({children, area = 'operations'}: {
    children: ReactNode;
    area?: 'customer' | 'operations' | 'admin'
}) {
    const activeCatalog = area === 'customer' ? customerMessagesMap : defaultMessagesMap;

    const queryLocale = useSyncExternalStore(noSubscribe, readQueryLocale, () => null);
    const savedLocale = useBrowserStorage(STORAGE_KEY);
    const legacyLocale = useBrowserStorage(LEGACY_STORAGE_KEY);
    const [chosenLocale, setChosenLocale] = useState<SupportedLocale | null>(null);
    const [remoteBundles, setRemoteBundles] = useState<Partial<Record<SupportedLocale, MessageRecord>>>(
        () => ({...cachedRemoteBundles}),
    );

    const fromBrowser = queryLocale ?? savedLocale ?? legacyLocale;
    const locale: SupportedLocale = chosenLocale ?? (fromBrowser ? normalizeLocale(fromBrowser) : defaultLocale);

    useEffect(() => {
        if (queryLocale) {
            const normalized = normalizeLocale(queryLocale);
            writeBrowserStorage(STORAGE_KEY, normalized);
            writeBrowserStorage(LEGACY_STORAGE_KEY, normalized);
        } else if (!savedLocale && legacyLocale) {
            writeBrowserStorage(STORAGE_KEY, normalizeLocale(legacyLocale));
        }
    }, [queryLocale, savedLocale, legacyLocale]);

    // Fetch PostgreSQL-backed translations for the active locale via REST API.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const controller = new AbortController();
        let active = true;

        const syncLocale = (force = false) => {
            if (!force && cachedRemoteBundles[locale]) {
                setRemoteBundles(prev => (prev[locale] === cachedRemoteBundles[locale] ? prev : {...prev, [locale]: cachedRemoteBundles[locale]}));
                return;
            }
            void fetchPublicLocaleBundle(locale, controller.signal).then(res => {
                if (!active || !res?.messages) return;
                cachedRemoteBundles[locale] = res.messages;
                setRemoteBundles(prev => ({...prev, [locale]: res.messages}));
            });
        };

        syncLocale();
        const onUpdated = () => syncLocale(true);
        window.addEventListener(I18N_UPDATED_EVENT, onUpdated);
        return () => {
            active = false;
            controller.abort();
            window.removeEventListener(I18N_UPDATED_EVENT, onUpdated);
        };
    }, [locale]);

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
        setChosenLocale(canonical);
        writeBrowserStorage(STORAGE_KEY, canonical);
        writeBrowserStorage(LEGACY_STORAGE_KEY, canonical);
        if (typeof window !== 'undefined') {
            void switchPublicLocale(canonical).then(res => {
                if (!res?.messages) return;
                cachedRemoteBundles[canonical] = res.messages;
                setRemoteBundles(prev => ({...prev, [canonical]: res.messages}));
            });
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

            // 1. PostgreSQL live bundle via /api/v1/public/i18n/{locale}
            //    Skip stale DB values that still contain retired partner-tier/bidding labels or outdated long nav names.
            const remoteVal = BUNDLED_PRIORITY_NAV_KEYS.has(key) ? undefined : lookup(remoteBundles[locale]);
            let val: unknown =
                typeof remoteVal === 'string' && !STALE_REMOTE_VALUE_RE.test(remoteVal) ? remoteVal : undefined;

            // 2. Bundled catalog for current locale (SSR & offline resilience)
            if (typeof val !== 'string') {
                val = lookup(activeCatalog[locale]);
            }

            // 3. Fallback to Vietnamese (DB first unless stale, then bundled)
            if (typeof val !== 'string') {
                const remoteVi = BUNDLED_PRIORITY_NAV_KEYS.has(key) ? undefined : lookup(remoteBundles.vi);
                val =
                    (typeof remoteVi === 'string' && !STALE_REMOTE_VALUE_RE.test(remoteVi) ? remoteVi : undefined) ??
                    lookup(activeCatalog.vi);
            }

            // 4. Cascade fallback to root catalog if in customer area
            if (typeof val !== 'string' && area === 'customer') {
                val = lookup(defaultMessagesMap[locale]) ?? lookup(defaultMessagesMap.vi);
            }

            // 5. Return raw key if not resolved
            if (typeof val !== 'string') {
                return key;
            }

            let result = val;
            if (params) {
                for (const [paramKey, paramVal] of Object.entries(params)) {
                    const escaped = paramKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    result = result
                        .replace(new RegExp(`\\{\\{${escaped}\\}\\}`, 'g'), String(paramVal))
                        .replace(new RegExp(`\\{${escaped}\\}`, 'g'), String(paramVal));
                }
            }

            return result;
        },
        [locale, remoteBundles, activeCatalog, area]
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
