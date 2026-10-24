import {apiClient} from '@/lib/api';
import type {ServicePlan} from '@/types';

export type PlanInput = Omit<ServicePlan, 'id' | 'active'>;

const base = '/api/v1/billing/admin/plans';

export const plansService = {
    /** Every plan including inactive ones; the public /billing/plans only lists active plans. */
    all: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(base, {signal}),
    create: (input: PlanInput) => apiClient.post<ServicePlan>(base, input),
    update: (id: number, input: Omit<PlanInput, 'code'>) => apiClient.put<ServicePlan>(`${base}/${id}`, input),
    setActive: (id: number, active: boolean) => apiClient.patch<ServicePlan>(`${base}/${id}/active?active=${active}`),
};
