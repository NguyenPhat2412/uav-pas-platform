'use client';
import { LanguageSelect } from '@uav/ui';
import { useI18n } from '@/contexts/I18nContext';
import { supportedLocales, localeMetaMap } from '@/i18n/config';
export interface LanguageSwitcherProps { variant?: 'pill' | 'dropdown' | 'compact'; className?: string; }
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  return <LanguageSelect value={locale} onChange={setLocale} className={className} options={supportedLocales.map(value => ({ value, label: localeMetaMap[value].nativeName }))} />;
}
