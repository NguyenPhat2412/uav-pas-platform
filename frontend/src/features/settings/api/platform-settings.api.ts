import {apiClient, API_ROUTES} from '@/lib/api';

export type SettingValueType = 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'ENUM' | 'PHONE' | 'EMAIL' | 'URL';

/** GET /api/v1/settings item, with the validation rule the server applies on save. */
export interface TypedSetting {
    id?: number;
    configKey: string;
    configValue: string;
    category: string;
    description?: string | null;
    updatedAt?: string | null;
    updatedBy?: string | null;
    valueType: SettingValueType;
    /** Numeric bounds for INTEGER/DECIMAL; length bounds for STRING. */
    minValue?: number | null;
    maxValue?: number | null;
    allowedValues: string[];
    valuePattern?: string | null;
    isPublic: boolean;
    /** Blank is accepted (billing: env fallback; contact: hidden). */
    emptyAllowed: boolean;
}

export interface SettingHistoryEntry {
    id: number;
    configKey: string;
    oldValue: string | null;
    newValue: string;
    changedBy: string | null;
    changedAt: string;
}

/** GET /api/v1/public/site-info — public settings only, blank values omitted. */
export interface PublicSiteInfo {
    dispatchHotline?: string | null;
    email?: string | null;
    address?: string | null;
    settings: Record<string, string>;
}

export const platformSettingsService = {
    list: (signal?: AbortSignal) => apiClient.get<TypedSetting[]>(API_ROUTES.settings.list, {signal}),
    update: (key: string, configValue: string) =>
        apiClient.put<TypedSetting>(API_ROUTES.settings.byKey(key), {configValue}),
    history: (key: string, signal?: AbortSignal) =>
        apiClient.get<SettingHistoryEntry[]>(`${API_ROUTES.settings.history(key)}?limit=50`, {signal}),
};

/** Public endpoint; failures resolve to null so callers fall back to env values. */
export async function fetchPublicSiteInfo(signal?: AbortSignal): Promise<PublicSiteInfo | null> {
    try {
        return await apiClient.get<PublicSiteInfo>(API_ROUTES.public.siteInfo, {signal});
    } catch {
        return null;
    }
}
