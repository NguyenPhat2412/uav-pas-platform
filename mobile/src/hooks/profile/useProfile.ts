import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {profileKeys} from '@/shared/hooks/profile/query-keys';
import {authService} from '@/api/auth/auth.api';
import {
    avatarService,
    profileService,
    type AccountDeletionPolicy,
    type AvatarFile,
    type DeleteOwnAccountPayload,
} from '@/api/profile/profile.api';
import {apiImageSource} from '@/lib/api/client';
import {useAuth} from '@/providers/AuthContext';
import type {ProfileFields} from '@/shared/types/profile/profile.types';

export type {AccountDeletionPolicy, DeleteOwnAccountPayload};

export function useProfile() {
    const {user, refreshUser} = useAuth();
    const client = useQueryClient();
    const profile = useQuery({queryKey: profileKeys.own(user?.id), queryFn: ({signal}) => profileService.get(signal), enabled: !!user});
    const twoFactor = useQuery({queryKey: profileKeys.twoFactor(user?.id), queryFn: ({signal}) => authService.twoFactorStatus(signal), enabled: !!user});
    const update = useMutation({
        mutationFn: ({fields, revision}: { fields: ProfileFields; revision: string }) => profileService.update(fields, revision),
        onSuccess: saved => {
            client.setQueryData(profileKeys.own(user?.id), saved);
            void refreshUser().catch(() => undefined);
        },
        retry: false,
    });
    const changePassword = useMutation({
        mutationFn: ({current, next, confirm}: { current: string; next: string; confirm: string }) =>
            profileService.changePassword(current, next, confirm),
        retry: false,
    });
    return {profile, twoFactor, update, changePassword};
}

/** Upload or remove the avatar, then reload the signed-in user so every avatar in the app updates. */
export function useAvatarMutations() {
    const {refreshUser} = useAuth();
    const reload = () => refreshUser().catch(() => undefined);
    return {
        upload: useMutation({mutationFn: (file: AvatarFile) => avatarService.upload(file), onSuccess: reload, retry: false}),
        remove: useMutation({mutationFn: () => avatarService.remove(), onSuccess: reload, retry: false}),
    };
}

/** The signed-in user's avatar as an <Image> source, or undefined when they have none. */
export function useAvatarSource() {
    const {user} = useAuth();
    return apiImageSource(user?.avatarUrl);
}

/** Live administrator-configured self-service account deletion policy and eligibility for the signed-in user. */
export function useAccountDeletionPolicy(enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: [...profileKeys.own(user?.id), 'deletion-policy'] as const,
        queryFn: ({signal}) => profileService.getDeletionPolicy(signal),
        enabled: !!user && enabled,
        staleTime: 15_000,
        refetchOnMount: 'always',
    });
}

/** Submits the signed-in user's self-service account deletion request under the current Admin policy. */
export function useDeleteOwnAccount() {
    return useMutation({
        mutationFn: (payload: DeleteOwnAccountPayload) => profileService.deleteOwnAccount(payload),
        retry: false,
    });
}
