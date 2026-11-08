export const WEBHOOK_EVENTS = [
    'SAR_EMERGENCY_TRIGGERED',
    'GEOFENCE_BREACH',
    'BATTERY_CRITICAL_RTH',
    'SAR_RTH_REQUESTED',
    'INVOICE_ISSUED',
    'PAYMENT_COMPLETED',
    'WEBHOOK_TEST',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookSubscriptionDraft {
    name: string;
    targetUrl: string;
    secretKey: string;
    events: string[];
}

export type WebhookFieldErrors = Partial<
    Record<'name' | 'targetUrl' | 'secretKey' | 'eventsSubscribed', string>
>;

export function generateWebhookSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function createWebhookSubscriptionDraft(
    secretKey = generateWebhookSecret(),
): WebhookSubscriptionDraft {
    return {
        name: '',
        targetUrl: 'https://',
        secretKey,
        events: ['SAR_EMERGENCY_TRIGGERED'],
    };
}

export function canSubmitWebhookSubscription(draft: WebhookSubscriptionDraft): boolean {
    return Boolean(
        draft.name.trim() &&
            draft.targetUrl.trim() &&
            draft.secretKey.trim() &&
            draft.events.length > 0,
    );
}

export function toWebhookSubscriptionPayload(draft: WebhookSubscriptionDraft): {
    name: string;
    targetUrl: string;
    secretKey: string;
    eventsSubscribed: string;
} {
    return {
        name: draft.name.trim(),
        targetUrl: draft.targetUrl.trim(),
        secretKey: draft.secretKey.trim(),
        eventsSubscribed: draft.events.join(','),
    };
}

export function webhookFieldErrors(error: unknown): WebhookFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as WebhookFieldErrors) : null;
}

