import {apiClient, API_ROUTES, fetchApiBase64DataUri} from '@/lib/api/client';
import type {Invoice, PageResponse, ServicePlan, UserQuota} from '@/shared/types/customer';
import type {BankTransferInstructions, BankTransferStatus} from '@/shared/types/billing/billing.types';

export const customerBillingService = {
    quota: (signal?: AbortSignal) => apiClient.get<UserQuota>(API_ROUTES.billing.subscription, {signal}),
    plans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, {signal}),
    invoices: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?page=${page}&size=20`, {signal}),
    receiptDataUri: (invoiceId: number, signal?: AbortSignal) =>
        fetchApiBase64DataUri(API_ROUTES.billing.invoiceReceipt(invoiceId), 'application/pdf', signal),
};

/** VietQR / NAPAS 247 transfers: bank webhook reconciles automatically once the transfer note matches. */
export const bankTransferService = {
    status: (signal?: AbortSignal) => apiClient.get<BankTransferStatus>(API_ROUTES.billing.bankTransferStatus, {signal}),
    instructions: (invoiceId: number, signal?: AbortSignal) =>
        apiClient.get<BankTransferInstructions>(API_ROUTES.billing.bankTransferInstructions(invoiceId), {signal}),
    /** The plan invoice to pay, or undefined (HTTP 204) when a free plan applied at once. */
    subscribe: (planCode: string) => apiClient.post<Invoice | undefined>(API_ROUTES.billing.subscriptions, {planCode}),
};
