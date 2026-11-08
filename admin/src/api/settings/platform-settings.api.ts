import {apiClient, API_ROUTES} from '@/lib/api';
import type {TypedSetting, SettingHistoryEntry, PublicSiteInfo} from '@/types/settings/platform-settings.types';

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
