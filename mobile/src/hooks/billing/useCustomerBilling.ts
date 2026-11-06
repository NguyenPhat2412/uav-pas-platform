import {useEffect, useRef} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {billingKeys} from '@/shared/hooks/billing/query-keys';
import {bankTransferService, customerBillingService} from '@/api/billing/customer-billing.api';
import {useAuth} from '@/providers/AuthContext';
import type {Invoice} from '@/shared/types/customer';

/** Quota, invoices and plans of the signed-in customer (same cache keys as the web billing page). */
export function useBilling() {
    const {user} = useAuth();
    const enabled = !!user;
    return {
        quota: useQuery({queryKey: billingKeys.customer(user?.id, 'quota'), queryFn: ({signal}) => customerBillingService.quota(signal), enabled}),
        invoices: useQuery({queryKey: billingKeys.customer(user?.id, 'invoices'), queryFn: ({signal}) => customerBillingService.invoices(0, signal), enabled}),
        plans: useQuery({queryKey: billingKeys.customer(user?.id, 'plans'), queryFn: ({signal}) => customerBillingService.plans(signal), enabled}),
    };
}

export function useBankTransferInstructions(invoiceId: number) {
    const {user} = useAuth();
    const client = useQueryClient();
    const previous = useRef<{ invoiceId: number; status?: string }>({invoiceId});
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
        downloadReceipt: useMutation<string, Error, number>({
            mutationFn: (invoiceId: number) => customerBillingService.receiptDataUri(invoiceId),
            retry: false,
        }),
    };
}
