import React, {createContext, ReactNode, useContext, useMemo, useState} from 'react';
import type {ChatMessage} from '@/shared/types/assistant/assistant.types';

interface AssistantThread {
    messages: ChatMessage[];
    conversationId: number | null;
    mode: number | null;
    setMessages: (update: (messages: ChatMessage[]) => ChatMessage[]) => void;
    setConversationId: (id: number | null) => void;
    setMode: (mode: number) => void;
    clear: () => void;
}

const sharedAssistant = globalThis as { __uavAssistantContext?: React.Context<AssistantThread | undefined> };
const AssistantContext = (sharedAssistant.__uavAssistantContext ??= createContext<AssistantThread | undefined>(undefined));

/** The open chat thread, kept while the sheet is closed; mounted inside the signed-in area so signing out drops it. */
export function AssistantProvider({children}: { children: ReactNode }) {
    const [messages, setMessagesState] = useState<ChatMessage[]>([]);
    const [conversationId, setConversationId] = useState<number | null>(null);
    const [mode, setMode] = useState<number | null>(null);
    const value = useMemo<AssistantThread>(() => ({
        messages, conversationId, mode,
        setMessages: update => setMessagesState(update),
        setConversationId,
        setMode,
        clear: () => {
            setMessagesState([]);
            setConversationId(null);
        },
    }), [messages, conversationId, mode]);
    return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistantThread(): AssistantThread {
    const context = useContext(AssistantContext);
    if (!context) throw new Error('useAssistantThread must be used within an AssistantProvider');
    return context;
}
