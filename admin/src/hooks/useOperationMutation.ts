'use client';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';

export function useOperationMutation<TInput, TResult>(action: (input: TInput) => Promise<TResult>, affected: string[]) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        mutationFn: action, onSuccess: async () => {
            await Promise.all(affected.map(feature => client.invalidateQueries({queryKey: queryKeys.feature(user?.id, feature)})));
        }
    });
}
