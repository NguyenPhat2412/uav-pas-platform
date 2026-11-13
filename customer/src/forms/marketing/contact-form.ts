export const CONTACT_TOPICS = [
    'SURVEY_SERVICE',
    'PRICING_PLAN',
    'FLIGHT_PERMIT_NFZ',
    'ACCOUNT_DISPATCH',
    'TRAINING_SOP',
    'SAR_AI_RND',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactInquiryDraft {
    fullName: string;
    organization: string;
    contactInfo: string;
    topic: string;
    scopeTag: string;
    message: string;
}

export type ContactFieldErrors = Partial<Record<keyof ContactInquiryDraft, string>>;

export function emptyContactInquiryDraft(): ContactInquiryDraft {
    return {
        fullName: '',
        organization: '',
        contactInfo: '',
        topic: 'SURVEY_SERVICE',
        scopeTag: '',
        message: '',
    };
}

export function canSubmitContactInquiry(draft: ContactInquiryDraft): boolean {
    return Boolean(draft.fullName.trim() && draft.contactInfo.trim());
}

export function toContactInquiryPayload(
    draft: ContactInquiryDraft,
    fallbackMessage = 'Yêu cầu tư vấn dịch vụ và hỗ trợ điều phối nhiệm vụ UAV.',
): {
    fullName: string;
    organization?: string;
    contactInfo: string;
    topic: string;
    message: string;
} {
    const rawBody = draft.message.trim() || fallbackMessage;
    const scope = (draft.scopeTag ?? '').trim();
    const composedMessage = scope ? `[Quy mô / Tiến độ: ${scope}] ${rawBody}` : rawBody;

    return {
        fullName: draft.fullName.trim(),
        organization: draft.organization.trim() || undefined,
        contactInfo: draft.contactInfo.trim(),
        topic: draft.topic,
        message: composedMessage,
    };
}

export function contactFieldErrors(error: unknown): ContactFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as ContactFieldErrors) : null;
}
