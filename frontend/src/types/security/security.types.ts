import type {PageResponse} from '@/types';

export type SessionState = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'NONE';
export type WarningSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface SecuritySession {
    userId: number;
    username: string;
    email: string;
    fullName: string | null;
    role: string | null;
    status: string | null;
    activeSession: boolean;
    sessionState: SessionState;
    sessionCreatedAt: string | null;
    sessionExpiresAt: string | null;
    twoFactorEnabled: boolean;
    twoFactorMethod: string | null;
    sessionsRevokedAt: string | null;
    sessionsRevokedBy: string | null;
}

export interface SecurityActionResult {
    action: 'REVOKE_USER_SESSIONS' | 'REVOKE_ALL_SESSIONS' | 'RESET_2FA';
    affectedUsers: number;
    refreshTokensRevoked: number;
    includesCurrentUser: boolean;
    effectiveAt: string;
}

export interface SecurityWarning {
    code: string;
    severity: WarningSeverity;
    subject: string;
}

export interface SecurityPolicy {
    accessTokenExpirationMs: number;
    refreshTokenExpirationMs: number;
    otpTtlMinutes: number;
    totpIssuer: string;
    otpDevPreview: boolean;
    cookieSecure: boolean;
    cookieSameSite: string;
    cookieDomain: string | null;
    corsAllowedOrigins: string[];
    mailEnabled: boolean;
    activeProfiles: string[];
    productionLike: boolean;
    warnings: SecurityWarning[];
}

export type SecretHealth = 'OK' | 'MISSING' | 'NOT_REQUIRED' | 'TOO_SHORT' | 'KNOWN_DEFAULT';

export interface SecretStatus {
    property: string;
    envVar: string;
    required: boolean;
    configured: boolean;
    minimumLength: number;
    meetsMinimumLength: boolean;
    usesKnownDefault: boolean;
    status: SecretHealth;
    note: string | null;
    managedIn: string;
    rotationKey: string;
}

export interface SecretsOverview {
    secrets: SecretStatus[];
    aiProviderKey: { configured: boolean; updatedAt: string | null; updatedBy: string | null };
    warnings: SecurityWarning[];
}

export interface SessionFilter {
    page: number;
    keyword: string;
    role?: string;
    activeOnly: boolean;
}

export type SecuritySessionPage = PageResponse<SecuritySession>;

/** The security area opens on its first tab. */
export const SECURITY_HOME = '/admin/security/sessions';
