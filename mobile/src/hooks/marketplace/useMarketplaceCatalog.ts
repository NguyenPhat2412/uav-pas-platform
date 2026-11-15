import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {mobileMarketplaceApi} from '@/api/marketplace/marketplace.api';
import {billingKeys} from '@/shared/hooks/billing/query-keys';
import {queryKeys} from '@/shared/lib/query';
import {useAuth} from '@/providers/AuthContext';
import type {PublicListingFilters} from '@/shared/types/marketplace/marketplace.types';

export function usePublicListings(filters: PublicListingFilters = {}, enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'public-listings', filters],
        queryFn: ({signal}) => mobileMarketplaceApi.listPublicListings(filters, signal),
        enabled,
    });
}

export function usePublicListingDetail(slug: string | null | undefined) {
    return useQuery({
        queryKey: ['marketplace', 'public-listing', slug],
        queryFn: ({signal}) => mobileMarketplaceApi.getPublicListingBySlug(slug!, signal),
        enabled: Boolean(slug),
    });
}

export function usePublicProvider(slug: string | null | undefined) {
    return useQuery({
        queryKey: ['marketplace', 'public-provider', slug],
        queryFn: ({signal}) => mobileMarketplaceApi.getPublicProviderBySlug(slug!, signal),
        enabled: Boolean(slug),
    });
}

export function useMissionBids(missionId: number | undefined, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'mission-bids', missionId ?? 0),
        queryFn: ({signal}) => mobileMarketplaceApi.listMissionBids(missionId!, signal),
        enabled: Boolean(user && missionId && enabled),
    });
}

export function useAcceptMissionBid(missionId: number) {
    const qc = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        mutationFn: (bidId: number) => mobileMarketplaceApi.acceptMissionBid(missionId, bidId),
        onSettled: () => {
            void qc.invalidateQueries({
                queryKey: queryKeys.of(user?.id, 'marketplace', 'mission-bids', missionId),
            });
            void qc.invalidateQueries({queryKey: queryKeys.feature(user?.id, 'customer')});
            void qc.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
        },
    });
}
