import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {
    PublicSiteInfo,
    SettingHistoryEntry,
    TypedSetting,
} from '@/shared/types/settings/platform-settings.types';

export const mobileSettingsService = {
    publicSiteInfo: async (signal?: AbortSignal): Promise<PublicSiteInfo | null> => {
        try {
            return await apiClient.get<PublicSiteInfo>(API_ROUTES.public.siteInfo, {signal});
        } catch {
            return null;
        }
    },
    listSettings: (signal?: AbortSignal) =>
        apiClient.get<TypedSetting[]>(API_ROUTES.settings.list, {signal}),
    updateSetting: (key: string, configValue: string) =>
        apiClient.put<TypedSetting>(API_ROUTES.settings.byKey(key), {configValue}),
    settingHistory: (key: string, signal?: AbortSignal) =>
        apiClient.get<SettingHistoryEntry[]>(`${API_ROUTES.settings.history(key)}?limit=25`, {
            signal,
        }),
};
