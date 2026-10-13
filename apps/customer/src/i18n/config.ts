export type SupportedLocale = 'vi' | 'en' | 'ja';
export type LocaleInput = SupportedLocale | 'vn' | 'nv' | 'jp';

export const defaultLocale: SupportedLocale = 'vi';

export const supportedLocales: SupportedLocale[] = ['vi', 'en', 'ja'];

export interface LocaleMeta {
  code: SupportedLocale;
  displayCode: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const localeMetaMap: Record<SupportedLocale, LocaleMeta> = {
  vi: {
    code: 'vi',
    displayCode: 'VN',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
  },
  en: {
    code: 'en',
    displayCode: 'EN',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  ja: {
    code: 'ja',
    displayCode: 'JP',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
  },
};

/**
 * Normalizes input locale string to canonical SupportedLocale
 */
export function normalizeLocale(input?: string | null): SupportedLocale {
  if (!input) return defaultLocale;
  const lower = input.toLowerCase().trim();
  if (lower === 'en' || lower.startsWith('en-')) {
    return 'en';
  }
  if (lower === 'ja' || lower === 'jp' || lower.startsWith('ja-')) {
    return 'ja';
  }
  if (lower === 'vi' || lower === 'vn' || lower === 'nv' || lower.startsWith('vi-')) {
    return 'vi';
  }
  return defaultLocale;
}
