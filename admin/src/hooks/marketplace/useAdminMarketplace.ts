'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminMarketplaceApi} from '@/api/marketplace/marketplace.api';
import type {
    ListingModerationInput,
    ListingModerationStatus,
    PayoutProcessInput,
    PayoutStatus,
    ProviderModerationInput,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export function useAdminProviders(status: ProviderVerificationStatus | '', keyword: string, page = 0) {
    return useQuery({
        queryKey: ['admin-marketplace', 'providers', status, keyword, page],
        queryFn: () => adminMarketplaceApi.listProviders({status, keyword, page}),
    });
}

export function useModerateProvider() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: ProviderModerationInput }) =>
            adminMarketplaceApi.moderateProvider(id, payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['admin-marketplace', 'providers']}),
    });
}

export function useAdminListings(status: ListingModerationStatus | '', keyword: string, page = 0) {
    return useQuery({
        queryKey: ['admin-marketplace', 'listings', status, keyword, page],
        queryFn: () => adminMarketplaceApi.listListings({status, keyword, page}),
    });
}

export function useModerateListing() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: ListingModerationInput }) =>
            adminMarketplaceApi.moderateListing(id, payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['admin-marketplace', 'listings']}),
    });
}

export function useAdminPayouts(status: PayoutStatus | '', page = 0) {
    return useQuery({
        queryKey: ['admin-marketplace', 'payouts', status, page],
        queryFn: () => adminMarketplaceApi.listPayouts({status, page}),
    });
}

export function useProcessPayout() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: PayoutProcessInput }) =>
            adminMarketplaceApi.processPayout(id, payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['admin-marketplace', 'payouts']}),
    });
}
