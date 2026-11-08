/* Webhook administration responses. */

/** Returned only by rotate-secret; the plain secret is never retrievable again. */
export interface WebhookSecretRotation {
    subscriptionId: number;
    secretKey: string;
    maskedSecret: string;
    rotatedAt: string;
}
