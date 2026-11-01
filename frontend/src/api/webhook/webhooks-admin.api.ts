import {apiClient, API_ROUTES} from '@/lib/api';
import type {WebhookSecretRotation} from '@/types/webhook/webhook-admin.types';

export const webhooksAdminService = {
    retryDelivery: (id: number) => apiClient.post<unknown>(API_ROUTES.webhooks.retryDelivery(id)),
    rotateSecret: (id: number) =>
        apiClient.post<WebhookSecretRotation>(API_ROUTES.webhooks.rotateSecret(id)),
};
