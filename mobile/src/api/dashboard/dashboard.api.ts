import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {CustomerAnalytics} from '@/shared/types/dashboard/dashboard.types';

export const dashboardService = {
    customerAnalytics: (signal?: AbortSignal) => apiClient.get<CustomerAnalytics>(API_ROUTES.dashboard.customerAnalytics, {signal}),
};
