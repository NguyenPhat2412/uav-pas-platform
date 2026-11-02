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
    return useQuery({
        queryKey: billingKeys.customer(user?.id, 'bank-transfer', invoiceId),
        queryFn: ({signal}) => bankTransferService.instructions(invoiceId, signal),
        enabled: !!user && Number.isSafeInteger(invoiceId) && invoiceId > 0,
    });
}

export function useBillingActions() {
    const {user} = useAuth();
    const client = useQueryClient();
    const refresh = () => client.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
    return {
        subscribe: useMutation<Invoice | undefined, Error, string>({mutationFn: code => bankTransferService.subscribe(code), onSuccess: refresh, retry: false}),
        confirm: useMutation({
            mutationFn: ({invoiceId, reference}: { invoiceId: number; reference: string }) => bankTransferService.confirm(invoiceId, reference.trim()),
            onSuccess: refresh,
            retry: false,
        }),
    };
}
