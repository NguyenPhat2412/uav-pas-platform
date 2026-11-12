import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {AdminAnalytics, SlaIntelligenceData} from '@/shared/types/admin';
import type {CustomerAnalytics, DashboardSummary} from '@/shared/types/dashboard/dashboard.types';

/**
 * Dashboard and operational intelligence endpoints for Customer and Operations portals.
 * All requests support AbortSignal cancellation for React Query lifecycle management.
 */
export const dashboardService = {
    /** Fetches platform-wide resource and fleet counters for the operations overview. */
    summary: (signal?: AbortSignal) =>
        apiClient.get<DashboardSummary>(API_ROUTES.dashboard.summary, {signal}),

    /** Fetches multi-day operations and revenue analytics for the specified window. */
    analytics: (days: number, signal?: AbortSignal) =>
        apiClient.get<AdminAnalytics>(API_ROUTES.dashboard.analytics(days), {signal}),

    /** Fetches monthly KPIs, quota usage, spend history, and mission pipeline for the signed-in customer. */
    customerAnalytics: (signal?: AbortSignal) =>
        apiClient.get<CustomerAnalytics>(API_ROUTES.dashboard.customerAnalytics, {signal}),

    /** Fetches operator SLA leaderboard, maintenance risk scores, and customer review metrics. */
    slaIntelligence: (signal?: AbortSignal) =>
        apiClient.get<SlaIntelligenceData>(API_ROUTES.admin.slaIntelligence, {signal}),
};
