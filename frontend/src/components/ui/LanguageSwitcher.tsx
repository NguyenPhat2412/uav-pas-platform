'use client';
import {LanguageSelect} from "@/components/shared";
import {useI18n} from '@/contexts/I18nContext';
import {LocaleFlag} from '@/components/shared/LocaleFlag';
import {localeMetaMap, supportedLocales} from '@/i18n/config';

export interface LanguageSwitcherProps {
    variant?: 'pill' | 'dropdown' | 'compact';
    className?: string;
}

export function LanguageSwitcher({className}: LanguageSwitcherProps) {
    const {locale, setLocale} = useI18n();
    return <LanguageSelect value={locale} onChange={setLocale} className={className}
                           options={supportedLocales.map(value => ({
                               value,
                               label: localeMetaMap[value].nativeName,
                               flag: <LocaleFlag code={value}/>
                           }))}/>;
}
