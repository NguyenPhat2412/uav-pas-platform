export const CONTACT_TOPICS = [
    'SURVEY_SERVICE',
    'PRICING_PLAN',
    'SAR_AI_RND',
    'TRAINING_SOP',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactInquiryDraft {
    fullName: string;
    organization: string;
    contactInfo: string;
    topic: string;
    message: string;
}

export type ContactFieldErrors = Partial<Record<keyof ContactInquiryDraft, string>>;

export function emptyContactInquiryDraft(): ContactInquiryDraft {
    return {
        fullName: '',
        organization: '',
        contactInfo: '',
        topic: 'SURVEY_SERVICE',
        message: '',
    };
}

export function canSubmitContactInquiry(draft: ContactInquiryDraft): boolean {
    return Boolean(draft.fullName.trim() && draft.contactInfo.trim());
}

export function toContactInquiryPayload(draft: ContactInquiryDraft): {
    fullName: string;
    organization?: string;
    contactInfo: string;
    topic: string;
    message?: string;
} {
    return {
        fullName: draft.fullName.trim(),
        organization: draft.organization.trim() || undefined,
        contactInfo: draft.contactInfo.trim(),
        topic: draft.topic,
        message: draft.message.trim() || undefined,
    };
}

export function contactFieldErrors(error: unknown): ContactFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as ContactFieldErrors) : null;
}

