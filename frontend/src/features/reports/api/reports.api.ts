import {apiClient, API_ROUTES} from '@/lib/api';
import type {OperationsReportData, PageResponse} from '@/types/admin';
import type {Mission} from '@/types/customer';

export const reportsService = {
    reportMissions: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?size=200`, {signal}),
    operationsReport: (signal?: AbortSignal) =>
        apiClient.get<OperationsReportData>(API_ROUTES.reports.operations, {signal}),
    exportOperationsCsv: (signal?: AbortSignal) =>
        apiClient.get<string>(API_ROUTES.reports.exportOperationsCsv, {signal}),
};
