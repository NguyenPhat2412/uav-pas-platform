import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {Mission} from '@/shared/types/mission/mission.types';
import type {
    AdminPayoutPage,
    AdminProviderPage,
    ListingModerationInput,
    ListingModerationStatus,
    MarketplaceListing,
    MarketplaceListingDetail,
    MarketplaceListingPage,
    MarketplaceListingUpsertInput,
    MarketplaceStorefront,
    MissionBid,
    MissionBidCreateInput,
    PayoutCreateInput,
    PayoutProcessInput,
    PayoutStatus,
    ProviderDocument,
    ProviderDocumentInput,
    ProviderEquipment,
    ProviderEquipmentCreateInput,
    ProviderFleetSummary,
    ProviderModerationInput,
    ProviderOnboardingInput,
    ProviderOrderActionInput,
    ProviderOrderCompleteInput,
    ProviderPayout,
    ProviderProfile,
    ProviderUav,
    ProviderUavCreateInput,
    ProviderVerificationStatus,
    ProviderWallet,
    PublicListingFilters,
} from '@/shared/types/marketplace/marketplace.types';

function listingQuery(filters: PublicListingFilters = {}): string {
    const qs = buildQueryString({
        keyword: filters.keyword?.trim() || undefined,
        listingType: filters.listingType || undefined,
        missionType: filters.missionType || undefined,
        pricingModel: filters.pricingModel || undefined,
        province: filters.province?.trim() || undefined,
        maxPriceVnd:
            filters.maxPriceVnd !== '' && filters.maxPriceVnd != null
                ? filters.maxPriceVnd
                : undefined,
        categoryServiceId:
            filters.categoryServiceId !== '' && filters.categoryServiceId != null
                ? filters.categoryServiceId
                : undefined,
        sortBy: filters.sortBy || undefined,
        page: filters.page ?? 0,
        size: filters.size ?? 15,
    });
    return qs ? `?${qs}` : '';
}

export const mobileMarketplaceApi = {
    listPublicListings: (filters: PublicListingFilters = {}, signal?: AbortSignal) =>
        apiClient.get<MarketplaceListingPage>(
            `${API_ROUTES.marketplace.publicListings}${listingQuery(filters)}`,
            {signal},
        ),
    getPublicListingBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<MarketplaceListingDetail>(
            API_ROUTES.marketplace.publicListingBySlug(slug),
            {signal},
        ),
    getPublicProviderBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<MarketplaceStorefront>(
            API_ROUTES.marketplace.publicProviderBySlug(slug),
            {signal},
        ),

    getMyProfile: async (signal?: AbortSignal) =>
        (await apiClient.get<ProviderProfile | undefined>(API_ROUTES.marketplace.providerMe, {
            signal,
        })) ?? null,
    upsertMyProfile: (payload: ProviderOnboardingInput) =>
        apiClient.put<ProviderProfile>(API_ROUTES.marketplace.providerMe, payload),
    addDocument: (payload: ProviderDocumentInput) =>
        apiClient.post<ProviderDocument>(API_ROUTES.marketplace.providerDocuments, payload),
    deleteDocument: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerDocumentById(id)),

    listMyListings: (signal?: AbortSignal) =>
        apiClient.get<MarketplaceListing[]>(API_ROUTES.marketplace.providerListings, {signal}),
    createListing: (payload: MarketplaceListingUpsertInput) =>
        apiClient.post<MarketplaceListing>(API_ROUTES.marketplace.providerListings, payload),
    updateListing: (id: number, payload: MarketplaceListingUpsertInput) =>
        apiClient.put<MarketplaceListing>(
            API_ROUTES.marketplace.providerListingById(id),
            payload,
        ),
    toggleListingPause: (id: number) =>
        apiClient.patch<MarketplaceListing>(API_ROUTES.marketplace.providerListingPause(id)),

    getMyFleet: (signal?: AbortSignal) =>
        apiClient.get<ProviderFleetSummary>(API_ROUTES.marketplace.providerFleet, {signal}),
    registerUav: (payload: ProviderUavCreateInput) =>
        apiClient.post<ProviderUav>(API_ROUTES.marketplace.providerFleetUavs, payload),
    registerEquipment: (payload: ProviderEquipmentCreateInput) =>
        apiClient.post<ProviderEquipment>(API_ROUTES.marketplace.providerFleetEquipment, payload),

    listMyOrders: (signal?: AbortSignal) =>
        apiClient.get<Mission[]>(API_ROUTES.marketplace.providerOrders, {signal}),
    respondToOrder: (missionId: number, payload: ProviderOrderActionInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderRespond(missionId), payload),
    startOrder: (missionId: number) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderStart(missionId)),
    completeOrder: (missionId: number, payload: ProviderOrderCompleteInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderComplete(missionId), payload),

    listOpenRfqs: (signal?: AbortSignal) =>
        apiClient.get<Mission[]>(API_ROUTES.marketplace.providerOpenRfq, {signal}),
    submitBid: (missionId: number, payload: MissionBidCreateInput) =>
        apiClient.post<MissionBid>(API_ROUTES.marketplace.providerSubmitBid(missionId), payload),
    listMyBids: (signal?: AbortSignal) =>
        apiClient.get<MissionBid[]>(API_ROUTES.marketplace.providerMyBids, {signal}),

    getMyWallet: (signal?: AbortSignal) =>
        apiClient.get<ProviderWallet>(API_ROUTES.marketplace.providerWallet, {signal}),
    requestPayout: (payload: PayoutCreateInput) =>
        apiClient.post<ProviderPayout>(API_ROUTES.marketplace.providerPayouts, payload),

    listMissionBids: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<MissionBid[]>(API_ROUTES.marketplace.rfqMissionBids(missionId), {signal}),
    acceptMissionBid: (missionId: number, bidId: number) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.rfqAcceptBid(missionId, bidId)),

    adminProviders: (status?: ProviderVerificationStatus | '', signal?: AbortSignal) =>
        apiClient.get<AdminProviderPage>(
            `${API_ROUTES.adminMarketplace.providers}?${buildQueryString({
                status: status || undefined,
                page: 0,
                size: 20,
            })}`,
            {signal},
        ),
    adminModerateProvider: (id: number, payload: ProviderModerationInput) =>
        apiClient.patch<ProviderProfile>(
            API_ROUTES.adminMarketplace.moderateProvider(id),
            payload,
        ),
    adminListings: (status?: ListingModerationStatus | '', signal?: AbortSignal) =>
        apiClient.get<MarketplaceListingPage>(
            `${API_ROUTES.adminMarketplace.listings}?${buildQueryString({
                status: status || undefined,
                page: 0,
                size: 20,
            })}`,
            {signal},
        ),
    adminModerateListing: (id: number, payload: ListingModerationInput) =>
        apiClient.patch<MarketplaceListing>(
            API_ROUTES.adminMarketplace.moderateListing(id),
            payload,
        ),
    adminPayouts: (status?: PayoutStatus | '', signal?: AbortSignal) =>
        apiClient.get<AdminPayoutPage>(
            `${API_ROUTES.adminMarketplace.payouts}?${buildQueryString({
                status: status || undefined,
                page: 0,
                size: 20,
            })}`,
            {signal},
        ),
    adminProcessPayout: (id: number, payload: PayoutProcessInput) =>
        apiClient.post<ProviderPayout>(API_ROUTES.adminMarketplace.processPayout(id), payload),
};
