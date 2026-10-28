import {apiClient} from '@/lib/api';

/** Returned only by rotate-secret; the plain secret is never retrievable again. */
export interface WebhookSecretRotation {
    subscriptionId: number;
    secretKey: string;
    maskedSecret: string;
    rotatedAt: string;
}

export const webhookAdminApi = {
    retryDelivery: (id: number) => apiClient.post<unknown>(`/api/v1/webhooks/deliveries/${id}/retry`),
    rotateSecret: (id: number) =>
        apiClient.post<WebhookSecretRotation>(`/api/v1/webhooks/subscriptions/${id}/rotate-secret`),
};
