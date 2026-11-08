import {apiClient, API_ROUTES} from '@/lib/api';
import type {DashboardSummary, PageResponse, AdminAnalytics} from '@/types/admin';
import type {Mission} from '@/types/customer';

export const adminDashboardService = {
    pendingMissions: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?status=PENDING_CONFIRMATION&size=5`, {signal}),
    dashboard: async (signal?: AbortSignal) => {
        return apiClient.get<DashboardSummary>(API_ROUTES.dashboard.summary, {signal});
    },
    analytics: (days: number, signal?: AbortSignal) =>
        apiClient.get<AdminAnalytics>(API_ROUTES.dashboard.analytics(days), {signal}),
};
