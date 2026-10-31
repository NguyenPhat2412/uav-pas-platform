'use client';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {QUIET, queryKeys, type MutationOptions} from '@/lib/query';
import {webhooksService} from '@/api/webhook/webhooks.api';
import {webhooksAdminService, type WebhookSecretRotation} from '@/api/webhook/webhooks-admin.api';
import type {WebhookEndpointItem} from '@/types/admin';

const webhookKeys = {
    overview: (userId: number | undefined) => queryKeys.of(userId, 'webhooks', 'overview'),
};

/** Subscriptions, recent deliveries and the dispatcher state, loaded together; the page shows a failure inline. */
export function useWebhookOverview() {
    const {user} = useAuth();
    return useQuery({
        queryKey: webhookKeys.overview(user?.id),
        queryFn: async ({signal}) => {
            const [subscriptions, deliveries, runtime] = await Promise.all([
                webhooksService.webhooks(signal), webhooksService.webhookLogs(signal), webhooksService.webhookStatus(signal),
            ]);
            return {subscriptions, deliveries, status: runtime.status};
        },
        meta: QUIET,
    });
}

/** Sends a WEBHOOK_TEST event; the page reports failures itself. */
export function useWebhookTestDispatch() {
    return useMutation({mutationFn: () => webhooksService.triggerWebhookTest(), meta: QUIET});
}

/** Manual requeue of a FAILED delivery; the delivery worker sends it on its next run. */
export function useRetryDelivery(options?: MutationOptions<unknown, number>) {
    return useMutation({...options, mutationFn: (id: number) => webhooksAdminService.retryDelivery(id)});
}

/** Subscription writes; `onChanged` reloads the page after each, `onRotated` receives the one-time secret. */
export function useWebhookSubscriptionMutations({onChanged, onRotated}: {
    onChanged: () => void;
    onRotated?: (result: WebhookSecretRotation, item: WebhookEndpointItem) => void;
}) {
    return {
        toggle: useMutation({
            mutationFn: ({id, active}: { id: number; active: boolean }) => webhooksService.toggleWebhook(id, active),
            onSuccess: onChanged,
        }),
        remove: useMutation({mutationFn: webhooksService.deleteWebhook, onSuccess: onChanged}),
        rotate: useMutation({
            mutationFn: (item: WebhookEndpointItem) => webhooksAdminService.rotateSecret(item.id),
            onSuccess: (result, item) => {
                onRotated?.(result, item);
                onChanged();
            },
        }),
    };
}

export function useCreateWebhook() {
    return useMutation({mutationFn: webhooksService.createWebhook});
}
