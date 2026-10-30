import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const billingKeys = {
    /** Everything the finance console caches; confirming a payment refreshes all of it. */
    admin: (userId: UserId) => queryKeys.of(userId, 'billing-admin'),
    /** Prefix of the active plans, every plan and the plan statistics. */
    plans: (userId: UserId) => queryKeys.of(userId, 'billing-admin', 'plans'),
    allPlans: (userId: UserId) => queryKeys.of(userId, 'billing-admin', 'plans', 'all'),
    planStats: (userId: UserId, months: number) => queryKeys.of(userId, 'billing-admin', 'plans', 'stats', months),
    quotas: (userId: UserId) => queryKeys.of(userId, 'billing-admin', 'quotas'),
    invoices: (userId: UserId, ...filters: unknown[]) => queryKeys.of(userId, 'billing-admin', 'invoices', ...filters),
    outbox: (userId: UserId, ...filters: unknown[]) => queryKeys.of(userId, 'billing-admin', 'outbox', ...filters),
    transactions: (userId: UserId, ...filters: unknown[]) => queryKeys.of(userId, 'billing-admin', 'transactions', ...filters),
    customerSearch: (userId: UserId, keyword: string) => queryKeys.of(userId, 'billing-admin', 'customers', keyword),
    userProfile: (userId: UserId, customerId: number) => queryKeys.of(userId, 'billing-admin', 'billing-profile', customerId),
    /** The signed-in customer's own billing (quota, invoices, plans, bank transfer). */
    customer: (userId: UserId, ...parts: unknown[]) => queryKeys.of(userId, 'customer', 'billing', ...parts),
};
