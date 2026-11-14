import {useEffect, useRef, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {bankTransferService, customerBillingService} from '@/api/billing/customer-billing.api';
import {sessionStore} from '@/lib/api/session';
import {realtimeWs, type RealtimeServerFrame} from '@/lib/realtime/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {billingKeys} from '@/shared/hooks/billing/query-keys';
import type {BankTransferInstructions} from '@/shared/types/billing/billing.types';
import type {Invoice, InvoiceStatus, PageResponse} from '@/shared/types/customer';

export interface InvoiceSettlementEvent {
    invoiceId: number;
    invoiceCode: string;
    status: string;
    timestamp: string;
}

let lastBillingFrame: RealtimeServerFrame | null = null;

/** Live WebSocket listener for INVOICE_UPDATED events so VietQR bank transfers settle immediately on iOS. */
export function useBillingRealtime(watchInvoiceId?: number) {
    const {user} = useAuth();
    const client = useQueryClient();
    const userId = user?.id;

    const [wsConnected, setWsConnected] = useState<boolean>(() => realtimeWs.isConnected());
    const [lastSettledInvoice, setLastSettledInvoice] = useState<InvoiceSettlementEvent | null>(null);

    useEffect(() => {
        realtimeWs.syncAccessToken(sessionStore.read()?.accessToken ?? null);
    }, [userId]);

    useEffect(() => {
        if (userId == null) return;

        const unsubStatus = realtimeWs.subscribeStatus(setWsConnected);
        const unsubFrames = realtimeWs.subscribe(frame => {
            if (frame.type !== 'INVOICE_UPDATED') return;

            if (
                frame.status === 'PAID' &&
                (watchInvoiceId === undefined || frame.invoiceId === watchInvoiceId)
            ) {
                setLastSettledInvoice({
                    invoiceId: frame.invoiceId,
                    invoiceCode: frame.invoiceCode,
                    status: frame.status,
                    timestamp: frame.timestamp,
                });
            }

            if (lastBillingFrame === frame) return;
            lastBillingFrame = frame;

            client.setQueryData<BankTransferInstructions>(
                billingKeys.customer(userId, 'bank-transfer', frame.invoiceId),
                prev => (prev ? {...prev, status: frame.status} : prev),
            );
            client.setQueryData<PageResponse<Invoice>>(
                billingKeys.customer(userId, 'invoices'),
                prev =>
                    prev
                        ? {
                              ...prev,
                              content: prev.content.map(inv =>
                                  inv.id === frame.invoiceId ? {...inv, status: frame.status as InvoiceStatus} : inv,
                              ),
                          }
                        : prev,
            );
            void client.invalidateQueries({queryKey: billingKeys.customer(userId)});
        });

        return () => {
            unsubFrames();
            unsubStatus();
        };
    }, [client, userId, watchInvoiceId]);

    return {wsConnected, lastSettledInvoice};
}

/** Quota, invoices, plans, and real-time payment settlement status of the signed-in customer. */
export function useBilling() {
    const {user} = useAuth();
    const enabled = !!user;
    const {wsConnected, lastSettledInvoice} = useBillingRealtime();
    return {
        quota: useQuery({queryKey: billingKeys.customer(user?.id, 'quota'), queryFn: ({signal}) => customerBillingService.quota(signal), enabled}),
        invoices: useQuery({queryKey: billingKeys.customer(user?.id, 'invoices'), queryFn: ({signal}) => customerBillingService.invoices(0, signal), enabled}),
        plans: useQuery({queryKey: billingKeys.customer(user?.id, 'plans'), queryFn: ({signal}) => customerBillingService.plans(signal), enabled}),
        wsConnected,
        lastSettledInvoice,
    };
}

export function useBankTransferInstructions(invoiceId: number) {
    const {user} = useAuth();
    const client = useQueryClient();
    const previous = useRef<{ invoiceId: number; status?: string }>({invoiceId});
    useBillingRealtime(invoiceId);
    const query = useQuery({
        queryKey: billingKeys.customer(user?.id, 'bank-transfer', invoiceId),
        queryFn: ({signal}) => bankTransferService.instructions(invoiceId, signal),
        enabled: !!user && Number.isSafeInteger(invoiceId) && invoiceId > 0,
        refetchInterval: q => (q.state.data?.status === 'PENDING' ? 5000 : false),
    });
    const status = query.data?.status;
    useEffect(() => {
        if (previous.current.invoiceId === invoiceId && previous.current.status === 'PENDING' && status === 'PAID') {
            void client.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
        }
        previous.current = {invoiceId, status};
    }, [client, invoiceId, status, user?.id]);
    return query;
}

export function useBillingActions() {
    const {user} = useAuth();
    const client = useQueryClient();
    const refresh = () => client.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
    return {
        refresh,
        subscribe: useMutation<Invoice | undefined, Error, string>({mutationFn: code => bankTransferService.subscribe(code), onSuccess: refresh, retry: false}),
        cancel: useMutation<Invoice, Error, number>({
            mutationFn: invoiceId => customerBillingService.cancel(invoiceId),
            onSuccess: refresh,
            retry: false,
        }),
        downloadReceipt: useMutation<string, Error, number>({
            mutationFn: (invoiceId: number) => customerBillingService.receiptDataUri(invoiceId),
            retry: false,
        }),
    };
}
