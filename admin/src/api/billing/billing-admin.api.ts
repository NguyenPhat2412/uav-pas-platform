import {apiClient, API_ROUTES} from '@/lib/api';
import {buildQueryString} from '@/lib/format';
import type {PageResponse} from '@/types';
import type {AdminPaymentTransaction, TransactionFilters, FinancialOutboxEvent, AdminBillingProfile} from '@/types/billing/billing-admin.types';

const BASE = API_ROUTES.billing.admin;

export const billingAdminService = {
    transactions: (page: number, filters: TransactionFilters, signal?: AbortSignal) =>
        apiClient.get<PageResponse<AdminPaymentTransaction>>(`${BASE}/transactions?${buildQueryString({
            page,
            size: 20,
            status: filters.status,
            gateway: filters.gateway,
            from: filters.from,
            to: filters.to,
            invoiceId: filters.invoiceId?.trim(),
            q: filters.q?.trim(),
        })}`, {signal}),
    outbox: (page: number, status: string | undefined, signal?: AbortSignal) =>
        apiClient.get<PageResponse<FinancialOutboxEvent>>(`${BASE}/outbox?${buildQueryString({page, size: 20, status})}`, {signal}),
    retryOutbox: (id: string) =>
        apiClient.post<FinancialOutboxEvent>(`${BASE}/outbox/${encodeURIComponent(id)}/retry`),
    userBillingProfile: (userId: number, signal?: AbortSignal) =>
        apiClient.get<AdminBillingProfile>(API_ROUTES.admin.userBillingProfile(userId), {signal}),
    downloadReceipt: (id: number) => apiClient.getBlob(API_ROUTES.billing.invoiceReceipt(id)),
};
