import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    AdminCustomerProjectPage,
    AdminDispatchQueuePage,
    AdminListingPage,
    AdminMarketplaceListing,
    AdminMarketplaceOrder,
    AdminMarketplaceOrderPage,
    AdminMarketplaceStats,
    AdminOrderFilter,
    AdminPayoutPage,
    AdminProjectFilter,
    AdminProjectSubscriptionPage,
    AdminProviderPage,
    AdminProviderPayout,
    AdminProviderProfile,
    AdminSubscriptionStatus,
    AutoDispatchInput,
    ListingModerationInput,
    ListingModerationStatus,
    ManualDispatchInput,
    PayoutProcessInput,
    PayoutStatus,
    ProviderModerationInput,
    ProviderVerificationStatus,
    SignedMediaDownloadUrl,
} from '@/types/marketplace/marketplace.types';

export const adminMarketplaceApi = {
    listProviders: (
        params: { status?: ProviderVerificationStatus | ''; keyword?: string; page?: number; size?: number },
        signal?: AbortSignal,
    ) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim());
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminProviderPage>(`${API_ROUTES.adminMarketplace.providers}?${qs.toString()}`, {signal});
    },
    moderateProvider: (id: number, payload: ProviderModerationInput) =>
        apiClient.patch<AdminProviderProfile>(API_ROUTES.adminMarketplace.moderateProvider(id), payload),
    moderateProviderDocument: (
        providerId: number,
        docId: number,
        payload: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; reviewerNote?: string },
    ) =>
        apiClient.patch(API_ROUTES.adminMarketplace.moderateProviderDocument(providerId, docId), payload),

    listListings: (
        params: { status?: ListingModerationStatus | ''; keyword?: string; page?: number; size?: number },
        signal?: AbortSignal,
    ) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim());
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminListingPage>(`${API_ROUTES.adminMarketplace.listings}?${qs.toString()}`, {signal});
    },
    moderateListing: (id: number, payload: ListingModerationInput) =>
        apiClient.patch<AdminMarketplaceListing>(API_ROUTES.adminMarketplace.moderateListing(id), payload),

    listDispatchQueue: (params: { page?: number; size?: number }, signal?: AbortSignal) => {
        const qs = new URLSearchParams();
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminDispatchQueuePage>(`${API_ROUTES.adminMarketplace.dispatch}?${qs.toString()}`, {signal});
    },
    dispatchManual: (missionId: number, payload: ManualDispatchInput) =>
        apiClient.post<AdminMarketplaceOrder>(API_ROUTES.adminMarketplace.dispatchMission(missionId), payload),
    dispatchAuto: (missionId: number, payload?: AutoDispatchInput) =>
        apiClient.post<AdminMarketplaceOrder>(API_ROUTES.adminMarketplace.dispatchMissionAuto(missionId), payload ?? {}),

    getStats: (signal?: AbortSignal) =>
        apiClient.get<AdminMarketplaceStats>(API_ROUTES.adminMarketplace.stats, {signal}),

    listOrders: (filter: AdminOrderFilter, signal?: AbortSignal) => {
        const qs = new URLSearchParams();
        if (filter.status) qs.set('status', filter.status);
        if (filter.projectId?.trim()) qs.set('projectId', filter.projectId.trim());
        if (filter.providerId?.trim()) qs.set('providerId', filter.providerId.trim());
        if (filter.search?.trim()) qs.set('search', filter.search.trim());
        qs.set('page', String(filter.page ?? 0));
        qs.set('size', String(filter.size ?? 20));
        return apiClient.get<AdminMarketplaceOrderPage>(`${API_ROUTES.missions.list}?${qs.toString()}`, {signal});
    },
    getOrderDetail: (id: number, signal?: AbortSignal) =>
        apiClient.get<AdminMarketplaceOrder>(API_ROUTES.missions.detail(id), {signal}),
    cancelOrder: (id: number, reason: string) =>
        apiClient.post<AdminMarketplaceOrder>(API_ROUTES.missions.cancel(id), {reason}),

    listPayouts: (params: { status?: PayoutStatus | ''; page?: number; size?: number }, signal?: AbortSignal) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminPayoutPage>(`${API_ROUTES.adminMarketplace.payouts}?${qs.toString()}`, {signal});
    },
    processPayout: (id: number, payload: PayoutProcessInput) =>
        apiClient.post<AdminProviderPayout>(API_ROUTES.adminMarketplace.processPayout(id), payload),

    mediaDownloadUrl: (mediaId: number) =>
        apiClient.get<SignedMediaDownloadUrl>(API_ROUTES.media.downloadUrl(mediaId)),

    listCustomerProjects: (filter: AdminProjectFilter, signal?: AbortSignal) => {
        const qs = new URLSearchParams();
        if (filter.keyword?.trim()) qs.set('q', filter.keyword.trim());
        if (filter.province?.trim()) qs.set('province', filter.province.trim());
        if (filter.status) qs.set('status', filter.status);
        qs.set('page', String(filter.page ?? 0));
        qs.set('size', String(filter.size ?? 20));
        return apiClient.get<AdminCustomerProjectPage>(`${API_ROUTES.projects.list}?${qs.toString()}`, {signal});
    },
    listProjectSubscriptions: (
        projectId: number,
        params: { status?: AdminSubscriptionStatus | ''; page?: number; size?: number },
        signal?: AbortSignal,
    ) => {
        const qs = new URLSearchParams();
        if (params.status) qs.set('status', params.status);
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 20));
        return apiClient.get<AdminProjectSubscriptionPage>(
            `${API_ROUTES.projects.subscriptions(projectId)}?${qs.toString()}`,
            {signal},
        );
    },
    cancelProjectSubscription: (projectId: number, subscriptionId: number) =>
        apiClient.delete<void>(API_ROUTES.projects.subscriptionById(projectId, subscriptionId)),
};
