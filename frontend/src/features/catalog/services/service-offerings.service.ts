import {apiClient} from '@/lib/api';
import type {ServiceOffering, ServiceOfferingInput} from '@/features/catalog/types/service-offering.types';

const base = '/api/v1/uav-services';

export const serviceOfferingsService = {
    /** Includes deactivated services; the customer catalog only ever sees active ones. */
    all: (signal?: AbortSignal) => apiClient.get<ServiceOffering[]>(`${base}/all`, {signal}),
    create: (input: ServiceOfferingInput) => apiClient.post<ServiceOffering>(base, input),
    update: (id: number, input: Omit<ServiceOfferingInput, 'code'>) => apiClient.put<ServiceOffering>(`${base}/${id}`, input),
    setActive: (id: number, active: boolean) => apiClient.patch<ServiceOffering>(`${base}/${id}/active?active=${active}`),
};
