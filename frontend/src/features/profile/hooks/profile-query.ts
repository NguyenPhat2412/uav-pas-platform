'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useCustomerScope} from "@/lib/query/customer";
import {profileService} from "@/features/profile/services/profile.service";
import type {ProfileFields} from "@/features/profile/types/profile.interface";

export function useCustomerProfile() {
    const {user, key} = useCustomerScope();
    return useQuery({
        queryKey: [...key, 'profile'], enabled: !!user, staleTime: 30_000, retry: false,
        queryFn: ({signal}) => profileService.get(signal)
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
        }) => profileService.update(fields, revision),
        onSuccess: profile => {
            // Cancel older reads before publishing the saved name to the header and form.
            void client.cancelQueries({queryKey});
            client.setQueryData(queryKey, profile);
        }
    });
}
