import {apiClient, API_ROUTES} from '@/lib/api';

/** Returned only by rotate-secret; the plain secret is never retrievable again. */
export interface WebhookSecretRotation {
    subscriptionId: number;
    secretKey: string;
    maskedSecret: string;
    rotatedAt: string;
}

export const webhooksAdminService = {
    retryDelivery: (id: number) => apiClient.post<unknown>(API_ROUTES.webhooks.retryDelivery(id)),
    rotateSecret: (id: number) =>
        apiClient.post<WebhookSecretRotation>(API_ROUTES.webhooks.rotateSecret(id)),
};
