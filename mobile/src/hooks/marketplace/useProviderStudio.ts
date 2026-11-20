import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
    mobileMarketplaceApi,
    type CreateListingFromTemplateInput,
    type ProviderOrderAssignInput,
    type ProviderPilot,
    type ProviderPilotStatus,
    type ProviderPilotUpsertInput,
} from '@/api/marketplace/marketplace.api';
import {useOrderRealtimeSync} from '@/hooks/order/useOrders';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/shared/lib/query';
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
} from '@/shared/types/marketplace/marketplace.types';

export type {
    CreateListingFromTemplateInput,
    ProviderOrderAssignInput,
    ProviderPilot,
    ProviderPilotStatus,
    ProviderPilotUpsertInput,
};

export function useMyProviderProfile() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-profile'),
        queryFn: ({signal}) => mobileMarketplaceApi.getMyProfile(signal),
        enabled: Boolean(user),
    });
}

export function useMyProviderListings() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-listings'),
        queryFn: ({signal}) => mobileMarketplaceApi.listMyListings(signal),
        enabled: Boolean(user),
    });
}

export function useMyProviderFleet() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-fleet'),
        queryFn: ({signal}) => mobileMarketplaceApi.getMyFleet(signal),
        enabled: Boolean(user),
    });
}

export function useMyProviderPilots() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-pilots'),
        queryFn: ({signal}) => mobileMarketplaceApi.listMyPilots(signal),
        enabled: Boolean(user),
        retry: false,
    });
}

export function useProviderOrders() {
    const {user} = useAuth();
    useOrderRealtimeSync();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-orders'),
        queryFn: ({signal}) => mobileMarketplaceApi.listMyOrders(signal),
        enabled: Boolean(user),
    });
}

export function useOpenRfqs() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'open-rfqs'),
        queryFn: ({signal}) => mobileMarketplaceApi.listOpenRfqs(signal),
        enabled: Boolean(user),
    });
}

export function useMyProviderBids() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-bids'),
        queryFn: ({signal}) => mobileMarketplaceApi.listMyBids(signal),
        enabled: Boolean(user),
    });
}

export function useMyProviderWallet() {
    const {user} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'marketplace', 'my-wallet'),
        queryFn: ({signal}) => mobileMarketplaceApi.getMyWallet(signal),
        enabled: Boolean(user),
    });
}

export function useProviderStudioMutations() {
    const {user} = useAuth();
    const qc = useQueryClient();
    const featureKey = queryKeys.feature(user?.id, 'marketplace');

    const refresh = () => {
        void qc.invalidateQueries({queryKey: featureKey});
        void qc.invalidateQueries({queryKey: ['marketplace']});
        void qc.invalidateQueries({queryKey: ['public', 'site-info']});
        void qc.invalidateQueries({queryKey: queryKeys.feature(user?.id, 'orders')});
    };

    return {
        upsertProfile: useMutation({
            mutationFn: (payload: ProviderOnboardingInput) =>
                mobileMarketplaceApi.upsertMyProfile(payload),
            onSettled: refresh,
        }),
        addDocument: useMutation({
            mutationFn: (payload: ProviderDocumentInput) =>
                mobileMarketplaceApi.addDocument(payload),
            onSettled: refresh,
        }),
        deleteDocument: useMutation({
            mutationFn: (id: number) => mobileMarketplaceApi.deleteDocument(id),
            onSettled: refresh,
        }),
        createListing: useMutation({
            mutationFn: (payload: MarketplaceListingUpsertInput) =>
                mobileMarketplaceApi.createListing(payload),
            onSettled: refresh,
        }),
        createListingFromTemplate: useMutation({
            mutationFn: (payload: CreateListingFromTemplateInput) =>
                mobileMarketplaceApi.createListingFromTemplate(payload),
            onSettled: refresh,
        }),
        updateListing: useMutation({
            mutationFn: ({id, payload}: { id: number; payload: MarketplaceListingUpsertInput }) =>
                mobileMarketplaceApi.updateListing(id, payload),
            onSettled: refresh,
        }),
        deleteListing: useMutation({
            mutationFn: (id: number) => mobileMarketplaceApi.deleteListing(id),
            onSettled: refresh,
        }),
        toggleListingPause: useMutation({
            mutationFn: (id: number) => mobileMarketplaceApi.toggleListingPause(id),
            onSettled: refresh,
        }),
        registerUav: useMutation({
            mutationFn: (payload: ProviderUavCreateInput) =>
                mobileMarketplaceApi.registerUav(payload),
            onSettled: refresh,
        }),
        deleteUav: useMutation({
            mutationFn: (id: number) => mobileMarketplaceApi.deleteUav(id),
            onSettled: refresh,
        }),
        registerEquipment: useMutation({
            mutationFn: (payload: ProviderEquipmentCreateInput) =>
                mobileMarketplaceApi.registerEquipment(payload),
            onSettled: refresh,
        }),
        createPilot: useMutation({
            mutationFn: (payload: ProviderPilotUpsertInput) =>
                mobileMarketplaceApi.createPilot(payload),
            onSettled: refresh,
        }),
        updatePilot: useMutation({
            mutationFn: ({id, payload}: { id: number; payload: Partial<ProviderPilotUpsertInput> }) =>
                mobileMarketplaceApi.updatePilot(id, payload),
            onSettled: refresh,
        }),
        deletePilot: useMutation({
            mutationFn: (id: number) => mobileMarketplaceApi.deletePilot(id),
            onSettled: refresh,
        }),
        respondToOrder: useMutation({
            mutationFn: ({
                missionId,
                payload,
            }: {
                missionId: number;
                payload: ProviderOrderActionInput;
            }) => mobileMarketplaceApi.respondToOrder(missionId, payload),
            onSettled: refresh,
        }),
        assignOrder: useMutation({
            mutationFn: ({
                missionId,
                payload,
            }: {
                missionId: number;
                payload: ProviderOrderAssignInput;
            }) => mobileMarketplaceApi.assignOrder(missionId, payload),
            onSettled: refresh,
        }),
        startOrder: useMutation({
            mutationFn: (missionId: number) => mobileMarketplaceApi.startOrder(missionId),
            onSettled: refresh,
        }),
        completeOrder: useMutation({
            mutationFn: ({
                missionId,
                payload,
            }: {
                missionId: number;
                payload: ProviderOrderCompleteInput;
            }) => mobileMarketplaceApi.completeOrder(missionId, payload),
            onSettled: refresh,
        }),
        submitBid: useMutation({
            mutationFn: ({
                missionId,
                payload,
            }: {
                missionId: number;
                payload: MissionBidCreateInput;
            }) => mobileMarketplaceApi.submitBid(missionId, payload),
            onSettled: refresh,
        }),
        requestPayout: useMutation({
            mutationFn: (payload: PayoutCreateInput) => mobileMarketplaceApi.requestPayout(payload),
            onSettled: refresh,
        }),
    };
}
