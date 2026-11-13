'use client';

import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {ApiError} from '@/lib/api';
import {
    acquireRealtimeConnection,
    getRealtimeStatus,
    subscribeRealtimeEvents,
    subscribeRealtimeStatus,
} from '@/lib/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, QUIET, type MutationOptions} from '@/lib/query';
import {customerBillingService} from '@/api/billing/customer-billing.api';
import {bankTransferService} from '@/api/billing/billing.api';
import {billingKeys} from '@/hooks/billing/query-keys';
import {triggerReceiptDownload} from '@/utils/billing/receipt-download';
import type {Invoice, InvoiceStatus, PageResponse} from '@/types';
import type {BankTransferInstructions, SettledInvoiceEvent} from '@/types/billing/billing.types';

const getServerRealtimeStatus = () => 'disconnected' as const;

export function isBankTransferUnconfiguredError(error: unknown): boolean {
    if (error instanceof ApiError) {
        return (
            error.status === 503 ||
            error.code === 'BANK_TRANSFER_NOT_CONFIGURED' ||
            /not configured|chưa cấu hình/i.test(error.message)
        );
    }
    return false;
}

/**
 * Connects to `/api/v1/ws/realtime` as the authenticated customer and reacts immediately to `INVOICE_UPDATED`,
 * updating cached invoice/VietQR state in 0ms and invalidating billing summary/quota/invoices queries.
 */
export function useCustomerBillingRealtime(enabled = true) {
    const {user} = useAuth();
    const client = useQueryClient();
    const userId = user?.id;
    const realtimeStatus = useSyncExternalStore(
        subscribeRealtimeStatus,
        getRealtimeStatus,
        getServerRealtimeStatus,
    );
    const [lastSettledInvoice, setLastSettledInvoice] = useState<SettledInvoiceEvent | null>(null);

    useEffect(() => {
        if (!userId || !enabled) return;

        const release = acquireRealtimeConnection({authenticated: true});
        const unsubscribe = subscribeRealtimeEvents((frame) => {
            if (frame.type !== 'INVOICE_UPDATED') return;

            client.setQueryData<BankTransferInstructions | undefined>(
                billingKeys.customer(userId, 'bank-transfer', frame.invoiceId),
                (prev) => (prev ? {...prev, status: frame.status} : prev),
            );

            client.setQueryData<PageResponse<Invoice> | undefined>(
                billingKeys.customer(userId, 'invoices'),
                (prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        content: prev.content.map((inv) =>
                            inv.id === frame.invoiceId
                                ? {
                                      ...inv,
                                      status: frame.status as InvoiceStatus,
                                      paidAt: frame.status === 'PAID' ? inv.paidAt ?? frame.timestamp : inv.paidAt,
                                  }
                                : inv,
                        ),
                    };
                },
            );

            void client.invalidateQueries({queryKey: billingKeys.customer(userId)});

            setLastSettledInvoice({
                invoiceId: frame.invoiceId,
                invoiceCode: frame.invoiceCode,
                status: frame.status,
                timestamp: frame.timestamp,
            });
        });

        return () => {
            unsubscribe();
            release();
        };
    }, [client, enabled, userId]);

    const wsConnected = Boolean(userId) && enabled && realtimeStatus === 'connected';
    return {
        wsConnected,
        lastSettledInvoice: userId ? lastSettledInvoice : null,
    };
}

/** The signed-in customer's quota, invoices and the plans they can switch to. */
export function useBilling() {
    const {user} = useAuth();
    const quota = useQuery({
        queryKey: billingKeys.customer(user?.id, 'quota'),
        queryFn: ({signal}) => customerBillingService.quota(signal),
        enabled: !!user,
    });
    const invoices = useQuery({
        queryKey: billingKeys.customer(user?.id, 'invoices'),
        queryFn: ({signal}) => customerBillingService.invoices(0, signal),
        enabled: !!user,
    });
    const plans = useQuery({
        queryKey: billingKeys.customer(user?.id, 'plans'),
        queryFn: ({signal}) => customerBillingService.plans(signal),
        enabled: !!user,
    });
    const pay = useMutation({mutationFn: (id: number) => customerBillingService.payInvoice(id), retry: false});
    return {quota, invoices, plans, pay};
}

export function useRefreshCustomerBilling() {
    const client = useQueryClient();
    const {user} = useAuth();
    return () => client.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
}

/** Whether bank transfer (VietQR / NAPAS 247) is configured. */
export function useBankTransferStatus() {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.customer(user?.id, 'bank-transfer'),
        queryFn: ({signal}) => bankTransferService.status(signal),
        enabled: !!user,
    });
}

export function useBankTransferInstructions(invoiceId: number, transferConfigured = true) {
    const {user} = useAuth();
    const client = useQueryClient();
    const realtime = useCustomerBillingRealtime(Boolean(invoiceId));
    const previous = useRef<{invoiceId: number; status?: string}>({invoiceId});

    const query = useQuery({
        queryKey: billingKeys.customer(user?.id, 'bank-transfer', invoiceId),
        queryFn: ({signal}) => bankTransferService.instructions(invoiceId, signal),
        enabled: Boolean(user) && Boolean(invoiceId) && transferConfigured,
        retry: (failureCount, error) =>
            !isBankTransferUnconfiguredError(error) &&
            !(error instanceof ApiError && error.status === 404) &&
            failureCount < 2,
        refetchInterval: (q) => {
            if (q.state.data?.status !== 'PENDING') return false;
            return realtime.wsConnected ? 15_000 : 5_000;
        },
    });

    const settledMatch =
        realtime.lastSettledInvoice?.invoiceId === invoiceId ? realtime.lastSettledInvoice : null;
    const status = settledMatch?.status === 'PAID' ? 'PAID' : query.data?.status;

    useEffect(() => {
        if (previous.current.invoiceId === invoiceId && previous.current.status === 'PENDING' && status === 'PAID') {
            void client.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
        }
        previous.current = {invoiceId, status};
    }, [client, invoiceId, status, user?.id]);

    return {
        ...query,
        wsConnected: realtime.wsConnected,
        lastSettledInvoice: realtime.lastSettledInvoice,
    };
}

/** Subscribes to a plan: resolves to the plan invoice to pay, or undefined when a free plan applied at once. */
export function useSubscribePlan(options?: MutationOptions<Invoice | undefined, string>) {
    const refresh = useRefreshCustomerBilling();
    return useMutation<Invoice | undefined, Error, string>({
        ...options,
        mutationFn: (code: string) => bankTransferService.subscribe(code),
        onSuccess: afterSuccess(options, refresh),
    });
}

/** Downloads an invoice or payment receipt PDF and saves it in the browser. */
export function useDownloadInvoiceReceipt(options?: MutationOptions<Blob, {id: number; code: string}>) {
    return useMutation<Blob, Error, {id: number; code: string}>({
        meta: options?.onError ? QUIET : undefined,
        ...options,
        mutationFn: ({id}) => customerBillingService.downloadReceipt(id),
        onSuccess: afterSuccess(options, (blob, {code}) => triggerReceiptDownload(blob, code)),
        retry: false,
    });
}
