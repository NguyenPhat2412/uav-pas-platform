'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient, type QueryFunction} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, queryKeys, QUIET, type MutationOptions} from '@/lib/query';
import {infrastructureService} from '@/api/infrastructure.api';
import type {
    AdminOtpToken,
    MailOtpSettings,
    MailOtpSettingsUpdatePayload,
    OtpSupportActionResult,
    OtpTokenFilters,
} from '@/types/infrastructure.types';

function useInfrastructureQuery<T>(name: string, queryFn: QueryFunction<T>, refetchInterval: number | false = false) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'infrastructure', name),
        queryFn,
        refetchInterval,
        enabled: permissionsReady && can('USER_PERMISSION_MANAGE'),
    });
}

export const useDeploymentInfo = () =>
    useInfrastructureQuery('deployment', ({signal}) => infrastructureService.deployment(signal));

/** `refetchInterval` lets the backups page keep watching while the overview loads once. */
export const useBackupStatus = (refetchInterval: number | false = false) =>
    useInfrastructureQuery('backups', ({signal}) => infrastructureService.backups(signal), refetchInterval);

export const useStorageStatus = () =>
    useInfrastructureQuery('storage', ({signal}) => infrastructureService.storage(signal));

export const useDatabaseStatus = () =>
    useInfrastructureQuery('database', ({signal}) => infrastructureService.database(signal), 30_000);

export const useEmailStatus = () =>
    useInfrastructureQuery('email', ({signal}) => infrastructureService.email(signal));

export function useSendTestEmail() {
    return useMutation({mutationFn: () => infrastructureService.sendTestEmail()});
}

export const useMailOtpSettings = () =>
    useInfrastructureQuery('mail-otp-settings', ({signal}) => infrastructureService.mailOtpSettings(signal));

export function useUpdateMailOtpSettings(
    options?: MutationOptions<MailOtpSettings, MailOtpSettingsUpdatePayload>,
) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation<MailOtpSettings, Error, MailOtpSettingsUpdatePayload>({
        meta: options?.onError ? QUIET : undefined,
        ...options,
        mutationFn: body => infrastructureService.updateMailOtpSettings(body),
        onSuccess: afterSuccess(options, updated => {
            client.setQueryData(queryKeys.of(user?.id, 'infrastructure', 'mail-otp-settings'), updated);
            void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'infrastructure', 'email')});
        }),
    });
}

export function useAdminOtpTokens(page: number, filters: OtpTokenFilters) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'infrastructure', 'otp-tokens', filters, page),
        placeholderData: keepPreviousData,
        queryFn: ({signal}) => infrastructureService.otpTokens(page, filters, signal),
        enabled: permissionsReady && can('USER_PERMISSION_MANAGE'),
    });
}

export function useInvalidateOtpToken(options?: MutationOptions<AdminOtpToken | void, number>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation<AdminOtpToken | void, Error, number>({
        meta: options?.onError ? QUIET : undefined,
        ...options,
        mutationFn: id => infrastructureService.invalidateOtpToken(id),
        onSuccess: afterSuccess(options, () =>
            void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'infrastructure', 'otp-tokens')}),
        ),
    });
}

export function useSendResetOtpSupport(options?: MutationOptions<OtpSupportActionResult, string>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation<OtpSupportActionResult, Error, string>({
        meta: options?.onError ? QUIET : undefined,
        ...options,
        mutationFn: email => infrastructureService.sendResetOtp(email),
        onSuccess: afterSuccess(options, () =>
            void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'infrastructure', 'otp-tokens')}),
        ),
    });
}

export function useClearOtpRateLimitSupport(options?: MutationOptions<OtpSupportActionResult, string>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation<OtpSupportActionResult, Error, string>({
        meta: options?.onError ? QUIET : undefined,
        ...options,
        mutationFn: email => infrastructureService.clearOtpRateLimit(email),
        onSuccess: afterSuccess(options, () =>
            void client.invalidateQueries({queryKey: queryKeys.of(user?.id, 'infrastructure', 'otp-tokens')}),
        ),
    });
}
