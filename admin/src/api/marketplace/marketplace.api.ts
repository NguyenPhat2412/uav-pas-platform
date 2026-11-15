import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    AdminListingPage,
    AdminMarketplaceListing,
    AdminPayoutPage,
    AdminProviderPage,
    AdminProviderPayout,
    AdminProviderProfile,
    ListingModerationInput,
    ListingModerationStatus,
    PayoutProcessInput,
    PayoutStatus,
    ProviderModerationInput,
    ProviderVerificationStatus,
} from '@/types/marketplace/marketplace.types';

export const adminMarketplaceApi = {
    listProviders: (params: { status?: ProviderVerificationStatus | ''; keyword?: string; page?: number; size?: number }) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim());
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminProviderPage>(`${API_ROUTES.adminMarketplace.providers}?${qs.toString()}`);
    },
    moderateProvider: (id: number, payload: ProviderModerationInput) =>
        apiClient.patch<AdminProviderProfile>(API_ROUTES.adminMarketplace.moderateProvider(id), payload),

    listListings: (params: { status?: ListingModerationStatus | ''; keyword?: string; page?: number; size?: number }) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim());
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminListingPage>(`${API_ROUTES.adminMarketplace.listings}?${qs.toString()}`);
    },
    moderateListing: (id: number, payload: ListingModerationInput) =>
        apiClient.patch<AdminMarketplaceListing>(API_ROUTES.adminMarketplace.moderateListing(id), payload),

    listPayouts: (params: { status?: PayoutStatus | ''; page?: number; size?: number }) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminPayoutPage>(`${API_ROUTES.adminMarketplace.payouts}?${qs.toString()}`);
    },
    processPayout: (id: number, payload: PayoutProcessInput) =>
        apiClient.post<AdminProviderPayout>(API_ROUTES.adminMarketplace.processPayout(id), payload),
};
