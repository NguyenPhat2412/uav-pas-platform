import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {AssistantInfo, AssistantMessage, AssistantReply} from '@/shared/types/assistant/assistant.types';

/** The same assistant as the web widget; the phone always speaks as the customer portal. */
export const assistantService = {
    info: (signal?: AbortSignal) => apiClient.get<AssistantInfo>(API_ROUTES.assistant.info, {signal}),
    chat: (mode: number, messages: AssistantMessage[], conversationId: number | null) =>
        apiClient.post<AssistantReply>(API_ROUTES.assistant.chat, {
            mode,
            messages: messages.map(({role, content}) => ({role, content})),
            portal: 'CUSTOMER',
            conversationId,
        }),
};
