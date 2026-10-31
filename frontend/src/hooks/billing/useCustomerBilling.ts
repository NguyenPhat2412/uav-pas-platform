'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, type MutationOptions} from '@/lib/query';
import {customerBillingService} from '@/api/billing/customer-billing.api';
import {bankTransferService} from '@/api/billing/billing.api';
import {billingKeys} from '@/hooks/billing/query-keys';
import type {Invoice} from '@/types';

/** The signed-in customer's quota, invoices and the plans they can switch to. */
export function useBilling() {
    const {user} = useAuth();
    const quota = useQuery({
        queryKey: billingKeys.customer(user?.id, 'quota'),
        queryFn: ({signal}) => customerBillingService.quota(signal),
        enabled: !!user
    });
    const invoices = useQuery({
        queryKey: billingKeys.customer(user?.id, 'invoices'),
        queryFn: ({signal}) => customerBillingService.invoices(0, signal),
        enabled: !!user
    });
    const plans = useQuery({
        queryKey: billingKeys.customer(user?.id, 'plans'),
        queryFn: ({signal}) => customerBillingService.plans(signal),
        enabled: !!user
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
    return useQuery({queryKey: billingKeys.customer(user?.id, 'bank-transfer'), queryFn: ({signal}) => bankTransferService.status(signal)});
}

export function useBankTransferInstructions(invoiceId: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: billingKeys.customer(user?.id, 'bank-transfer', invoiceId),
        queryFn: ({signal}) => bankTransferService.instructions(invoiceId, signal),
    });
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
