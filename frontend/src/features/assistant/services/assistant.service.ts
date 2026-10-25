import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {
    AiRouterSettings,
    AiRouterSettingsInput,
    AiRouterStatus,
    AssistantAttachmentInput,
    AssistantConversation,
    AssistantConversationDetail,
    AssistantInfo,
    AssistantMessage,
    AssistantPortal,
    AssistantReply,
    ConversationFilter,
} from '@/features/assistant/types/assistant.types';

export type {ConversationFilter};
import type {PageResponse} from '@/types';

export const assistantService = {
    settings: (signal?: AbortSignal) => apiClient.get<AiRouterSettings>(API_ROUTES.aiRouter.settings, {signal}),
    save: (input: AiRouterSettingsInput) => apiClient.put<AiRouterSettings>(API_ROUTES.aiRouter.settings, input),
    status: (signal?: AbortSignal) => apiClient.get<AiRouterStatus>(API_ROUTES.aiRouter.status, {signal}),
    info: (signal?: AbortSignal) => apiClient.get<AssistantInfo>(API_ROUTES.assistant.info, {signal}),
    chat: (mode: number, messages: AssistantMessage[], portal: AssistantPortal, conversationId: number | null,
           attachments: AssistantAttachmentInput[] = []) =>
        apiClient.post<AssistantReply>(API_ROUTES.assistant.chat, {
            mode,
            messages: messages.map(({role, content}) => ({role, content})),
            portal,
            conversationId,
            attachments: attachments.length ? attachments : undefined,
        }),
    conversations: (filter: ConversationFilter, signal?: AbortSignal) => {
        const params = new URLSearchParams({page: String(filter.page), size: String(filter.size)});
        if (filter.portal) params.set('portal', filter.portal);
        if (filter.q) params.set('q', filter.q);
        return apiClient.get<PageResponse<AssistantConversation>>(`${API_ROUTES.assistant.conversations}?${params}`, {signal});
    },
    conversation: (id: number, signal?: AbortSignal) =>
        apiClient.get<AssistantConversationDetail>(API_ROUTES.assistant.conversation(id), {signal}),
    deleteConversation: (id: number) => apiClient.delete<void>(API_ROUTES.assistant.conversation(id)),
};

export const assistantKeys = {
    settings: ['ai-router', 'settings'] as const,
    status: ['ai-router', 'status'] as const,
    info: ['assistant', 'info'] as const,
    conversations: ['assistant', 'conversations'] as const,
    conversationList: (filter: ConversationFilter) => ['assistant', 'conversations', filter] as const,
    conversation: (id: number) => ['assistant', 'conversations', 'detail', id] as const,
};
