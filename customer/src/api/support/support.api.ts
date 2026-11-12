import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    PublicDiscoveryData,
    PublicSupportCreateInput,
    PublicSupportMessageInput,
    PublicSupportThreadSession,
} from '@/types/support/support.types';

/**
 * Public support & contextual discovery API client for visitor inquiries,
 * live PostgreSQL service/training recommendations, and two-way live chat threads.
 */
export const publicSupportService = {
    discovery: (signal?: AbortSignal) =>
        apiClient.get<PublicDiscoveryData>(API_ROUTES.public.discovery, {signal}),

    createThread: (payload: PublicSupportCreateInput, signal?: AbortSignal) =>
        apiClient.post<PublicSupportThreadSession>(
            API_ROUTES.public.supportThreads,
            payload,
            {signal},
        ),

    getThread: (visitorToken: string, markRead = false, signal?: AbortSignal) =>
        apiClient.get<PublicSupportThreadSession>(
            API_ROUTES.public.supportThread(visitorToken, markRead),
            {signal},
        ),

    sendMessage: (
        visitorToken: string,
        content: string,
        signal?: AbortSignal,
    ) => {
        const body: PublicSupportMessageInput = {content};
        return apiClient.post<PublicSupportThreadSession>(
            API_ROUTES.public.supportMessages(visitorToken),
            body,
            {signal},
        );
    },
};
