import {apiClient, API_ROUTES} from '@/lib/api';
import {buildQueryString} from '@/lib/format';
import type {PageResponse} from '@/types';
import type {
    AdminOtpToken,
    BackupStatus,
    DatabaseStatus,
    DeploymentInfo,
    EmailStatus,
    EmailTestResult,
    MailOtpSettings,
    MailOtpSettingsUpdatePayload,
    OtpSupportActionResult,
    OtpTokenFilters,
    StorageStatus,
} from '@/types/infrastructure.types';

const BASE = API_ROUTES.admin.infrastructure;

export const INFRASTRUCTURE_ROUTES = {
    deployment: `${BASE}/deployment`,
    backups: `${BASE}/backups`,
    storage: `${BASE}/storage`,
    database: `${BASE}/database`,
    email: `${BASE}/email`,
    emailTest: `${BASE}/email/test`,
    mailOtpSettings: API_ROUTES.admin.infrastructureMailOtpSettings,
    otpTokens: API_ROUTES.admin.infrastructureOtpTokens,
    otpTokenInvalidate: API_ROUTES.admin.infrastructureOtpTokenInvalidate,
    otpSendReset: API_ROUTES.admin.infrastructureOtpSendReset,
    otpClearRateLimit: API_ROUTES.admin.infrastructureOtpClearRateLimit,
} as const;

export const infrastructureService = {
    deployment: (signal?: AbortSignal) => apiClient.get<DeploymentInfo>(INFRASTRUCTURE_ROUTES.deployment, {signal}),
    backups: (signal?: AbortSignal) => apiClient.get<BackupStatus>(INFRASTRUCTURE_ROUTES.backups, {signal}),
    storage: (signal?: AbortSignal) => apiClient.get<StorageStatus>(INFRASTRUCTURE_ROUTES.storage, {signal}),
    database: (signal?: AbortSignal) => apiClient.get<DatabaseStatus>(INFRASTRUCTURE_ROUTES.database, {signal}),
    email: (signal?: AbortSignal) => apiClient.get<EmailStatus>(INFRASTRUCTURE_ROUTES.email, {signal}),
    sendTestEmail: () => apiClient.post<EmailTestResult>(INFRASTRUCTURE_ROUTES.emailTest),
    mailOtpSettings: (signal?: AbortSignal) =>
        apiClient.get<MailOtpSettings>(INFRASTRUCTURE_ROUTES.mailOtpSettings, {signal}),
    updateMailOtpSettings: (body: MailOtpSettingsUpdatePayload) =>
        apiClient.put<MailOtpSettings>(INFRASTRUCTURE_ROUTES.mailOtpSettings, body),
    otpTokens: (page: number, filters: OtpTokenFilters, signal?: AbortSignal) =>
        apiClient.get<PageResponse<AdminOtpToken>>(`${INFRASTRUCTURE_ROUTES.otpTokens}?${buildQueryString({
            page,
            size: 15,
            purpose: filters.purpose && filters.purpose !== 'ALL' ? filters.purpose : undefined,
            status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
            q: filters.q?.trim() || undefined,
        })}`, {signal}),
    invalidateOtpToken: (id: number) =>
        apiClient.post<AdminOtpToken | void>(INFRASTRUCTURE_ROUTES.otpTokenInvalidate(id)),
    sendResetOtp: (email: string) =>
        apiClient.post<OtpSupportActionResult>(INFRASTRUCTURE_ROUTES.otpSendReset, {email: email.trim()}),
    clearOtpRateLimit: (email: string) =>
        apiClient.post<OtpSupportActionResult>(INFRASTRUCTURE_ROUTES.otpClearRateLimit, {email: email.trim()}),
};
