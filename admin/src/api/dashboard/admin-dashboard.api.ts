import {apiClient, API_ROUTES} from '@/lib/api';
import type {DashboardSummary, PageResponse, AdminAnalytics} from '@/types/admin';
import type {Mission} from '@/types/customer';
import type {PaymentStatistics} from '@/types/billing/billing-admin.types';

export const adminDashboardService = {
    pendingMissions: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?status=PENDING_CONFIRMATION&size=5`, {signal}),
    dashboard: async (signal?: AbortSignal) => {
        return apiClient.get<DashboardSummary>(API_ROUTES.dashboard.summary, {signal});
    },
    analytics: (days: number, signal?: AbortSignal) =>
        apiClient.get<AdminAnalytics>(API_ROUTES.dashboard.analytics(days), {signal}),
    /** Payment, revenue and spending figures for the inclusive day range. */
    paymentStatistics: (from: string, to: string, signal?: AbortSignal) =>
        apiClient.get<PaymentStatistics>(
            `${API_ROUTES.billing.admin}/statistics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            {signal},
        ),
};
