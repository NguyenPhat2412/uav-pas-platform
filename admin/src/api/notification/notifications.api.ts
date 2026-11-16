import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {buildQueryString} from '@/lib/format';
import type {PageResponse} from '@/types';
import type {
    NotificationModuleCode,
    NotificationModulePolicy,
    NotificationRecord,
    NotificationResponse,
    SendNotificationInput,
    UpdateNotificationModulePolicyInput,
    UpdateUserNotificationPreferenceInput,
    UserNotificationModulePreference,
} from '@/types/notification/notification.types';

export const notificationsService = {
    page: (page: number, size: number, signal?: AbortSignal) =>
        apiClient.get<PageResponse<NotificationRecord>>(
            `${API_ROUTES.notifications.list}?${buildQueryString({page, size})}`,
            {signal},
        ),
    recent: (size = 50, signal?: AbortSignal) =>
        apiClient.get<{ content: NotificationResponse[] }>(
            `${API_ROUTES.notifications.list}?${buildQueryString({size})}`,
            {signal},
        ),
    unreadCount: (signal?: AbortSignal) =>
        apiClient.get<{ unreadCount: number }>(API_ROUTES.notifications.unreadCount, {signal}),
    markRead: (id: number | string) =>
        apiClient.patch<NotificationRecord>(API_ROUTES.notifications.markRead(id)),
    markAllRead: () => apiClient.post(API_ROUTES.notifications.markAllRead),
    send: (input: SendNotificationInput) =>
        apiClient.post<NotificationRecord>(API_ROUTES.notifications.list, input),
    listModules: (signal?: AbortSignal) =>
        apiClient.get<NotificationModulePolicy[]>(API_ROUTES.notifications.modules, {signal}),
    updateModule: (
        moduleCode: NotificationModuleCode,
        input: UpdateNotificationModulePolicyInput,
    ) =>
        apiClient.put<NotificationModulePolicy>(
            API_ROUTES.notifications.moduleByCode(moduleCode),
            input,
        ),
    testModule: (moduleCode: NotificationModuleCode) =>
        apiClient.post<NotificationRecord>(API_ROUTES.notifications.moduleTest(moduleCode)),
    listPreferences: (signal?: AbortSignal) =>
        apiClient.get<UserNotificationModulePreference[]>(
            API_ROUTES.notifications.preferences,
            {signal},
        ),
    updatePreference: (
        moduleCode: NotificationModuleCode,
        input: UpdateUserNotificationPreferenceInput,
    ) =>
        apiClient.put<UserNotificationModulePreference>(
            API_ROUTES.notifications.preferenceByModule(moduleCode),
            input,
        ),
};
