import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {
    NotificationModuleCode,
    NotificationModulePolicy,
    NotificationRecord,
    UpdateNotificationModulePolicyInput,
    UpdateUserNotificationPreferenceInput,
    UserNotificationModulePreference,
} from '@/shared/types/notification/notification.types';

export interface PushEndpointPayload {
    token: string;
    platform: 'IOS' | 'ANDROID';
    deviceName?: string;
    appVersion?: string;
}

export interface PushDeviceRecord {
    id: number;
    userId: number;
    token: string;
    platform: 'IOS' | 'ANDROID' | 'WEB';
    deviceName?: string | null;
    active: boolean;
    lastSeenAt?: string | null;
}

export const notificationsService = {
    recent: (size = 50, signal?: AbortSignal) =>
        apiClient.get<{ content: NotificationRecord[] }>(`${API_ROUTES.notifications.list}?${buildQueryString({size})}`, {signal}),
    unreadCount: (signal?: AbortSignal) => apiClient.get<{ unreadCount: number }>(API_ROUTES.notifications.unreadCount, {signal}),
    markRead: (id: number | string) => apiClient.patch(API_ROUTES.notifications.markRead(id)),
    markAllRead: () => apiClient.post(API_ROUTES.notifications.markAllRead),
    registerPushEndpoint: (payload: PushEndpointPayload) => {
        const deviceLabel = [payload.deviceName?.trim(), payload.appVersion ? `v${payload.appVersion.trim()}` : '']
            .filter(Boolean)
            .join(' · ')
            .slice(0, 120);
        return apiClient.post<PushDeviceRecord>(API_ROUTES.notifications.pushTokens, {
            token: payload.token.trim(),
            platform: payload.platform,
            ...(deviceLabel ? {deviceName: deviceLabel} : {}),
        });
    },
    unregisterPushEndpoint: (token: string) =>
        apiClient.delete(`${API_ROUTES.notifications.pushTokens}?${buildQueryString({token: token.trim()})}`),
    listModules: (signal?: AbortSignal) =>
        apiClient.get<NotificationModulePolicy[]>(API_ROUTES.notifications.modules, {signal}),
    updateModule: (moduleCode: NotificationModuleCode, input: UpdateNotificationModulePolicyInput) =>
        apiClient.put<NotificationModulePolicy>(API_ROUTES.notifications.moduleByCode(moduleCode), input),
    testModule: (moduleCode: NotificationModuleCode) =>
        apiClient.post<NotificationRecord>(API_ROUTES.notifications.moduleTest(moduleCode)),
    listPreferences: (signal?: AbortSignal) =>
        apiClient.get<UserNotificationModulePreference[]>(API_ROUTES.notifications.preferences, {signal}),
    updatePreference: (moduleCode: NotificationModuleCode, input: UpdateUserNotificationPreferenceInput) =>
        apiClient.put<UserNotificationModulePreference>(API_ROUTES.notifications.preferenceByModule(moduleCode), input),
};
