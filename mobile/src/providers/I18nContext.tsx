import React, {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {getLocales} from 'expo-localization';
import {normalizeLocale, supportedLocales, type SupportedLocale} from '@/shared/i18n/config';
import {setPresentationLocale} from '@/shared/lib/presentation';
import {readSavedLocale, saveLocale} from '@/lib/storage/preferences';
import {translate} from '@/lib/i18n/catalog';

interface I18nValue {
    locale: SupportedLocale;
    setLocale: (locale: SupportedLocale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
    formatCurrency: (amount: number, currency?: string) => string;
}

const I18nContext = createContext<I18nValue | undefined>(undefined);

function deviceLocale(): SupportedLocale {
    const code = getLocales()[0]?.languageCode;
    return code && (supportedLocales as string[]).includes(code) ? code as SupportedLocale : 'vi';
}

export function I18nProvider({children}: { children: ReactNode }) {
    // The phone's language until a saved choice loads; a choice made in the app wins from then on.
    const [locale, setLocaleState] = useState<SupportedLocale>(deviceLocale);

    useEffect(() => {
        let active = true;
        void readSavedLocale().then(saved => {
            if (active && saved) setLocaleState(normalizeLocale(saved));
        });
        return () => {
            active = false;
        };
    }, []);

    // Label helpers shared with the web (lib/presentation) and API error wording read this during render.
    setPresentationLocale(locale);

    const setLocale = useCallback((next: SupportedLocale) => {
        setLocaleState(next);
        void saveLocale(next);
    }, []);

    const value = useMemo<I18nValue>(() => ({
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
    }), [locale, setLocale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
    const context = useContext(I18nContext);
    if (!context) throw new Error('useI18n must be used within an I18nProvider');
    return context;
}

/**
 * Translation for the root error screen, which expo-router draws outside every provider: the provider's `t` when it
 * is there, else the device language read straight from the catalog.
 */
export function useTranslateOutsideProvider(): I18nValue['t'] {
    const context = useContext(I18nContext);
    return context?.t ?? ((key, params) => translate(deviceLocale(), key, params));
}
