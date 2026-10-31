import {apiClient, API_ROUTES} from '@/lib/api';
import type {Invoice, PageResponse, ServicePlan, UserQuota} from '@/types/customer';

export const customerBillingService = {
    quota: (signal?: AbortSignal) => apiClient.get<UserQuota>(API_ROUTES.billing.subscription, {signal}),
    plans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, {signal}),
    invoices: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?page=${page}&size=20`, {signal}),
    payInvoice: (id: number) => apiClient.post(API_ROUTES.billing.payInvoice(id)),
};
