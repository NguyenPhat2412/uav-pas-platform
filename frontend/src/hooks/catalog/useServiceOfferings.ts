'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {serviceOfferingsService} from '@/api/catalog/service-offerings.api';
import type {ServiceOfferingUpdate} from '@/types/catalog/service-offering.types';

const catalogKeys = {
    admin: (userId: number | undefined) => queryKeys.of(userId, 'admin-services'),
};

/** Every service including deactivated ones; the customer catalog only ever sees active ones. */
export function useAdminServiceOfferings() {
    const {user} = useAuth();
    const client = useQueryClient();
    const query = useQuery({queryKey: catalogKeys.admin(user?.id), queryFn: ({signal}) => serviceOfferingsService.all(signal)});
    const refresh = () => client.invalidateQueries({queryKey: catalogKeys.admin(user?.id)});
    return {query, refresh};
}

export function useToggleServiceOffering() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({id, active}: { id: number; active: boolean }) => serviceOfferingsService.setActive(id, active),
        onSuccess: () => client.invalidateQueries({queryKey: catalogKeys.admin(user?.id)}),
    });
}

/** Updates a service, or creates it and then stores its technical sheet (creation takes the identity only). */
export function useSaveServiceOffering() {
    return useMutation({
        mutationFn: async ({id, code, details}: { id?: number; code: string; details: ServiceOfferingUpdate }) => {
            if (id != null) return serviceOfferingsService.update(id, details);
            const {name, description, defaultDurationMinutes} = details;
            const created = await serviceOfferingsService.create({name, description, defaultDurationMinutes, code});
            return serviceOfferingsService.update(created.id, details);
        },
    });
}
