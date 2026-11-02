import {useMutation, useQuery} from '@tanstack/react-query';
import {assistantKeys} from '@/shared/hooks/assistant/query-keys';
import {assistantService} from '@/api/assistant/assistant.api';
import {useAuth} from '@/providers/AuthContext';
import type {AssistantMessage} from '@/shared/types/assistant/assistant.types';

/** Whether the assistant is on and which answer modes it offers (same cache key as the web widget). */
export function useAssistantInfo() {
    const {user} = useAuth();
    return useQuery({queryKey: assistantKeys.info(user?.id), queryFn: ({signal}) => assistantService.info(signal), enabled: !!user, staleTime: 60_000});
}

export function useAssistantChat() {
    return useMutation({
        mutationFn: ({mode, messages, conversationId}: { mode: number; messages: AssistantMessage[]; conversationId: number | null }) =>
            assistantService.chat(mode, messages, conversationId),
        retry: false,
    });
}
