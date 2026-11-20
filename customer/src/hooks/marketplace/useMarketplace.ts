'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {marketplaceApi} from '@/api/marketplace/marketplace.api';
import {billingKeys} from '@/hooks/billing/query-keys';
import {queryKeys} from '@/lib/query';
import {useAuth} from '@/providers/AuthContext';
import type {
    MarketplaceListingUpsertInput,
    MissionBidCreateInput,
    PayoutCreateInput,
    ProviderDocumentInput,
    ProviderEquipmentCreateInput,
    ProviderOnboardingInput,
    ProviderOrderActionInput,
    ProviderOrderCompleteInput,
    ProviderUavCreateInput,
    PublicListingFilters,
} from '@/types/marketplace/marketplace.types';

export function usePublicListings(filters: PublicListingFilters = {}, enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'public-listings', filters],
        placeholderData: keepPreviousData,
        queryFn: () => marketplaceApi.listPublicListings(filters),
        enabled,
    });
}

export function usePublicListingDetail(slug: string | null | undefined) {
    return useQuery({
        queryKey: ['marketplace', 'public-listing', slug],
        queryFn: () => marketplaceApi.getPublicListingBySlug(slug!),
        enabled: Boolean(slug),
    });
}

export function usePublicProviderStorefront(slug: string | null | undefined) {
    return useQuery({
        queryKey: ['marketplace', 'public-provider', slug],
        queryFn: () => marketplaceApi.getPublicProviderBySlug(slug!),
        enabled: Boolean(slug),
    });
}

export function useMyProviderProfile(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-me'],
        queryFn: () => marketplaceApi.getMyProfile(),
        enabled,
    });
}

export function useProviderOnboardingActions() {
    const qc = useQueryClient();
    const invalidate = () => void qc.invalidateQueries({queryKey: ['marketplace', 'provider-me']});
    const upsertProfile = useMutation({
        mutationFn: (payload: ProviderOnboardingInput) => marketplaceApi.upsertMyProfile(payload),
        onSettled: invalidate,
    });
    const addDocument = useMutation({
        mutationFn: (payload: ProviderDocumentInput) => marketplaceApi.addDocument(payload),
        onSettled: invalidate,
    });
    const deleteDocument = useMutation({
        mutationFn: (id: number) => marketplaceApi.deleteDocument(id),
        onSettled: invalidate,
    });
    return {upsertProfile, addDocument, deleteDocument};
}

export function useMyProviderListings(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-listings'],
        placeholderData: keepPreviousData,
        queryFn: () => marketplaceApi.listMyListings(),
        enabled,
    });
}

export function useProviderListingActions() {
    const qc = useQueryClient();
    const invalidate = () => {
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-listings']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'public-listings']});
    };
    const createListing = useMutation({
        mutationFn: (payload: MarketplaceListingUpsertInput) => marketplaceApi.createListing(payload),
        onSettled: invalidate,
    });
    const updateListing = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: MarketplaceListingUpsertInput }) =>
            marketplaceApi.updateListing(id, payload),
        onSettled: invalidate,
    });
    const togglePause = useMutation({
        mutationFn: (id: number) => marketplaceApi.toggleListingPause(id),
        onSettled: invalidate,
    });
    return {createListing, updateListing, togglePause};
}

export function useMyProviderFleet(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-fleet'],
        queryFn: () => marketplaceApi.getMyFleet(),
        enabled,
    });
}

export function useProviderFleetActions() {
    const qc = useQueryClient();
    const invalidate = () => void qc.invalidateQueries({queryKey: ['marketplace', 'provider-fleet']});
    const registerUav = useMutation({
        mutationFn: (payload: ProviderUavCreateInput) => marketplaceApi.registerUav(payload),
        onSuccess: invalidate,
    });
    const registerEquipment = useMutation({
        mutationFn: (payload: ProviderEquipmentCreateInput) => marketplaceApi.registerEquipment(payload),
        onSuccess: invalidate,
    });
    return {registerUav, registerEquipment};
}

export function useProviderOrders(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-orders'],
        placeholderData: keepPreviousData,
        queryFn: () => marketplaceApi.listMyOrders(),
        enabled,
    });
}

export function useOpenRfqMissions(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'open-rfq'],
        placeholderData: keepPreviousData,
        queryFn: () => marketplaceApi.listOpenRfqs(),
        enabled,
    });
}

export function useMySubmittedBids(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'my-bids'],
        placeholderData: keepPreviousData,
        queryFn: () => marketplaceApi.listMyBids(),
        enabled,
    });
}

export function useProviderOrderActions() {
    const qc = useQueryClient();
    const invalidate = () => {
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-orders']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'open-rfq']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'my-bids']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-wallet']});
    };
    const respondToOrder = useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload: ProviderOrderActionInput }) =>
            marketplaceApi.respondToOrder(missionId, payload),
        onSettled: invalidate,
    });
    const startOrder = useMutation({
        mutationFn: (missionId: number) => marketplaceApi.startOrder(missionId),
        onSettled: invalidate,
    });
    const completeOrder = useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload: ProviderOrderCompleteInput }) =>
            marketplaceApi.completeOrder(missionId, payload),
        onSettled: invalidate,
    });
    const submitBid = useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload: MissionBidCreateInput }) =>
            marketplaceApi.submitBid(missionId, payload),
        onSettled: invalidate,
    });
    return {respondToOrder, startOrder, completeOrder, submitBid};
}

export function useMyProviderWallet(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-wallet'],
        queryFn: () => marketplaceApi.getMyWallet(),
        enabled,
    });
}

export function useRequestPayout() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: PayoutCreateInput) => marketplaceApi.requestPayout(payload),
        onSettled: () => void qc.invalidateQueries({queryKey: ['marketplace', 'provider-wallet']}),
    });
}

export function useMissionBids(missionId: number | null | undefined, enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'mission-bids', missionId],
        queryFn: () => marketplaceApi.listMissionBids(missionId!),
        enabled: Boolean(missionId) && enabled,
    });
}

export function useAcceptMissionBid(missionId: number) {
    const qc = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        mutationFn: (bidId: number) => marketplaceApi.acceptMissionBid(missionId, bidId),
        onSettled: () => {
            const customerKey = queryKeys.feature(user?.id, 'customer');
            void qc.invalidateQueries({queryKey: ['marketplace', 'mission-bids', missionId]});
            void qc.invalidateQueries({queryKey: [...customerKey, 'mission', missionId]});
            void qc.invalidateQueries({queryKey: [...customerKey, 'missions']});
            void qc.invalidateQueries({queryKey: billingKeys.customer(user?.id)});
        },
    });
}
