import {API_ROUTES, apiClient} from '@/lib/api';
import type {PageResponse} from '@/types/admin';
import type {NotificationRecord, SendNotificationInput} from '@/features/notifications/types/notification.types';

export const notificationsService = {
    page: (page: number, size: number, signal?: AbortSignal) =>
        apiClient.get<PageResponse<NotificationRecord>>(`${API_ROUTES.notifications.list}?page=${page}&size=${size}`, {signal}),
    markRead: (id: number) => apiClient.patch<NotificationRecord>(API_ROUTES.notifications.markRead(String(id))),
    markAllRead: () => apiClient.post(API_ROUTES.notifications.markAllRead),
    send: (input: SendNotificationInput) => apiClient.post<NotificationRecord>(API_ROUTES.notifications.list, input),
};
