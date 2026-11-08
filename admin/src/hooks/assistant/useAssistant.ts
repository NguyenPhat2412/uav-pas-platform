'use client';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {ApiError} from '@/lib/api';
import {afterSuccess, type MutationOptions} from '@/lib/query';
import {assistantService} from '@/api/assistant/assistant.api';
import {assistantKeys} from '@/hooks/assistant/query-keys';
import type {
    AiRouterSettings,
    AiRouterSettingsInput,
    AssistantAttachmentInput,
    AssistantMessage,
    AssistantPortal,
    AssistantReply,
    ConversationFilter,
} from '@/types/assistant/assistant.types';

export function useRouterSettings() {
    const {user} = useAuth();
    return useQuery({queryKey: assistantKeys.settings(user?.id), queryFn: ({signal}) => assistantService.settings(signal)});
}

export function useRouterStatus() {
    const {user} = useAuth();
    return useQuery({queryKey: assistantKeys.status(user?.id), queryFn: ({signal}) => assistantService.status(signal)});
}

/**
 * Saves the router settings and refreshes everything that depends on them. When another admin saved
 * first (AI_ROUTER_SETTINGS_STALE) the settings are reloaded before the caller's onError runs.
 */
export function useSaveRouterSettings(options?: MutationOptions<AiRouterSettings, AiRouterSettingsInput>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        ...options,
        mutationFn: (input: AiRouterSettingsInput) => assistantService.save(input),
        onSuccess: afterSuccess(options, next => {
            client.setQueryData(assistantKeys.settings(user?.id), next);
            void client.invalidateQueries({queryKey: assistantKeys.status(user?.id)});
            void client.invalidateQueries({queryKey: assistantKeys.info(user?.id)});
        }),
        onError: (error, ...rest) => {
            if (error instanceof ApiError && error.code === 'AI_ROUTER_SETTINGS_STALE') void client.invalidateQueries({queryKey: assistantKeys.settings(user?.id)});
            return options?.onError?.(error, ...rest);
        },
    });
}

/** Which answer modes are available; fetched only while the widget is open. */
export function useAssistantInfo(enabled: boolean) {
    const {user} = useAuth();
    return useQuery({
        queryKey: assistantKeys.info(user?.id),
        queryFn: ({signal}) => assistantService.info(signal),
        enabled,
        staleTime: 60_000,
    });
}

export interface AssistantChatInput {
    mode: number;
    messages: AssistantMessage[];
    portal: AssistantPortal;
    conversationId: number | null;
    attachments: AssistantAttachmentInput[];
}

export function useAssistantChat(options?: MutationOptions<AssistantReply, AssistantChatInput>) {
    return useMutation({
        ...options,
        mutationFn: ({mode, messages, portal, conversationId, attachments}: AssistantChatInput) =>
            assistantService.chat(mode, messages, portal, conversationId, attachments),
    });
}

export function useAssistantConversations(filter: ConversationFilter) {
    const {user} = useAuth();
    return useQuery({
        queryKey: assistantKeys.conversationList(user?.id, filter),
        queryFn: ({signal}) => assistantService.conversations(filter, signal),
        placeholderData: keepPreviousData,
    });
}

export function useAssistantConversation(id: number) {
    const {user} = useAuth();
    return useQuery({queryKey: assistantKeys.conversation(user?.id, id), queryFn: ({signal}) => assistantService.conversation(id, signal)});
}

/** Deletes a stored conversation, drops its cached detail and refreshes the list. */
export function useDeleteConversation(id: number, options?: MutationOptions<void>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        ...options,
        mutationFn: () => assistantService.deleteConversation(id),
        onSuccess: afterSuccess(options, () => {
            client.removeQueries({queryKey: assistantKeys.conversation(user?.id, id)});
            void client.invalidateQueries({queryKey: assistantKeys.conversations(user?.id)});
        }),
    });
}
