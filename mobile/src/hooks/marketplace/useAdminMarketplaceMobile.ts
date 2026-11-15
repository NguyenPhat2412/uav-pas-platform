import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {mobileMarketplaceApi} from '@/api/marketplace/marketplace.api';
import {mobileSettingsService} from '@/api/settings/site-info.api';
import {SITE_INFO_QUERY_KEY} from '@/hooks/settings/useSiteInfo';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/shared/lib/query';
import type {
    ListingModerationInput,
    ListingModerationStatus,
    PayoutProcessInput,
    PayoutStatus,
    ProviderModerationInput,
    ProviderVerificationStatus,
} from '@/shared/types/marketplace/marketplace.types';

export function useAdminMarketplaceProviders(status: ProviderVerificationStatus | '' = 'PENDING_REVIEW') {
    const {user, can, permissionsReady} = useAuth();
    const canMod = can('MARKETPLACE_MODERATE') || can('USER_MANAGE');
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin-marketplace', 'providers', status || 'ALL'),
        queryFn: ({signal}) => mobileMarketplaceApi.adminProviders(status, signal),
        enabled: permissionsReady && canMod,
    });
}

export function useAdminMarketplaceListings(status: ListingModerationStatus | '' = 'PENDING_REVIEW') {
    const {user, can, permissionsReady} = useAuth();
    const canMod = can('MARKETPLACE_MODERATE') || can('USER_MANAGE');
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin-marketplace', 'listings', status || 'ALL'),
        queryFn: ({signal}) => mobileMarketplaceApi.adminListings(status, signal),
        enabled: permissionsReady && canMod,
    });
}

export function useAdminMarketplacePayouts(status: PayoutStatus | '' = 'PENDING') {
    const {user, can, permissionsReady} = useAuth();
    const canPayout = can('PAYOUT_APPROVE') || can('MARKETPLACE_MODERATE') || can('USER_MANAGE');
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin-marketplace', 'payouts', status || 'ALL'),
        queryFn: ({signal}) => mobileMarketplaceApi.adminPayouts(status, signal),
        enabled: permissionsReady && canPayout,
    });
}

export function useAdminPlatformSettings() {
    const {user, can, permissionsReady} = useAuth();
    const canSettings = can('SETTINGS_UPDATE') || can('SETTINGS_VIEW') || can('USER_MANAGE');
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin-marketplace', 'settings'),
        queryFn: ({signal}) => mobileSettingsService.listSettings(signal),
        enabled: permissionsReady && canSettings,
    });
}

export function useAdminMarketplaceMutations() {
    const {user} = useAuth();
    const qc = useQueryClient();
    const adminKey = queryKeys.feature(user?.id, 'admin-marketplace');

    const refresh = () => {
        void qc.invalidateQueries({queryKey: adminKey});
        void qc.invalidateQueries({queryKey: ['marketplace']});
        void qc.invalidateQueries({queryKey: SITE_INFO_QUERY_KEY});
    };

    return {
        moderateProvider: useMutation({
            mutationFn: ({id, payload}: { id: number; payload: ProviderModerationInput }) =>
                mobileMarketplaceApi.adminModerateProvider(id, payload),
            onSuccess: refresh,
        }),
        moderateListing: useMutation({
            mutationFn: ({id, payload}: { id: number; payload: ListingModerationInput }) =>
                mobileMarketplaceApi.adminModerateListing(id, payload),
            onSuccess: refresh,
        }),
        processPayout: useMutation({
            mutationFn: ({id, payload}: { id: number; payload: PayoutProcessInput }) =>
                mobileMarketplaceApi.adminProcessPayout(id, payload),
            onSuccess: refresh,
        }),
        updateSetting: useMutation({
            mutationFn: ({key, value}: { key: string; value: string }) =>
                mobileSettingsService.updateSetting(key, value),
            onSuccess: refresh,
        }),
    };
}
