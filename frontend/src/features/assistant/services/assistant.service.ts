import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {
    AiRouterSettings,
    AiRouterSettingsInput,
    AiRouterStatus,
    AssistantInfo,
    AssistantMessage,
    AssistantReply,
} from '@/features/assistant/types/assistant.types';

export const assistantService = {
    settings: (signal?: AbortSignal) => apiClient.get<AiRouterSettings>(API_ROUTES.aiRouter.settings, {signal}),
    save: (input: AiRouterSettingsInput) => apiClient.put<AiRouterSettings>(API_ROUTES.aiRouter.settings, input),
    status: (signal?: AbortSignal) => apiClient.get<AiRouterStatus>(API_ROUTES.aiRouter.status, {signal}),
    info: (signal?: AbortSignal) => apiClient.get<AssistantInfo>(API_ROUTES.assistant.info, {signal}),
    chat: (mode: number, messages: AssistantMessage[]) => apiClient.post<AssistantReply>(API_ROUTES.assistant.chat, {mode, messages}),
};

export const assistantKeys = {
    settings: ['ai-router', 'settings'] as const,
    status: ['ai-router', 'status'] as const,
    info: ['assistant', 'info'] as const,
};
