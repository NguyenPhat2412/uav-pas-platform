import {apiClient, API_ROUTES} from '@/lib/api';
import type {PageResponse, ServicePlan, UserQuota} from '@/types/admin';
import {buildQueryString as query} from '@/lib/format';

export const quotasService = {
    billingPlans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, {signal}),
    billingQuotas: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<UserQuota>>(`${API_ROUTES.billing.adminQuotas}?${query({page, size: 20})}`, {signal}),
    updateQuota: (userId: number, data: { planCode: string; flightHoursLimit: number }) =>
        apiClient.put<UserQuota>(API_ROUTES.billing.adminQuotaByUser(userId), data),
};
