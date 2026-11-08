import type {TypedSetting} from '@/types/settings/platform-settings.types';
import type {Translate} from '@/types';
import {translateMessage} from '@/lib/format';

export type {TypedSetting, Translate};

const SETTING_CODE_KEYS: Record<string, string> = {
    SETTING_VALUE_REQUIRED: 'required',
    SETTING_INVALID_INTEGER: 'integer',
    SETTING_INVALID_DECIMAL: 'decimal',
    SETTING_OUT_OF_RANGE: 'range',
    SETTING_INVALID_BOOLEAN: 'boolean',
    SETTING_INVALID_CHOICE: 'choice',
    SETTING_INVALID_PHONE: 'phone',
    SETTING_INVALID_EMAIL: 'email',
    SETTING_INVALID_URL: 'url',
    SETTING_LENGTH_OUT_OF_RANGE: 'length',
    SETTING_INVALID_FORMAT: 'format',
};

/**
 * Minimal 0ms empty-required guard.
 * Type, numeric range, length, phone/email/URL and regex checks run on the backend.
 */
export function settingEmptyProblem(setting: TypedSetting, raw: string): 'required' | null {
    return !raw.trim() && !setting.emptyAllowed ? 'required' : null;
}

export function changedSettings(settings: TypedSetting[], drafts: Record<string, string>): TypedSetting[] {
    return settings.filter(s => drafts[s.configKey] !== undefined && drafts[s.configKey] !== s.configValue);
}

/** Disable billing flag first, persist hourly rate next, and enable billing flag last. */
export function sortedSettingsToSave(items: TypedSetting[], valueOf: (item: TypedSetting) => string): TypedSetting[] {
    const order = (item: TypedSetting) =>
        item.configKey === 'billing.auto_generate_invoice'
            ? (valueOf(item).trim() === 'false' ? 0 : 3)
            : item.configKey === 'billing.hourly_rate_vnd'
              ? 1
              : 2;
    return [...items].sort((a, b) => order(a) - order(b));
}

export function toSettingUpdatePayload(setting: TypedSetting, raw: string): { key: string; value: string } {
    return {key: setting.configKey, value: raw.trim()};
}

export function settingServerError(error: unknown, t?: Translate): string {
    const structured = error as { fields?: Record<string, string>; code?: string; message?: string } | null;
    const fieldMsg = structured?.fields?.configValue;
    if (fieldMsg) return fieldMsg;
    const codeKey = structured?.code ? SETTING_CODE_KEYS[structured.code] : undefined;
    if (codeKey && t) {
        const translated = t(`adminPlatform.settings.errors.${codeKey}`);
        if (!translated.startsWith('adminPlatform.')) return translated;
    }
    if (structured?.message) return structured.message;
    return translateMessage(t, 'admin.settings.checkAndRetry', 'Vui lòng kiểm tra lại giá trị cấu hình rồi thử lại.');
}

