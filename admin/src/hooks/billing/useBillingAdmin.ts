'use client';

import {useEffect, useState} from 'react';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, QUIET, type MutationOptions} from '@/lib/query';
import {adminRealtimeClient} from '@/lib/realtime-ws';
import {bankTransferService, invoicesService, plansService} from '@/api/billing/billing.api';
import {billingAdminService} from '@/api/billing/billing-admin.api';
import {triggerReceiptDownload} from '@/utils/billing/receipt-download';
import type {
    FinancialOutboxEvent,
    PaymentGatewayConfig,
    PaymentGatewayConfigInput,
    TransactionFilters,
} from '@/types/billing/billing-admin.types';
import {quotasService} from '@/api/billing/quotas.api';
import {usersService} from '@/api/user/users.api';
import {billingKeys} from '@/hooks/billing/query-keys';
import type {InvoiceFilters, PlanInput} from '@/types/billing/billing.types';
import type {Invoice} from '@/types';

/** Subscribes finance workspaces to real-time INVOICE_UPDATED WebSocket events. */
export function useAdminBillingRealtime(enabled = true) {
    const {user} = useAuth();
    const client = useQueryClient();
    const active = Boolean(user) && enabled;
    const [wsConnected, setWsConnected] = useState<boolean>(() => adminRealtimeClient.isConnected());

    useEffect(() => {
        if (!active) return;
        const unsubStatus = adminRealtimeClient.subscribeStatus(setWsConnected);
        const unsubFrames = adminRealtimeClient.subscribeFrames(frame => {
            if (frame.type === 'INVOICE_UPDATED') {
                void client.invalidateQueries({queryKey: billingKeys.admin(user?.id)});
            }
        });
        return () => {
            unsubStatus();
            unsubFrames();
        };
    }, [active, client, user?.id]);

    return {wsConnected};
}

/** VietQR receiving account & automated SePay/IPN webhook readiness snapshot. */
export function usePaymentGatewayConfig(enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: billingKeys.paymentGateway(user?.id),
        queryFn: ({signal}) => billingAdminService.paymentGateway(signal),
        enabled: Boolean(user) && permissionsReady && can('USER_MANAGE') && enabled,
    });
}

export function useUpdatePaymentGatewayConfig(
    options?: MutationOptions<PaymentGatewayConfig, PaymentGatewayConfigInput>,
) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        ...options,
        mutationFn: billingAdminService.updatePaymentGateway,
        onSuccess: afterSuccess(options, updated => {
            client.setQueryData(billingKeys.paymentGateway(user?.id), updated);
            void client.invalidateQueries({queryKey: billingKeys.admin(user?.id)});
            void client.invalidateQueries({predicate: q => q.queryKey.includes('settings')});
        }),
    });
}

/** Active plans offered to customers. */
export function useBillingPlans() {
    const {user} = useAuth();
    return useQuery({queryKey: billingKeys.plans(user?.id), queryFn: ({signal}) => quotasService.billingPlans(signal)});
}

/** Every plan including inactive ones. */
export function useAllPlans() {
    const {user} = useAuth();
    return useQuery({queryKey: billingKeys.allPlans(user?.id), queryFn: ({signal}) => plansService.all(signal)});
}

/** Subscribers, usage and revenue per plan over the last `months` months; keeps the previous range while loading. */
export function usePlanStats(months: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.planStats(user?.id, months),
        queryFn: ({signal}) => plansService.stats(months, signal),
        placeholderData: keepPreviousData,
    });
}

function useRefreshPlans() {
    const client = useQueryClient();
    const {user} = useAuth();
    return () => client.invalidateQueries({queryKey: billingKeys.plans(user?.id)});
}

export function usePlanMutations() {
    const refreshPlans = useRefreshPlans();
    const toggle = useMutation({
        mutationFn: ({id, active}: { id: number; active: boolean }) => plansService.setActive(id, active),
        onSuccess: refreshPlans,
    });
    /** Updates when `id` is given, otherwise creates; the caller refreshes the list after closing its dialog. */
    const save = useMutation({
        mutationFn: ({id, body}: { id?: number; body: PlanInput }) => {
            if (id == null) return plansService.create(body);
            const changes: Omit<PlanInput, 'code'> & { code?: string } = {...body};
            delete changes.code; // The code is fixed once a plan exists.
            return plansService.update(id, changes);
        },
    });
    return {toggle, save, refreshPlans};
}

export function useUserQuotas() {
    const {user} = useAuth();
    return useQuery({queryKey: billingKeys.quotas(user?.id), queryFn: ({signal}) => quotasService.billingQuotas(0, signal)});
}

export function useUpdateQuota() {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        mutationFn: ({userId, planCode, flightHoursLimit}: { userId: number; planCode: string; flightHoursLimit: number }) =>
            quotasService.updateQuota(userId, {planCode, flightHoursLimit}),
        onSuccess: () => client.invalidateQueries({queryKey: billingKeys.quotas(user?.id)}),
    });
}

/** Managers see every customer's invoices; the backend scopes everyone else to their own. */
export function useAdminInvoices(page: number, filters: InvoiceFilters) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.invoices(user?.id, filters, page),
        queryFn: ({signal}) => invoicesService.page(page, filters, signal),
    });
}

export function useCreateInvoice() {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        mutationFn: invoicesService.create,
        onSuccess: () => client.invalidateQueries({queryKey: billingKeys.invoices(user?.id)}),
    });
}

/** Records a bank transfer against an invoice, then refreshes the whole finance console. */
export function useConfirmBankTransfer(options?: MutationOptions<Invoice, { id: number; reference: string }>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        ...options,
        mutationFn: ({id, reference}: { id: number; reference: string }) => bankTransferService.confirm(id, reference),
        onSuccess: afterSuccess(options, () => void client.invalidateQueries({queryKey: billingKeys.admin(user?.id)})),
    });
}

/** Customer lookup for a new invoice; searches from two characters and stops once one is chosen. */
export function useInvoiceCustomerSearch(keyword: string, enabled: boolean) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.customerSearch(user?.id, keyword),
        queryFn: ({signal}) => usersService.users(0, keyword, undefined, signal, undefined, 8),
        enabled: enabled && keyword.trim().length >= 2,
    });
}

export function useBillingOutbox(page: number, status: string | undefined) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.outbox(user?.id, status ?? 'ALL', page),
        queryFn: ({signal}) => billingAdminService.outbox(page, status, signal),
    });
}

export function useRetryOutbox(options?: MutationOptions<FinancialOutboxEvent, string>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        ...options,
        mutationFn: billingAdminService.retryOutbox,
        onSuccess: afterSuccess(options, () => void client.invalidateQueries({queryKey: billingKeys.outbox(user?.id)})),
    });
}

export function useBillingTransactions(page: number, filters: TransactionFilters) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.transactions(user?.id, filters, page),
        queryFn: ({signal}) => billingAdminService.transactions(page, filters, signal),
    });
}

export function useUserBillingProfile(customerId: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.userProfile(user?.id, customerId),
        queryFn: ({signal}) => billingAdminService.userBillingProfile(customerId, signal),
    });
}

/** Downloads any customer's invoice or payment receipt PDF from the admin console. */
export function useDownloadAdminInvoiceReceipt(options?: MutationOptions<Blob, { id: number; code: string }>) {
    return useMutation<Blob, Error, { id: number; code: string }>({
        meta: options?.onError ? QUIET : undefined,
        ...options,
        mutationFn: ({id}) => billingAdminService.downloadReceipt(id),
        onSuccess: afterSuccess(options, (blob, {code}) => triggerReceiptDownload(blob, code)),
        retry: false,
    });
}
