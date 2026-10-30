import {queryKeys} from '@/lib/query';
import type {ConversationFilter} from '@/features/assistant/types/assistant.types';

type UserId = number | undefined;

export const assistantKeys = {
    settings: (userId: UserId) => queryKeys.of(userId, 'ai-router', 'settings'),
    status: (userId: UserId) => queryKeys.of(userId, 'ai-router', 'status'),
    info: (userId: UserId) => queryKeys.of(userId, 'assistant', 'info'),
    conversations: (userId: UserId) => queryKeys.of(userId, 'assistant', 'conversations'),
    conversationList: (userId: UserId, filter: ConversationFilter) => queryKeys.of(userId, 'assistant', 'conversations', filter),
    conversation: (userId: UserId, id: number) => queryKeys.of(userId, 'assistant', 'conversations', 'detail', id),
};
