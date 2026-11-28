import {apiClient, API_ROUTES} from '@/lib/api';
import type {WebhookDeliveryLogItem, WebhookEndpointItem} from '@/types/admin';

export const webhooksService = {
    webhooks: (signal?: AbortSignal) => apiClient.get<WebhookEndpointItem[]>(API_ROUTES.webhooks.list, {signal}),
    webhookLogs: async (signal?: AbortSignal) =>
        (await apiClient.get<{ content: WebhookDeliveryLogItem[] }>(API_ROUTES.webhooks.logs, {signal})).content,
    webhookStatus: (signal?: AbortSignal) => apiClient.get<{ status: string }>(API_ROUTES.webhooks.status, {signal}),
    triggerWebhookTest: () =>
        apiClient.post<{ status: string; message: string }>(API_ROUTES.webhooks.test, {eventType: 'WEBHOOK_TEST'}),
    createWebhook: (data: { name: string; targetUrl: string; secretKey: string; eventsSubscribed: string }) =>
        apiClient.post<WebhookEndpointItem>(API_ROUTES.webhooks.list, data),
    toggleWebhook: (id: number, active: boolean) =>
        apiClient.put<void>(API_ROUTES.webhooks.toggle(id, active)),
    deleteWebhook: (id: number) => apiClient.delete<void>(API_ROUTES.webhooks.detail(id)),
};
