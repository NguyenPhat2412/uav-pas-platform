'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminMarketplaceApi} from '@/api/marketplace/marketplace.api';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';
import type {
    AdminProviderDocument,
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
