import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {NotificationRecord} from '@/shared/types/notification/notification.types';

export const notificationsService = {
    recent: (size = 50, signal?: AbortSignal) =>
        apiClient.get<{ content: NotificationRecord[] }>(`${API_ROUTES.notifications.list}?${buildQueryString({size})}`, {signal}),
    unreadCount: (signal?: AbortSignal) => apiClient.get<{ unreadCount: number }>(API_ROUTES.notifications.unreadCount, {signal}),
    markRead: (id: number | string) => apiClient.patch(API_ROUTES.notifications.markRead(id)),
    markAllRead: () => apiClient.post(API_ROUTES.notifications.markAllRead),
};
