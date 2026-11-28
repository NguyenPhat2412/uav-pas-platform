import {apiClient, API_ROUTES} from '@/lib/api';
import type {Mission} from '@/types/mission.types';
import type {
    MarketplaceListing,
    MarketplaceListingDetail,
    MarketplaceListingPage,
    MarketplaceListingUpsertInput,
    MarketplaceStorefront,
    MissionBid,
    MissionBidCreateInput,
    PayoutCreateInput,
    ProviderDocument,
    ProviderDocumentInput,
    ProviderEquipment,
    ProviderEquipmentCreateInput,
    ProviderFleetSummary,
    ProviderOnboardingInput,
    ProviderOrderActionInput,
    ProviderOrderCompleteInput,
    ProviderPayout,
    ProviderProfile,
    ProviderUav,
    ProviderUavCreateInput,
    ProviderWallet,
    PublicListingFilters,
} from '@/types/marketplace.types';

function toQueryString(filters: PublicListingFilters = {}): string {
    const params = new URLSearchParams();
    const search = (filters.q ?? filters.keyword ?? '').trim();
    if (search) {
        params.set('keyword', search);
        params.set('q', search);
    }
    if (filters.listingType) params.set('listingType', filters.listingType);
    if (filters.missionType) {
        params.set('missionType', filters.missionType);
        params.set('category', filters.missionType);
    } else if (filters.category?.trim()) {
        params.set('category', filters.category.trim());
    }
    if (filters.pricingModel) params.set('pricingModel', filters.pricingModel);
    if (filters.province?.trim()) params.set('province', filters.province.trim());
    if (filters.maxPriceVnd !== '' && filters.maxPriceVnd != null) params.set('maxPriceVnd', String(filters.maxPriceVnd));
    if (filters.categoryServiceId !== '' && filters.categoryServiceId != null) {
        params.set('categoryServiceId', String(filters.categoryServiceId));
    }
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    params.set('page', String(filters.page ?? 0));
    params.set('size', String(filters.size ?? 12));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

export const marketplaceApi = {
    listPublicListings: (filters: PublicListingFilters = {}) =>
        apiClient.get<MarketplaceListingPage>(`${API_ROUTES.marketplace.publicListings}${toQueryString(filters)}`),
    getPublicListingBySlug: (slug: string) =>
        apiClient.get<MarketplaceListingDetail>(API_ROUTES.marketplace.publicListingBySlug(slug)),
    getPublicProviderBySlug: (slug: string) =>
        apiClient.get<MarketplaceStorefront>(API_ROUTES.marketplace.publicProviderBySlug(slug)),

    getMyProfile: async () => (await apiClient.get<ProviderProfile | undefined>(API_ROUTES.marketplace.providerMe)) ?? null,
    upsertMyProfile: (payload: ProviderOnboardingInput) =>
        apiClient.put<ProviderProfile>(API_ROUTES.marketplace.providerMe, payload),
    addDocument: (payload: ProviderDocumentInput) =>
        apiClient.post<ProviderDocument>(API_ROUTES.marketplace.providerDocuments, payload),
    deleteDocument: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerDocumentById(id)),

    listMyListings: () =>
        apiClient.get<MarketplaceListing[]>(API_ROUTES.marketplace.providerListings),
    createListing: (payload: MarketplaceListingUpsertInput) =>
        apiClient.post<MarketplaceListing>(API_ROUTES.marketplace.providerListings, payload),
    updateListing: (id: number, payload: MarketplaceListingUpsertInput) =>
        apiClient.put<MarketplaceListing>(API_ROUTES.marketplace.providerListingById(id), payload),
    toggleListingPause: (id: number) =>
        apiClient.patch<MarketplaceListing>(API_ROUTES.marketplace.providerListingPause(id)),

    getMyFleet: () =>
        apiClient.get<ProviderFleetSummary>(API_ROUTES.marketplace.providerFleet),
    registerUav: (payload: ProviderUavCreateInput) =>
        apiClient.post<ProviderUav>(API_ROUTES.marketplace.providerFleetUavs, payload),
    registerEquipment: (payload: ProviderEquipmentCreateInput) =>
        apiClient.post<ProviderEquipment>(API_ROUTES.marketplace.providerFleetEquipment, payload),

    listMyOrders: () =>
        apiClient.get<Mission[]>(API_ROUTES.marketplace.providerOrders),
    respondToOrder: (missionId: number, payload: ProviderOrderActionInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderRespond(missionId), payload),
    startOrder: (missionId: number) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderStart(missionId)),
    completeOrder: (missionId: number, payload: ProviderOrderCompleteInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderComplete(missionId), payload),

    listOpenRfqs: () =>
        apiClient.get<Mission[]>(API_ROUTES.marketplace.providerOpenRfq),
    submitBid: (missionId: number, payload: MissionBidCreateInput) =>
        apiClient.post<MissionBid>(API_ROUTES.marketplace.providerSubmitBid(missionId), payload),
    listMyBids: () =>
        apiClient.get<MissionBid[]>(API_ROUTES.marketplace.providerMyBids),

    getMyWallet: () =>
        apiClient.get<ProviderWallet>(API_ROUTES.marketplace.providerWallet),
    requestPayout: (payload: PayoutCreateInput) =>
        apiClient.post<ProviderPayout>(API_ROUTES.marketplace.providerPayouts, payload),

    listMissionBids: (missionId: number) =>
        apiClient.get<MissionBid[]>(API_ROUTES.marketplace.rfqMissionBids(missionId)),
    acceptMissionBid: (missionId: number, bidId: number) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.rfqAcceptBid(missionId, bidId)),
};
