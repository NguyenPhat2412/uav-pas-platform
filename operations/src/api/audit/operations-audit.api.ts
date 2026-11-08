import {apiClient, API_ROUTES} from '@/lib/api';
import type {AuditLog, PageResponse} from '@/types/resources';

export const operationsAuditService = {
    listAudit: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<AuditLog>>(`${API_ROUTES.auditLogs.list}?page=${page}&size=20`, {signal}),
};
