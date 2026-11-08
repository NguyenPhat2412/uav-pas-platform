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

/** IMAGE is a photo; VIDEO_FRAME is one still sampled from a video in the browser. */
export type AttachmentKind = 'IMAGE' | 'VIDEO_FRAME';

/** What the chat endpoint receives: the compressed image as base64, without the data: prefix. */
export interface AssistantAttachmentInput {
    kind: AttachmentKind;
    name: string | null;
    data: string;
}

/** An image shown in the chat; thumb is the small copy kept across reloads, src the full one when still in memory. */
export interface ChatImage {
    kind: AttachmentKind;
    name: string | null;
    src: string;
    thumb: string;
}

/** An attachment picked in the composer and not sent yet. */
export interface PendingAttachment extends ChatImage {
    id: string;
    data: string;
}

/** A message in the widget: at is when it was sent (ms), used to group bubbles like a messenger. */
export interface ChatMessage extends AssistantMessage {
    at?: number;
    images?: ChatImage[];
    /** Small grey line under the bubble, e.g. model and latency in the admin transcript. */
    note?: string;
}

/** Consecutive messages of one sender within the grouping window, drawn under one avatar. */
export interface ChatGroup {
    role: 'user' | 'assistant';
    at: number | undefined;
    /** True when a time divider goes above this group (first group, or a long gap before it). */
    divider: boolean;
    messages: ChatMessage[];
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
    attachments: AssistantStoredAttachment[];
}

export interface AssistantStoredAttachment {
    id: number;
    kind: AttachmentKind;
    mimeType: string;
    name: string | null;
    sizeBytes: number;
    dataUrl: string;
}

export interface AssistantConversationDetail {
    conversation: AssistantConversation;
    messages: AssistantStoredMessage[];
}

export type RouterConsoleTab = 'console' | 'chats';
export type AssistantCorner = 'tl' | 'tr' | 'bl' | 'br';

export interface ConversationFilter {
    portal: AssistantPortal | '';
    q: string;
    page: number;
    size: number;
}

