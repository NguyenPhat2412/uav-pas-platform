'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {apiClient} from '@/lib/api';
import {useCustomerScope} from "@/lib/query/customer";
import {type CustomerProfile, type ProfileFields, profilePayload} from "@/features/profile/forms/profile-form";

const endpoint = '/api/v1/users/profile';

export function useCustomerProfile() {
    const {user, key} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'profile'], enabled: !!user, staleTime: 30_000, retry: false,
        queryFn: ({signal}) => apiClient.get<CustomerProfile>(endpoint, {signal})
    });
}

export function useUpdateCustomerProfile() {
    const {key} = useCustomerScope();
    const client = useQueryClient();
    const queryKey = [...key, 'profile'];
    return useMutation({
        retry: false,
        mutationFn: ({fields, revision}: {
            fields: ProfileFields;
            revision: string
        }) => apiClient.patch<CustomerProfile>(endpoint, profilePayload(fields, revision)),
        onSuccess: profile => {
            // Cancel older reads before publishing the saved name to the header and form.
            void client.cancelQueries({queryKey});
            client.setQueryData(queryKey, profile);
        }
    });
}
