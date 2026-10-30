import {apiClient, API_ROUTES} from '@/lib/api';
import type {AuditLog, PageResponse, AuditFilters} from '@/types/admin';
import {buildQueryString as query} from '@/lib/format';

export const auditService = {
    audit: async (page = 0, size = 8, signal?: AbortSignal, filters: AuditFilters = {}) => {
        return apiClient.get<PageResponse<AuditLog>>(`${API_ROUTES.auditLogs.list}?${query({page, size, ...filters})}`, {signal});
    },
};
