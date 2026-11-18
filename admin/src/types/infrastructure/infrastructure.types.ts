/** Admin > Infrastructure DTOs (backend modules/infrastructure). Values are counts, sizes, versions and flags only. */

export type TlsStatus = 'OK' | 'EXPIRING' | 'EXPIRED' | 'NOT_HTTPS' | 'NOT_CONFIGURED' | 'UNREACHABLE';

export interface TlsCertificateInfo {
    status: TlsStatus;
    notAfter: string | null;
    daysLeft: number | null;
    issuer: string | null;
    trusted: boolean | null;
    checkedAt: string;
    errorClass: string | null;
}

export interface DeploymentInfo {
    version: string;
    gitCommit: string;
    buildTime: string;
    activeProfiles: string[];
    javaVersion: string;
    javaVendor: string;
    startedAt: string;
    uptimeSeconds: number;
    timeZone: string;
    serverTime: string;
    publicUrl: string | null;
    flywayVersion: string | null;
    migrations: {
        version: string | null;
        description: string;
        installedOn: string | null;
        executionTimeMs: number | null;
        success: boolean;
    }[];
    tls: TlsCertificateInfo;
}

export type BackupState = 'OK' | 'STALE' | 'MISSING' | 'NOT_CONFIGURED';

export interface BackupStatus {
    status: BackupState;
    lastSuccessAt: string | null;
    hoursSinceLastSuccess: number | null;
    staleAfterHours: number;
    fileCount: number;
    totalBytes: number;
    files: { name: string; sizeBytes: number; modifiedAt: string }[];
    offsiteTarget: string;
    checkedAt: string;
}

export interface StorageStatus {
    provider: string;
    reachable: 'UP' | 'DOWN' | 'UNKNOWN';
    objectCount: number | null;
    totalBytes: number | null;
    usageTruncated: boolean | null;
    usageCheckedAt: string | null;
    usageError: string | null;
    media: {
        confirmed: number;
        confirmedBytes: number;
        awaitingUpload: number;
        expiredUploads: number;
        pendingCleanup: number;
        cleanupOverdue: number;
        cleanupRetrying: number;
        purged: number;
    };
}

export interface DatabaseStatus {
    version: string;
    sizeBytes: number;
    connections: { active: number; idle: number; idleInTransaction: number; total: number; max: number };
    largestTables: { name: string; totalBytes: number; rowEstimate: number }[];
    pool: { active: number; idle: number; total: number; threadsAwaiting: number; maximumPoolSize: number } | null;
}

export interface MailConnectionCheck {
    status: 'UP' | 'DOWN' | 'DISABLED' | 'UNKNOWN';
    checkedAt: string | null;
    errorClass: string | null;
}

export interface EmailStatus {
    enabled: boolean;
    senderAvailable: boolean;
    hostConfigured: boolean;
    usernameConfigured: boolean;
    port: number | null;
    fromAddress: string;
    testRecipient: string | null;
    testCooldownSeconds: number;
    connection: MailConnectionCheck;
}

export interface EmailTestResult {
    success: boolean;
    errorClass: string | null;
    recipient: string;
    attemptedAt: string;
}

export interface MailOtpSettings {
    mailEnabled: boolean;
    smtpHost: string;
    smtpPort: number | null;
    smtpUsername: string;
    fromAddress: string;
    senderDisplayName: string | null;
    smtpAuth: boolean;
    smtpStarttls: boolean;
    passwordConfigured: boolean;
    passwordSource: 'DATABASE' | 'ENV' | 'NONE';
    passwordHint: string | null;
    hasDatabaseOverride: boolean;
    otpTtlMinutes: number;
    resendCooldownSeconds: number;
    maxOtpAttempts: number;
    otpPerAccount: number;
    otpPerIp: number;
    maxEmailsPerMinute: number;
    updatedAt: string | null;
    updatedBy: string | null;
    connection: MailConnectionCheck;
}

export interface MailOtpSettingsUpdatePayload {
    mailEnabled: boolean;
    smtpHost: string;
    smtpPort: number | null;
    smtpUsername: string;
    smtpPassword?: string;
    resetToEnvDefaults?: boolean;
    fromAddress: string;
    senderDisplayName: string | null;
    smtpAuth: boolean;
    smtpStarttls: boolean;
    otpTtlMinutes: number;
    resendCooldownSeconds: number;
    maxOtpAttempts: number;
    otpPerAccount: number;
    otpPerIp: number;
    maxEmailsPerMinute: number;
}

export type OtpTokenPurpose = 'PASSWORD_RESET' | 'REGISTER_VERIFY' | 'LOGIN_2FA' | 'ENABLE_2FA_EMAIL' | string;
export type OtpTokenStatus = 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'LOCKED' | string;

export interface AdminOtpToken {
    id: number;
    userId: number | null;
    username: string | null;
    email: string;
    purpose: OtpTokenPurpose;
    attempts: number;
    maxAttempts: number;
    status: OtpTokenStatus;
    createdAt: string;
    expiresAt: string;
    consumedAt: string | null;
}

export interface OtpTokenFilters {
    purpose?: string;
    status?: string;
    q?: string;
}

export interface OtpSupportActionResult {
    email: string;
    action: string;
    message: string;
    processedAt: string;
}
