import type {
    MailOtpSettings,
    MailOtpSettingsUpdatePayload,
} from '@/types/infrastructure.types';

export interface MailOtpSettingsDraft {
    mailEnabled: boolean;
    smtpHost: string;
    smtpPort: string;
    smtpUsername: string;
    smtpPassword: string;
    fromAddress: string;
    senderDisplayName: string;
    smtpAuth: boolean;
    smtpStarttls: boolean;
    otpTtlMinutes: string;
    resendCooldownSeconds: string;
    maxOtpAttempts: string;
    otpPerAccount: string;
    otpPerIp: string;
    maxEmailsPerMinute: string;
}

export type MailOtpFieldErrors = Partial<Record<keyof MailOtpSettingsDraft, string>>;

/** Strips spaces in 16-digit Google App Passwords such as `xxxx xxxx xxxx xxxx`. */
export function stripAppPasswordSpaces(raw: string): string {
    return raw.replace(/\s+/g, '');
}

export function mailOtpDraftFromSettings(settings: MailOtpSettings): MailOtpSettingsDraft {
    return {
        mailEnabled: Boolean(settings.mailEnabled),
        smtpHost: settings.smtpHost ?? '',
        smtpPort: settings.smtpPort != null ? String(settings.smtpPort) : '587',
        smtpUsername: settings.smtpUsername ?? '',
        smtpPassword: '',
        fromAddress: settings.fromAddress ?? '',
        senderDisplayName: settings.senderDisplayName ?? '',
        smtpAuth: Boolean(settings.smtpAuth),
        smtpStarttls: Boolean(settings.smtpStarttls),
        otpTtlMinutes: String(settings.otpTtlMinutes ?? 10),
        resendCooldownSeconds: String(settings.resendCooldownSeconds ?? 60),
        maxOtpAttempts: String(settings.maxOtpAttempts ?? 5),
        otpPerAccount: String(settings.otpPerAccount ?? 5),
        otpPerIp: String(settings.otpPerIp ?? 15),
        maxEmailsPerMinute: String(settings.maxEmailsPerMinute ?? 60),
    };
}

function parseIntOrFallback(raw: string, fallback: number): number {
    const trimmed = raw.trim();
    if (!trimmed) return fallback;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function toMailOtpSettingsPayload(
    draft: MailOtpSettingsDraft,
    options?: { resetToEnvDefaults?: boolean },
): MailOtpSettingsUpdatePayload {
    const portTrimmed = draft.smtpPort.trim();
    const parsedPort = portTrimmed === '' ? null : Number(portTrimmed);
    const smtpPort = parsedPort != null && Number.isFinite(parsedPort) ? Math.trunc(parsedPort) : null;
    const cleanedPassword = stripAppPasswordSpaces(draft.smtpPassword);

    return {
        mailEnabled: draft.mailEnabled,
        smtpHost: draft.smtpHost.trim(),
        smtpPort,
        smtpUsername: draft.smtpUsername.trim(),
        ...(cleanedPassword ? {smtpPassword: cleanedPassword} : {}),
        ...(options?.resetToEnvDefaults ? {resetToEnvDefaults: true} : {}),
        fromAddress: draft.fromAddress.trim(),
        senderDisplayName: draft.senderDisplayName.trim() || null,
        smtpAuth: draft.smtpAuth,
        smtpStarttls: draft.smtpStarttls,
        otpTtlMinutes: parseIntOrFallback(draft.otpTtlMinutes, 10),
        resendCooldownSeconds: parseIntOrFallback(draft.resendCooldownSeconds, 60),
        maxOtpAttempts: parseIntOrFallback(draft.maxOtpAttempts, 5),
        otpPerAccount: parseIntOrFallback(draft.otpPerAccount, 5),
        otpPerIp: parseIntOrFallback(draft.otpPerIp, 15),
        maxEmailsPerMinute: parseIntOrFallback(draft.maxEmailsPerMinute, 60),
    };
}

export function mailOtpFieldErrors(error: unknown): MailOtpFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as MailOtpFieldErrors) : null;
}

export function canSubmitOtpSupportEmail(email: string): boolean {
    const trimmed = email.trim();
    return trimmed.length >= 5 && trimmed.includes('@') && !/\s/.test(trimmed);
}
