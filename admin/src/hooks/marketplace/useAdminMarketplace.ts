'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminMarketplaceApi} from '@/api/marketplace/marketplace.api';
import {useAuth} from '@/providers/AuthContext';
import type {
    ListingModerationInput,
    ListingModerationStatus,
    PayoutProcessInput,
    PayoutStatus,
    ProviderModerationInput,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export function useAdminProviders(status: ProviderVerificationStatus | '', keyword: string, page = 0) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'providers', status, keyword, page],
        queryFn: ({signal}) => adminMarketplaceApi.listProviders({status, keyword, page}, signal),
        placeholderData: keepPreviousData,
        enabled: permissionsReady && can('MARKETPLACE_MODERATE'),
    });
}

export function useModerateProvider() {
    const {user} = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: ProviderModerationInput }) =>
            adminMarketplaceApi.moderateProvider(id, payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'providers']}),
    });
}

export function useAdminListings(status: ListingModerationStatus | '', keyword: string, page = 0) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'listings', status, keyword, page],
        queryFn: ({signal}) => adminMarketplaceApi.listListings({status, keyword, page}, signal),
        placeholderData: keepPreviousData,
        enabled: permissionsReady && can('MARKETPLACE_MODERATE'),
    });
}

export function useModerateListing() {
    const {user} = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: ListingModerationInput }) =>
            adminMarketplaceApi.moderateListing(id, payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'listings']}),
    });
}

export function useAdminPayouts(status: PayoutStatus | '', page = 0) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'payouts', status, page],
        queryFn: ({signal}) => adminMarketplaceApi.listPayouts({status, page}, signal),
        placeholderData: keepPreviousData,
        enabled: permissionsReady && can('PAYOUT_MANAGE'),
    });
}

export function useProcessPayout() {
    const {user} = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: PayoutProcessInput }) =>
            adminMarketplaceApi.processPayout(id, payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'payouts']}),
    });
}
