import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import {buildQueryString} from '@/lib/format';
import type {Invoice, PageResponse, ServicePlan} from '@/types';
import type {BankTransferInstructions, BankTransferStatus, CreateInvoiceInput, InvoiceFilters, PlanInput, PlanStats} from '@/features/billing/types/billing.types';

export const bankTransferService = {
    status: (signal?: AbortSignal) =>
        apiClient.get<BankTransferStatus>(API_ROUTES.billing.bankTransferStatus, {signal}),
    instructions: (invoiceId: number, signal?: AbortSignal) =>
        apiClient.get<BankTransferInstructions>(API_ROUTES.billing.bankTransferInstructions(invoiceId), {signal}),
    /** Returns the plan invoice to pay, or undefined (HTTP 204) when a free plan was applied immediately. */
    subscribe: (planCode: string) =>
        apiClient.post<Invoice | undefined>(API_ROUTES.billing.subscriptions, {planCode}),
    confirm: (invoiceId: number, bankReference: string) =>
        apiClient.post<Invoice>(API_ROUTES.billing.confirmPayment(invoiceId), {bankReference}),
};

export const invoicesService = {
    /** Managers receive every customer's invoices; the backend scopes others to their own. */
    page: (page: number, filters: InvoiceFilters, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?${buildQueryString({
            page,
            size: 20,
            status: filters.status || undefined,
            overdue: filters.overdue ? 'true' : undefined,
        })}`, {signal}),
    create: (input: CreateInvoiceInput) => apiClient.post<Invoice>(API_ROUTES.billing.invoices, input),
};

export const plansService = {
    /** Every plan including inactive ones; the public /billing/plans only lists active plans. */
    all: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.adminPlans, {signal}),
    create: (input: PlanInput) => apiClient.post<ServicePlan>(API_ROUTES.billing.adminPlans, input),
    update: (id: number, input: Omit<PlanInput, 'code'>) =>
        apiClient.put<ServicePlan>(API_ROUTES.billing.adminPlanById(id), input),
    setActive: (id: number, active: boolean) =>
        apiClient.patch<ServicePlan>(API_ROUTES.billing.adminPlanActive(id, active)),
    /** Subscribers, usage and revenue per plan; monthly covers the last `months` (1–24) months. */
    stats: (months: number, signal?: AbortSignal) =>
        apiClient.get<PlanStats>(API_ROUTES.billing.adminPlanStats(months), {signal}),
};
