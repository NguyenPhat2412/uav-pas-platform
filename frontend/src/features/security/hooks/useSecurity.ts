'use client';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, type MutationOptions} from '@/lib/query';
import {securityService} from '@/features/security/api/security.api';
import {securityKeys} from '@/features/security/hooks/query-keys';
import type {SecurityActionResult, SessionFilter} from '@/features/security/types/security.types';

export function useSecurityPolicy() {
    const {user} = useAuth();
    return useQuery({queryKey: securityKeys.policy(user?.id), queryFn: ({signal}) => securityService.policy(signal)});
}

export function useSecuritySecrets() {
    const {user} = useAuth();
    return useQuery({queryKey: securityKeys.secrets(user?.id), queryFn: ({signal}) => securityService.secrets(signal)});
}

export function useSecuritySessions(filter: SessionFilter) {
    const {user} = useAuth();
    return useQuery({
        queryKey: securityKeys.sessions(user?.id, filter),
        queryFn: ({signal}) => securityService.sessions(filter, signal),
        placeholderData: keepPreviousData,
    });
}

/** Session and 2FA actions; each refreshes every security view, then reports through `options.onSuccess`. */
export function useSecurityActions(options?: Pick<MutationOptions<SecurityActionResult, unknown>, 'onSuccess'>) {
    const client = useQueryClient();
    const {user} = useAuth();
    const onSuccess = afterSuccess<SecurityActionResult, unknown>(options, () => void client.invalidateQueries({queryKey: securityKeys.all(user?.id)}));
    return {
        revokeUser: useMutation({mutationFn: (id: number) => securityService.revokeUserSessions(id), onSuccess}),
        revokeAll: useMutation({mutationFn: () => securityService.revokeAllSessions(), onSuccess}),
        resetTwoFactor: useMutation({
            mutationFn: ({id, revoke}: { id: number; revoke: boolean }) => securityService.resetTwoFactor(id, revoke),
            onSuccess,
        }),
    };
}
