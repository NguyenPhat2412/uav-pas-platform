'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, QUIET, type MutationOptions} from '@/lib/query';
import {avatarService, profileService} from '@/features/profile/api/profile.api';
import {authService} from '@/features/auth/api/auth.api';
import {profileKeys} from '@/features/profile/hooks/query-keys';
import type {BillingProfile, BillingProfileFields, ProfileFields} from '@/features/profile/types/profile.types';
import type {TwoFactorMethod, TwoFactorSetupResponse, TwoFactorStatusResponse, TwoFactorVerifyRequest} from '@/features/auth/types/auth.types';

export function useOwnProfile() {
    const {user} = useAuth();
    return useQuery({
        queryKey: profileKeys.own(user?.id), enabled: !!user, staleTime: 30_000,
        queryFn: ({signal}) => profileService.get(signal)
    });
}

/** Saves name and phone against the revision the form was loaded from; the answer replaces the cached profile. */
export function useUpdateProfile() {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        mutationFn: ({fields, revision}: { fields: ProfileFields; revision: string }) => profileService.update(fields, revision),
        onSuccess: profile => {
            void client.cancelQueries({queryKey: profileKeys.own(user?.id)});
            client.setQueryData(profileKeys.own(user?.id), profile);
        }
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: ({current, next, confirm}: { current: string; next: string; confirm?: string }) =>
            profileService.changePassword(current, next, confirm),
    });
}

/** Avatar writes; the editor reports failures inline. */
export function useAvatarMutations() {
    return {
        upload: useMutation({mutationFn: (file: File) => avatarService.upload(file), meta: QUIET}),
        remove: useMutation({mutationFn: () => avatarService.remove(), meta: QUIET}),
    };
}

export function useBillingProfile() {
    const {user} = useAuth();
    return useQuery({queryKey: profileKeys.billing(user?.id), queryFn: ({signal}) => profileService.getBilling(signal)});
}

export function useUpdateBillingProfile(options?: MutationOptions<BillingProfile, { fields: BillingProfileFields; version: number }>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({fields, version}: { fields: BillingProfileFields; version: number }) => profileService.updateBilling(fields, version),
        onSuccess: afterSuccess(options, data => client.setQueryData(profileKeys.billing(user?.id), data)),
    });
}

export function useTwoFactorStatus() {
    const {user} = useAuth();
    return useQuery({
        queryKey: profileKeys.twoFactor(user?.id),
        enabled: !!user,
        queryFn: ({signal}) => authService.get2faStatus(signal),
    });
}

export function useTwoFactorSetup(options?: MutationOptions<TwoFactorSetupResponse, TwoFactorMethod>) {
    return useMutation({...options, mutationFn: (method: TwoFactorMethod) => authService.setup2fa({method})});
}

/** Enabling or disabling 2FA returns the new status, which replaces the cached one. */
export function useEnableTwoFactor(options?: MutationOptions<TwoFactorStatusResponse, TwoFactorVerifyRequest>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (request: TwoFactorVerifyRequest) => authService.enable2fa(request),
        onSuccess: afterSuccess(options, data => client.setQueryData(profileKeys.twoFactor(user?.id), data)),
    });
}

export function useDisableTwoFactor(options?: MutationOptions<TwoFactorStatusResponse, string>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        // The backend requires the current password to turn 2FA off.
        mutationFn: (password: string) => authService.disable2fa({password}),
        onSuccess: afterSuccess(options, data => client.setQueryData(profileKeys.twoFactor(user?.id), data)),
    });
}
