'use client';

import {useEffect} from 'react';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {marketplaceApi} from '@/api/marketplace/marketplace.api';
import {missionService} from '@/api/mission/missions.api';
import {operationsRealtimeClient} from '@/lib/realtime-ws';
import type {Mission} from '@/types/mission/mission.types';
import type {
    MarketplaceListingFromTemplateInput,
    MarketplaceListingUpsertInput,
    ProviderDocumentInput,
    ProviderEquipmentCreateInput,
    ProviderOnboardingInput,
    ProviderOrderActionInput,
    ProviderOrderAssignInput,
    ProviderOrderCompleteInput,
    ProviderPilotUpsertInput,
    ProviderUavCreateInput,
    ProviderUavUpdateInput,
} from '@/types/marketplace/marketplace.types';

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

export function useServiceTemplates(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'service-templates'],
        queryFn: () => marketplaceApi.listServiceTemplates(),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useMyProviderListings(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-listings'],
        queryFn: () => marketplaceApi.listMyListings(),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useProviderListingActions() {
    const qc = useQueryClient();
    const invalidate = () => {
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-listings']});
    };
    const createListing = useMutation({
        mutationFn: (payload: MarketplaceListingUpsertInput) => marketplaceApi.createListing(payload),
        onSettled: invalidate,
    });
    const createFromTemplate = useMutation({
        mutationFn: (payload: MarketplaceListingFromTemplateInput) =>
            marketplaceApi.createListingFromTemplate(payload),
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
    const deleteListing = useMutation({
        mutationFn: (id: number) => marketplaceApi.deleteListing(id),
        onSettled: invalidate,
    });
    return {createListing, createFromTemplate, updateListing, togglePause, deleteListing};
}

export function useMyProviderFleet(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-fleet'],
        queryFn: () => marketplaceApi.getMyFleet(),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useProviderFleetActions() {
    const qc = useQueryClient();
    const invalidate = () => {
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-fleet']});
    };
    const registerUav = useMutation({
        mutationFn: (payload: ProviderUavCreateInput) => marketplaceApi.registerUav(payload),
        onSettled: invalidate,
    });
    const updateUav = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: ProviderUavUpdateInput }) =>
            marketplaceApi.updateUav(id, payload),
        onSettled: invalidate,
    });
    const deleteUav = useMutation({
        mutationFn: (id: number) => marketplaceApi.deleteUav(id),
        onSettled: invalidate,
    });
    const registerEquipment = useMutation({
        mutationFn: (payload: ProviderEquipmentCreateInput) => marketplaceApi.registerEquipment(payload),
        onSettled: invalidate,
    });
    const deleteEquipment = useMutation({
        mutationFn: (id: number) => marketplaceApi.deleteEquipment(id),
        onSettled: invalidate,
    });
    return {registerUav, updateUav, deleteUav, registerEquipment, deleteEquipment};
}

export function useProviderPilots(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-pilots'],
        queryFn: () => marketplaceApi.listPilots(),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useProviderPilotActions() {
    const qc = useQueryClient();
    const invalidate = () => void qc.invalidateQueries({queryKey: ['marketplace', 'provider-pilots']});
    const createPilot = useMutation({
        mutationFn: (payload: ProviderPilotUpsertInput) => marketplaceApi.createPilot(payload),
        onSettled: invalidate,
    });
    const updatePilot = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: Partial<ProviderPilotUpsertInput> }) =>
            marketplaceApi.updatePilot(id, payload),
        onSettled: invalidate,
    });
    const deletePilot = useMutation({
        mutationFn: (id: number) => marketplaceApi.deletePilot(id),
        onSettled: invalidate,
    });
    return {createPilot, updatePilot, deletePilot};
}

export function useProviderOrders(enabled = true) {
    const qc = useQueryClient();
    useEffect(() => {
        if (!enabled) return;
        return operationsRealtimeClient.subscribeFrames(frame => {
            if (frame.type === 'ORDER_UPDATED') {
                void qc.invalidateQueries({queryKey: ['marketplace', 'provider-orders']});
            }
        });
    }, [enabled, qc]);
    return useQuery({
        queryKey: ['marketplace', 'provider-orders'],
        queryFn: () => marketplaceApi.listMyOrders(),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useProviderOrderActions() {
    const qc = useQueryClient();
    const invalidate = () => {
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-orders']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-fleet']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-pilots']});
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-wallet']});
    };
    const respondToOrder = useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload: ProviderOrderActionInput }) =>
            marketplaceApi.respondToOrder(missionId, payload),
        onSettled: invalidate,
    });
    const assignOrder = useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload: ProviderOrderAssignInput }) =>
            marketplaceApi.assignOrderResources(missionId, payload),
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
    return {respondToOrder, assignOrder, startOrder, completeOrder};
}

export function useMyProviderWallet(enabled = true) {
    return useQuery({
        queryKey: ['marketplace', 'provider-wallet'],
        queryFn: () => marketplaceApi.getMyWallet(),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function usePilotTodayActions() {
    const qc = useQueryClient();
    const invalidate = () => {
        void qc.invalidateQueries({queryKey: ['marketplace', 'provider-orders']});
        void qc.invalidateQueries({queryKey: ['missions']});
    };

    const startTask = useMutation({
        mutationFn: async (mission: Mission) => {
            if (mission.status === 'IN_PROGRESS') return mission;
            if (mission.providerId) {
                return marketplaceApi.startOrder(mission.id);
            }
            return missionService.start(mission.id);
        },
        onSettled: invalidate,
    });

    const uploadDeliverable = useMutation({
        mutationFn: async ({missionId, file}: { missionId: number; file: File }) => {
            const signed = await missionService.requestMediaUpload(missionId, file);
            await missionService.uploadFile(signed.url, file);
            await missionService.confirmMedia(missionId, signed.mediaId);
            await missionService.attachMedia(missionId, signed.mediaId, 'OUTPUT');
            return file.name;
        },
        onSettled: invalidate,
    });

    const completeTask = useMutation({
        mutationFn: async ({
            mission,
            completionNote,
            equipmentCondition,
        }: {
            mission: Mission;
            completionNote: string;
            equipmentCondition: string;
        }) => {
            if (mission.providerId) {
                return marketplaceApi.completeOrder(mission.id, {
                    completionNote,
                    equipmentCondition,
                });
            }
            return missionService.complete(mission.id, completionNote, equipmentCondition);
        },
        onSettled: invalidate,
    });

    return {startTask, uploadDeliverable, completeTask};
}
