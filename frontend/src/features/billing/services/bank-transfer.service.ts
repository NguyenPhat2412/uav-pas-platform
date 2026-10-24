import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {Invoice} from '@/types';
import type {BankTransferInstructions, BankTransferStatus} from '@/features/billing/types/billing.interface';

export type {BankTransferInstructions, BankTransferStatus};

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
