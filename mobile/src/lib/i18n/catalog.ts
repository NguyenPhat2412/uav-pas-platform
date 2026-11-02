import type {SupportedLocale} from '@/shared/i18n/config';
import type {MessageRecord} from '@/shared/types';
import viRoot from '@/shared/messages/vi.json';
import enRoot from '@/shared/messages/en.json';
import jaRoot from '@/shared/messages/ja.json';
import viCustomerPro from '@/shared/messages/sections/customerPro/vi.json';
import enCustomerPro from '@/shared/messages/sections/customerPro/en.json';
import jaCustomerPro from '@/shared/messages/sections/customerPro/ja.json';
import viAdmin from '@/shared/messages/sections/admin/vi.json';
import enAdmin from '@/shared/messages/sections/admin/en.json';
import jaAdmin from '@/shared/messages/sections/admin/ja.json';
import viCustomer from '@/shared/messages/customer/vi.json';
import enCustomer from '@/shared/messages/customer/en.json';
import jaCustomer from '@/shared/messages/customer/ja.json';
import viMobile from '@/messages/vi.json';
import enMobile from '@/messages/en.json';
import jaMobile from '@/messages/ja.json';

/** Same deep merge as the web I18nProvider: nested sections combine, leaves of the later catalog win. */
export function deepMerge(target: MessageRecord, source: MessageRecord): MessageRecord {
    const output: MessageRecord = {...target};
    for (const key of Object.keys(source)) {
        const next = source[key];
        const current = output[key];
        output[key] = next && typeof next === 'object' && !Array.isArray(next) && current && typeof current === 'object' && !Array.isArray(current)
            ? deepMerge(current as MessageRecord, next as MessageRecord)
            : next;
    }
    return output;
}

// The web customer portal's catalog (root + sections, customer overrides), then the app's own `mobile.*` keys.
// The admin section is included because the assistant's texts (admin.assistant.*) live there on the web too.
const build = (root: unknown, sections: unknown[], customer: unknown, mobile: unknown) =>
    deepMerge(deepMerge(Object.assign({}, root, ...sections) as MessageRecord, customer as MessageRecord), mobile as MessageRecord);

export const catalogs: Record<SupportedLocale, MessageRecord> = {
    vi: build(viRoot, [viAdmin, viCustomerPro], viCustomer, viMobile),
    en: build(enRoot, [enAdmin, enCustomerPro], enCustomer, enMobile),
    ja: build(jaRoot, [jaAdmin, jaCustomerPro], jaCustomer, jaMobile),
};

function lookup(catalog: MessageRecord, key: string): unknown {
    let current: unknown = catalog;
    for (const part of key.split('.')) {
        if (!current || typeof current !== 'object' || !(part in (current as Record<string, unknown>))) return undefined;
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

/** The text for key in locale (falling back to Vietnamese, then the key itself), with {param} placeholders filled. */
export function translate(locale: SupportedLocale, key: string, params?: Record<string, string | number>): string {
    let value = lookup(catalogs[locale], key);
    if (typeof value !== 'string') value = lookup(catalogs.vi, key);
    if (typeof value !== 'string') return key;
    let result = value;
    if (params) for (const [name, param] of Object.entries(params)) result = result.split(`{${name}}`).join(String(param));
    return result;
}
