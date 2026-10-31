import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {CustomerAnalytics, DashboardSummary} from '@/types/dashboard/dashboard.types';

export const dashboardService = {
    getSummary: () => apiClient.get<DashboardSummary>(API_ROUTES.dashboard.summary),
    getCustomerAnalytics: (signal?: AbortSignal) =>
        apiClient.get<CustomerAnalytics>(API_ROUTES.dashboard.customerAnalytics, {signal}),
};
