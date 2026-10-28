import {apiClient} from '@/lib/api';
import type {BackupStatus, DatabaseStatus, DeploymentInfo, EmailStatus, EmailTestResult, StorageStatus} from './types';

const BASE = '/api/v1/admin/infrastructure';

export const INFRASTRUCTURE_ROUTES = {
    deployment: `${BASE}/deployment`,
    backups: `${BASE}/backups`,
    storage: `${BASE}/storage`,
    database: `${BASE}/database`,
    email: `${BASE}/email`,
    emailTest: `${BASE}/email/test`,
} as const;

/** Read-only infrastructure views; the only POST sends a test email to the signed-in admin. */
export const infrastructureApi = {
    deployment: (signal?: AbortSignal) => apiClient.get<DeploymentInfo>(INFRASTRUCTURE_ROUTES.deployment, {signal}),
    backups: (signal?: AbortSignal) => apiClient.get<BackupStatus>(INFRASTRUCTURE_ROUTES.backups, {signal}),
    storage: (signal?: AbortSignal) => apiClient.get<StorageStatus>(INFRASTRUCTURE_ROUTES.storage, {signal}),
    database: (signal?: AbortSignal) => apiClient.get<DatabaseStatus>(INFRASTRUCTURE_ROUTES.database, {signal}),
    email: (signal?: AbortSignal) => apiClient.get<EmailStatus>(INFRASTRUCTURE_ROUTES.email, {signal}),
    sendTestEmail: () => apiClient.post<EmailTestResult>(INFRASTRUCTURE_ROUTES.emailTest),
};
