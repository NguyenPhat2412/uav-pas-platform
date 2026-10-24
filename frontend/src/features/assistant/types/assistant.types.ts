export interface AiRouterSettings {
    baseUrl: string;
    apiKeyConfigured: boolean;
    /** Last 4 characters of the stored key, for recognition only. */
    apiKeyHint: string | null;
    mode1Label: string;
    mode1Model: string | null;
    mode2Label: string;
    mode2Model: string | null;
    systemPrompt: string | null;
    enabled: boolean;
    version: number;
    updatedAt: string | null;
    updatedBy: string | null;
}

/** apiKey: undefined keeps the stored key, '' disconnects, any other value replaces it. */
export interface AiRouterSettingsInput {
    baseUrl: string;
    apiKey?: string;
    mode1Label: string;
    mode1Model: string | null;
    mode2Label: string;
    mode2Model: string | null;
    systemPrompt: string | null;
    enabled: boolean;
    expectedVersion: number;
}

export interface AiRouterStatus {
    reachable: boolean;
    latencyMs: number | null;
    authenticated: boolean;
    models: string[];
    error: string | null;
}

export interface AssistantMode {
    mode: 1 | 2;
    label: string;
    model: string;
}

export interface AssistantInfo {
    enabled: boolean;
    modes: AssistantMode[];
}

export interface AssistantMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface AssistantReply {
    reply: string;
    mode: number;
    model: string;
    latencyMs: number;
    promptTokens: number | null;
    completionTokens: number | null;
    /** Stored conversation this turn belongs to; send it back to continue the same thread. */
    conversationId: number | null;
}

/** Which portal a chat was started from; it decides the assistant's audience and the admin filter. */
export type AssistantPortal = 'CUSTOMER' | 'OPERATIONS' | 'ADMIN';

export interface AssistantConversation {
    id: number;
    userId: number;
    username: string;
    fullName: string | null;
    portal: AssistantPortal;
    title: string;
    messageCount: number;
    totalTokens: number;
    createdAt: string;
    updatedAt: string;
}

export interface AssistantStoredMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    mode: number | null;
    model: string | null;
    promptTokens: number | null;
    completionTokens: number | null;
    latencyMs: number | null;
    createdAt: string;
}

export interface AssistantConversationDetail {
    conversation: AssistantConversation;
    messages: AssistantStoredMessage[];
}
