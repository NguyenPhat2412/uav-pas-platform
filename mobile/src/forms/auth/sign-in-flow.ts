import type {AuthResponse, OtpChallengeResponse} from '@/shared/types/auth/auth.types';

/** What the code screen verifies: a sign-in's second factor, or the email address of a new account. */
export type VerifyPurpose = 'login' | 'register';

/** Route params of the code screen (strings, as expo-router passes them). */
export interface VerifyParams {
    purpose: VerifyPurpose;
    challengeToken: string;
    email: string;
    maskedEmail: string;
    method: 'EMAIL' | 'TOTP';
    [key: string]: string;
}

export type SignInStep =
    | { kind: 'done' }
    | { kind: 'verify'; params: VerifyParams }
    /** A staff sign-up whose email is verified but which an administrator still has to approve: no session yet. */
    | { kind: 'pending-approval' };

/** Where a password sign-in (or an email verification) leads, mirroring the web AuthModalPopup. */
export function nextSignInStep(response: AuthResponse, fallbackEmail = ''): SignInStep {
    if (response.mfaMethod === 'PENDING_APPROVAL' && !response.accessToken) return {kind: 'pending-approval'};
    if (!response.mfaRequired) return {kind: 'done'};
    const email = response.user?.email ?? fallbackEmail;
    return {
        kind: 'verify',
        params: {
            purpose: response.mfaMethod === 'EMAIL_VERIFY' ? 'register' : 'login',
            challengeToken: response.challengeToken ?? '',
            email,
            maskedEmail: response.maskedEmail ?? email,
            method: response.mfaMethod === 'TOTP' ? 'TOTP' : 'EMAIL',
        },
    };
}

/** The code screen after registering: the backend emailed a code to confirm the address. */
export function registerVerifyParams(challenge: OtpChallengeResponse): VerifyParams {
    return {
        purpose: 'register',
        challengeToken: challenge.challengeToken,
        email: challenge.email,
        maskedEmail: challenge.maskedEmail,
        method: 'EMAIL',
    };
}

/** One-time codes are six digits; strip spaces and anything pasted around them. */
export function normalizeCode(input: string): string {
    return input.replace(/\D/g, '').slice(0, 6);
}

export const RESEND_COOLDOWN_SECONDS = 60;

/** A known error code in the app language (customerAuth.errors.*), else the backend's localized message. */
export function signInErrorText(error: unknown, t: (key: string) => string): string {
    const {code, message} = (error ?? {}) as { code?: string; message?: string };
    if (code) {
        const key = `customerAuth.errors.${code}`;
        const text = t(key);
        if (text !== key) return text;
    }
    return message && message.trim() ? message : t('customerAuth.errors.default');
}
