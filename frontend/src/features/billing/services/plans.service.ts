import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {ServicePlan} from '@/types';
import type {PlanInput} from '@/features/billing/types/billing.interface';

export type {PlanInput};

export const plansService = {
    /** Every plan including inactive ones; the public /billing/plans only lists active plans. */
    all: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.adminPlans, {signal}),
    create: (input: PlanInput) => apiClient.post<ServicePlan>(API_ROUTES.billing.adminPlans, input),
    update: (id: number, input: Omit<PlanInput, 'code'>) =>
        apiClient.put<ServicePlan>(API_ROUTES.billing.adminPlanById(id), input),
    setActive: (id: number, active: boolean) =>
        apiClient.patch<ServicePlan>(API_ROUTES.billing.adminPlanActive(id, active)),
};
