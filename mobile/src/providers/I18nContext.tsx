import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getLocales} from 'expo-localization';
import {fetchMobileLocaleBundle, switchMobileLocale} from '@/api/i18n/i18n.api';
import {normalizeLocale, supportedLocales, type SupportedLocale} from '@/shared/i18n/config';
import {setPresentationLocale} from '@/shared/lib/presentation';
import {readSavedLocale, saveLocale} from '@/lib/storage/preferences';
import {setRemoteCatalog, translate} from '@/lib/i18n/catalog';

interface I18nValue {
    locale: SupportedLocale;
    setLocale: (locale: SupportedLocale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
}

const shared = globalThis as { __uavI18nContext?: React.Context<I18nValue | undefined> };
const I18nContext = (shared.__uavI18nContext ??= createContext<I18nValue | undefined>(undefined));

function deviceLocale(): SupportedLocale {
    const code = getLocales()[0]?.languageCode;
    return code && (supportedLocales as string[]).includes(code) ? code as SupportedLocale : 'vi';
}

export function I18nProvider({children}: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<SupportedLocale>(deviceLocale);
    const [remoteVersion, setRemoteVersion] = useState(0);

    useEffect(() => {
        let active = true;
        void readSavedLocale().then(saved => {
            if (active && saved) setLocaleState(normalizeLocale(saved));
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        void fetchMobileLocaleBundle(locale, controller.signal).then(res => {
            if (!active || !res?.messages) return;
            setRemoteCatalog(locale, res.messages);
            setRemoteVersion(v => v + 1);
        });
        return () => {
            active = false;
            controller.abort();
        };
    }, [locale]);

    setPresentationLocale(locale);

    const setLocale = useCallback((next: SupportedLocale) => {
        setLocaleState(next);
        void saveLocale(next);
        void switchMobileLocale(next).then(res => {
            if (!res?.messages) return;
            setRemoteCatalog(next, res.messages);
            setRemoteVersion(v => v + 1);
        });
    }, []);

    const value = useMemo<I18nValue>(() => {
        void remoteVersion;
        return {
            locale,
            setLocale,
            t: (key, params) => translate(locale, key, params),
            formatDate: (value, options) => {
                try {
                    return new Intl.DateTimeFormat(locale, options ?? {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value));
                } catch {
                    return String(value);
                }
            },
            formatNumber: (value, options) => {
                try {
                    return new Intl.NumberFormat(locale, options).format(value);
                } catch {
                    return String(value);
                }
            },
            formatCurrency: (amount, currency = 'VND') => {
                try {
                    return new Intl.NumberFormat(locale, {style: 'currency', currency, maximumFractionDigits: 0}).format(amount);
                } catch {
                    return `${amount} ${currency}`;
                }
            },
        };
    }, [locale, remoteVersion, setLocale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used within an I18nProvider');
    return context;
}

export function useTranslateOutsideProvider(): I18nValue['t'] {
    const context = useContext(I18nContext);
    return context?.t ?? ((key, params) => translate(deviceLocale(), key, params));
}
