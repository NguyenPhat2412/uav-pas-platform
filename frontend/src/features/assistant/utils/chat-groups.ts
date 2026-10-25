import type {ChatGroup, ChatMessage} from '@/features/assistant/types/assistant.types';

/** Messages from the same sender within this window share one avatar, like Zalo. */
export const GROUP_WINDOW_MS = 15 * 60 * 1000;

/** Splits a conversation into sender runs; a run breaks on a new sender or a gap longer than the window. */
export function groupMessages(messages: ChatMessage[]): ChatGroup[] {
    const groups: ChatGroup[] = [];
    let lastAt: number | undefined;
    for (const message of messages) {
        const current = groups[groups.length - 1];
        const gap = message.at != null && lastAt != null ? message.at - lastAt : 0;
        if (current && current.role === message.role && gap <= GROUP_WINDOW_MS) current.messages.push(message);
        else groups.push({role: message.role, at: message.at, divider: !groups.length || gap > GROUP_WINDOW_MS, messages: [message]});
        if (message.at != null) lastAt = message.at;
    }
    return groups;
}
