/**
 * Shared data contracts for public visitor live support chat, landing-page inquiries,
 * public site contact info, and Admin support inbox / quick-reply templates.
 */

export type SupportTopic =
    | 'SURVEY_SERVICE'
    | 'PRICING_PLAN'
    | 'FLIGHT_PERMIT_NFZ'
    | 'ACCOUNT_DISPATCH'
    | 'SAR_AI_RND'
    | 'TRAINING_SOP'
    | 'GENERAL_SUPPORT';

export type SupportSource = 'LIVE_WIDGET' | 'CONTACT_FORM';
export type SupportThreadSource = SupportSource;

export type SupportThreadStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type SupportSenderRole = 'VISITOR' | 'ADMIN';

export interface PublicSiteInfo {
    dispatchHotline?: string | null;
    zaloPhone?: string | null;
    email?: string | null;
    address?: string | null;
    settings?: Record<string, string>;
}

export interface PublicDiscoveryServiceItem {
    code: string;
    name: string;
    description?: string | null;
    defaultDurationMinutes: number;
    sensors?: string | null;
    maxAreaHectares?: number | null;
}

export interface PublicDiscoveryPlanItem {
    code: string;
    name: string;
    price: number;
    maxMonthlyFlightHours: number;
    maxConcurrentUavs: number;
    allowSarAi: boolean;
}

export interface PublicDiscoveryTrainingItem {
    code: string;
    slug: string;
    title: string;
    summary: string;
    estimatedMinutes: number;
    category: string;
}

export interface PublicDiscoveryData {
    services: PublicDiscoveryServiceItem[];
    plans: PublicDiscoveryPlanItem[];
    trainings: PublicDiscoveryTrainingItem[];
    dispatchHotline?: string | null;
    zaloPhone?: string | null;
    email?: string | null;
}

export interface SupportChatMessage {
    id: number;
    senderRole: SupportSenderRole;
    senderName: string;
    content: string;
    createdAt: string;
}

export interface PublicSupportCreateInput {
    fullName: string;
    organization?: string;
    contactInfo: string;
    topic: string;
    source: SupportSource;
    message: string;
}

export interface PublicSupportMessageInput {
    content: string;
}

export interface PublicSupportThreadSession {
    threadId: number;
    code: string;
    visitorToken: string;
    fullName: string;
    organization?: string | null;
    contactInfo: string;
    topic: string;
    status: SupportThreadStatus;
    unreadForVisitor: number;
    createdAt: string;
    updatedAt: string;
    messages: SupportChatMessage[];
}

export interface SupportAdminSummary {
    totalThreads: number;
    openThreads: number;
    inProgressThreads: number;
    resolvedThreads: number;
    unreadThreads: number;
    unreadMessages: number;
}

export interface SupportThread {
    id: number;
    code: string;
    fullName: string;
    organization?: string | null;
    contactInfo: string;
    topic: string;
    source: SupportThreadSource;
    status: SupportThreadStatus;
    unreadForAdmin: number;
    unreadForVisitor: number;
    lastMessagePreview?: string | null;
    lastSenderRole: SupportSenderRole;
    assignedAdminUsername?: string | null;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface SupportThreadDetail {
    thread: SupportThread;
    messages: SupportChatMessage[];
}

export interface SupportThreadFilter {
    status?: SupportThreadStatus | '';
    topic?: string;
    unreadOnly?: boolean;
    q?: string;
    page?: number;
    size?: number;
}

export interface SupportQuickReply {
    id: number;
    title: string;
    topic?: string | null;
    content: string;
    sortOrder: number;
    createdBy?: string | null;
    createdAt: string;
}

export interface SupportQuickReplyInput {
    title: string;
    topic?: string | null;
    content: string;
    sortOrder?: number;
}

export interface SupportReplyInput {
    content: string;
    status?: SupportThreadStatus | null;
}

export interface OpenSupportWidgetDetail {
    topic?: string;
    prompt?: string;
}

export interface SupportSessionEventDetail {
    visitorToken: string | null;
    open?: boolean;
}

export interface SupportQuickTopicOption {
    topic: SupportTopic;
    chipLabel: string;
    selectLabel: string;
    starterPrompt: string;
}

export interface SupportStartDraft {
    fullName: string;
    organization: string;
    contactInfo: string;
    topic: string;
    message: string;
}
