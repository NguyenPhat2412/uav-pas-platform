import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {buildQueryString} from '@/lib/format';
import type {PageResponse} from '@/types';
import type {AiRouterSettings, AiRouterSettingsInput, AiRouterStatus, AssistantAttachmentInput, AssistantConversation, AssistantConversationDetail, AssistantInfo, AssistantMessage, AssistantPortal, AssistantReply, ConversationFilter} from '@/types/assistant/assistant.types';

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
    conversations: (filter: ConversationFilter, signal?: AbortSignal) =>
        apiClient.get<PageResponse<AssistantConversation>>(`${API_ROUTES.assistant.conversations}?${buildQueryString({
            page: filter.page,
            size: filter.size,
            portal: filter.portal || undefined,
            q: filter.q || undefined,
        })}`, {signal}),
    conversation: (id: number, signal?: AbortSignal) =>
        apiClient.get<AssistantConversationDetail>(API_ROUTES.assistant.conversation(id), {signal}),
    deleteConversation: (id: number) => apiClient.delete<void>(API_ROUTES.assistant.conversation(id)),
};
