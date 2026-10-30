import {apiClient, API_ROUTES} from '@/lib/api';
import {buildQueryString} from '@/lib/format';
import type {PageResponse} from '@/types';

/** One payment/IPN record as returned by GET /api/v1/billing/admin/transactions. */
export interface AdminPaymentTransaction {
    id: number;
    transactionCode: string;
    gatewayName: string;
    amount: number;
    status: string;
    bankBin: string | null;
    bankAccountNumber: string | null;
    invoiceId: number | null;
    invoiceCode: string | null;
    invoiceStatus: string | null;
    invoiceAmount: number | null;
    userId: number | null;
    username: string | null;
    customerName: string | null;
    customerEmail: string | null;
    /** Provider callback with credential-like fields already masked by the backend. */
    rawCallback: string | null;
    createdAt: string | null;
    completedAt: string | null;
}

export interface TransactionFilters {
    status?: string;
    gateway?: string;
    from?: string;
    to?: string;
    invoiceId?: string;
    q?: string;
}

export interface FinancialOutboxEvent {
    id: string;
    eventType: string;
    invoiceId: number;
    userId: number;
    payload: string;
    status: string;
    attempts: number;
    notificationCreated: boolean;
    lastError: string | null;
    nextAttemptAt: string;
    createdAt: string;
    retryable: boolean;
}

export interface AdminBillingProfile {
    organizationName: string | null;
    taxCode: string | null;
    billingAddress: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    version: number;
    updatedAt: string | null;
}

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
};
