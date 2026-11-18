'use client';

import {useEffect, useState} from 'react';
import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminMarketplaceApi} from '@/api/marketplace/marketplace.api';
import {adminRealtimeClient} from '@/lib/realtime-ws';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';
import type {
    AdminOrderFilter,
    AdminProviderDocument,
    AutoDispatchInput,
    ListingModerationInput,
    ListingModerationStatus,
    ManualDispatchInput,
    PayoutProcessInput,
    PayoutStatus,
    ProviderModerationInput,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export function useAdminMarketplaceRealtime(enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    const qc = useQueryClient();
    const active = Boolean(user) && permissionsReady && (can('MARKETPLACE_MODERATE') || can('MISSION_VIEW')) && enabled;
    const [wsConnected, setWsConnected] = useState<boolean>(() => adminRealtimeClient.isConnected());

    useEffect(() => {
        if (!active) return;
        const baseKey = ['session', user?.id ?? 'anonymous', 'admin-marketplace'] as const;

        const unsubStatus = adminRealtimeClient.subscribeStatus(connected => {
            setWsConnected(connected);
            if (connected) {
                void qc.invalidateQueries({queryKey: [...baseKey, 'dispatch']});
                void qc.invalidateQueries({queryKey: [...baseKey, 'orders']});
                void qc.invalidateQueries({queryKey: [...baseKey, 'stats']});
            }
        });

        const unsubFrames = adminRealtimeClient.subscribeFrames(frame => {
            if (frame.type === 'ORDER_UPDATED') {
                void qc.invalidateQueries({queryKey: [...baseKey, 'dispatch']});
                void qc.invalidateQueries({queryKey: [...baseKey, 'orders']});
                void qc.invalidateQueries({queryKey: [...baseKey, 'order', frame.missionId]});
                void qc.invalidateQueries({queryKey: [...baseKey, 'stats']});
            }
        });

        return () => {
            unsubStatus();
            unsubFrames();
        };
    }, [active, qc, user?.id]);

    return {wsConnected};
}

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
        onSettled: () => {
            void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'providers']});
            void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'stats']});
        },
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
        onSettled: () => {
            void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'listings']});
            void qc.invalidateQueries({queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'stats']});
        },
    });
}

export function useAdminDispatchQueue(page = 0) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'dispatch', page],
        queryFn: ({signal}) => adminMarketplaceApi.listDispatchQueue({page}, signal),
        placeholderData: keepPreviousData,
        enabled: permissionsReady && can('MARKETPLACE_MODERATE'),
    });
}

export function useManualDispatchOrder() {
    const {user} = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload: ManualDispatchInput }) =>
            adminMarketplaceApi.dispatchManual(missionId, payload),
        onSettled: () => {
            const base = ['session', user?.id ?? 'anonymous', 'admin-marketplace'];
            void qc.invalidateQueries({queryKey: [...base, 'dispatch']});
            void qc.invalidateQueries({queryKey: [...base, 'orders']});
            void qc.invalidateQueries({queryKey: [...base, 'stats']});
        },
    });
}

export function useAutoDispatchOrder() {
    const {user} = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({missionId, payload}: { missionId: number; payload?: AutoDispatchInput }) =>
            adminMarketplaceApi.dispatchAuto(missionId, payload),
        onSettled: () => {
            const base = ['session', user?.id ?? 'anonymous', 'admin-marketplace'];
            void qc.invalidateQueries({queryKey: [...base, 'dispatch']});
            void qc.invalidateQueries({queryKey: [...base, 'orders']});
            void qc.invalidateQueries({queryKey: [...base, 'stats']});
        },
    });
}

export function useAdminMarketplaceStats() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'stats'],
        queryFn: ({signal}) => adminMarketplaceApi.getStats(signal),
        enabled: permissionsReady && can('MARKETPLACE_MODERATE'),
    });
}

export function useAdminMarketplaceOrders(filter: AdminOrderFilter) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'orders', filter],
        queryFn: ({signal}) => adminMarketplaceApi.listOrders(filter, signal),
        placeholderData: keepPreviousData,
        enabled: permissionsReady && (can('MISSION_VIEW') || can('MARKETPLACE_MODERATE')),
    });
}

export function useAdminMarketplaceOrderDetail(id: number | null) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-marketplace', 'order', id],
        queryFn: ({signal}) => adminMarketplaceApi.getOrderDetail(id as number, signal),
        enabled:
            id !== null &&
            id > 0 &&
            permissionsReady &&
            (can('MISSION_VIEW') || can('MARKETPLACE_MODERATE')),
    });
}

export function useCancelMarketplaceOrder() {
    const {user} = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({id, reason}: { id: number; reason: string }) =>
            adminMarketplaceApi.cancelOrder(id, reason),
        onSettled: (_data, _err, vars) => {
            const base = ['session', user?.id ?? 'anonymous', 'admin-marketplace'];
            void qc.invalidateQueries({queryKey: [...base, 'orders']});
            void qc.invalidateQueries({queryKey: [...base, 'order', vars.id]});
            void qc.invalidateQueries({queryKey: [...base, 'dispatch']});
            void qc.invalidateQueries({queryKey: [...base, 'stats']});
        },
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

export function useOpenProviderDocument() {
    return async (doc: AdminProviderDocument, fallbackError: string) => {
        const directHref = doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl) ? doc.fileUrl : null;
        if (directHref) {
            window.open(directHref, '_blank', 'noopener,noreferrer');
            return;
        }
        if (!doc.mediaAssetId) {
            toast.error(fallbackError);
            return;
        }
        const tab = window.open('about:blank', '_blank');
        if (tab) tab.opener = null;
        try {
            const {url} = await adminMarketplaceApi.mediaDownloadUrl(doc.mediaAssetId);
            if (tab) tab.location.href = url;
            else window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            tab?.close();
            toast.error(error instanceof Error && error.message ? error.message : fallbackError);
        }
    };
}
