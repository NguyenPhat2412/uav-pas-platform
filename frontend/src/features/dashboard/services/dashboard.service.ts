import {apiClient} from '@/lib/api';
import type {CustomerAnalytics, DashboardSummary} from "@/features/dashboard/types/dashboard.types";

export const dashboardService = {
    getSummary: () => apiClient.get<DashboardSummary>('/api/v1/dashboard/summary'),
    getCustomerAnalytics: (signal?: AbortSignal) => apiClient.get<CustomerAnalytics>('/api/v1/dashboard/customer-analytics', {signal}),
};
