import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {ServiceOffering, ServiceOfferingInput, ServiceOfferingUpdate} from '@/types/catalog/service-offering.types';

export const serviceOfferingsService = {
    /** Includes deactivated services; the customer catalog only ever sees active ones. */
    all: (signal?: AbortSignal) => apiClient.get<ServiceOffering[]>(API_ROUTES.uavServices.all, {signal}),
    create: (input: ServiceOfferingInput) => apiClient.post<ServiceOffering>(API_ROUTES.uavServices.list, input),
    update: (id: number, input: ServiceOfferingUpdate) =>
        apiClient.put<ServiceOffering>(API_ROUTES.uavServices.detail(id), input),
    setActive: (id: number, active: boolean) =>
        apiClient.patch<ServiceOffering>(API_ROUTES.uavServices.setActive(id, active)),
};
