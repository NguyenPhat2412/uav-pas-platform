import type {AiRouterSettings, AiRouterSettingsInput} from '@/types/assistant/assistant.types';

export type {AiRouterSettings, AiRouterSettingsInput};

export interface AiRouterFormDraft {
    baseUrl: string;
    apiKey: string;
    mode1Label: string;
    mode1Model: string;
    mode2Label: string;
    mode2Model: string;
    systemPrompt: string;
    enabled: boolean;
}

export type AiRouterFieldErrors = Partial<Record<keyof AiRouterFormDraft, string>>;

export function aiRouterDraftFromSettings(settings: AiRouterSettings): AiRouterFormDraft {
    return {
        baseUrl: settings.baseUrl,
        apiKey: '',
        mode1Label: settings.mode1Label,
        mode1Model: settings.mode1Model ?? '',
        mode2Label: settings.mode2Label,
        mode2Model: settings.mode2Model ?? '',
        systemPrompt: settings.systemPrompt ?? '',
        enabled: settings.enabled,
    };
}

export function canSubmitAiRouterSettings(draft: AiRouterFormDraft): boolean {
    return Boolean(draft.baseUrl.trim() && draft.mode1Label.trim() && draft.mode2Label.trim());
}

/** `disconnectKey`: sends `apiKey: ''` and `enabled: false` so the stored cipher is cleared. */
export function toAiRouterSettingsPayload(
    draft: AiRouterFormDraft,
    expectedVersion: number,
    disconnectKey = false,
): AiRouterSettingsInput {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
        throw new Error('Thiếu phiên bản cấu hình AI Router hợp lệ.');
    }
    const trimmedKey = draft.apiKey.trim();
    return {
        baseUrl: draft.baseUrl.trim(),
        apiKey: disconnectKey ? '' : trimmedKey ? trimmedKey : undefined,
        mode1Label: draft.mode1Label.trim(),
        mode1Model: draft.mode1Model.trim() || null,
        mode2Label: draft.mode2Label.trim(),
        mode2Model: draft.mode2Model.trim() || null,
        systemPrompt: draft.systemPrompt.trim() || null,
        enabled: disconnectKey ? false : draft.enabled,
        expectedVersion,
    };
}

export function aiRouterFieldErrors(error: unknown): AiRouterFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as AiRouterFieldErrors) : null;
}

/** Extracts domain or bean-validation code (e.g. AI_ROUTER_URL_HTTPS_REQUIRED inside fields.baseUrl). */
export function resolveAiRouterErrorCode(error: unknown): string | null {
    const structured = error as { code?: string; message?: string; fields?: Record<string, string> } | null;
    if (!structured) return null;
    if (structured.code && structured.code !== 'VALIDATION_ERROR') return structured.code;
    for (const value of Object.values(structured.fields ?? {})) {
        if (/^[A-Z0-9_]+$/.test(value)) return value;
    }
    if (structured.message && /^[A-Z0-9_]+$/.test(structured.message)) return structured.message;
    return structured.code ?? null;
}

