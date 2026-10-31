import {apiClient, API_ROUTES} from '@/lib/api';
import type {SecretsOverview, SecurityActionResult, SecurityPolicy, SecuritySessionPage, SessionFilter} from '@/types/security/security.types';

const BASE = API_ROUTES.admin.security;

export const SESSION_PAGE_SIZE = 20;


export const securityService = {
    sessions: (filter: SessionFilter, signal?: AbortSignal) => {
        const params = new URLSearchParams({page: String(filter.page), size: String(SESSION_PAGE_SIZE)});
        if (filter.keyword) params.set('keyword', filter.keyword);
        if (filter.role) params.set('role', filter.role);
        if (filter.activeOnly) params.set('activeOnly', 'true');
        return apiClient.get<SecuritySessionPage>(`${BASE}/sessions?${params}`, {signal});
    },
    revokeUserSessions: (userId: number) =>
        apiClient.post<SecurityActionResult>(`${BASE}/users/${userId}/revoke-sessions`),
    revokeAllSessions: () => apiClient.post<SecurityActionResult>(`${BASE}/revoke-all-sessions`),
    resetTwoFactor: (userId: number, revokeSessions: boolean) =>
        apiClient.post<SecurityActionResult>(`${BASE}/users/${userId}/reset-2fa`, {revokeSessions}),
    policy: (signal?: AbortSignal) => apiClient.get<SecurityPolicy>(`${BASE}/policy`, {signal}),
    secrets: (signal?: AbortSignal) => apiClient.get<SecretsOverview>(`${BASE}/secrets`, {signal}),
};
