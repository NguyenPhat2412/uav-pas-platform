import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {Mission} from '@/shared/types/mission.types';
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
    PricingModel,
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
} from '@/shared/types/marketplace.types';

export type ProviderPilotStatus = 'AVAILABLE' | 'IN_FLIGHT' | 'OFF_DUTY';

export interface ProviderPilot {
    id: number;
    providerId?: number | null;
    userId?: number | null;
    pilotUserId?: number | null;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    licenseNumber?: string | null;
    specialization?: string | null;
    status: ProviderPilotStatus;
    assignedUavId?: number | null;
    assignedUavModel?: string | null;
    completedMissionsCount?: number;
    createdAt?: string;
}

export interface ProviderPilotUpsertInput {
    userId?: number;
    pilotUserId?: number;
    fullName: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
    status?: ProviderPilotStatus;
    assignedUavId?: number | null;
}

export interface CreateListingFromTemplateInput {
    serviceOfferingId: number;
    title?: string;
    province?: string;
    serviceRadiusKm?: number;
    basePriceVnd?: number;
    pricingModel?: PricingModel;
    minBookingUnits?: number;
    deliverySlaHours?: number;
    onSiteSlaHours?: number;
    equipmentSpecs?: string;
    deliverablesSummary?: string;
    coverImageUrl?: string;
    submitForReview?: boolean;
}

export interface ProviderOrderAssignInput {
    pilotId?: number;
    pilotUserId?: number;
    uavId: number;
    note?: string;
}

const PROVIDER_ROOT = '/api/v1/marketplace/provider';

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
    createListingFromTemplate: (payload: CreateListingFromTemplateInput) =>
        apiClient.post<MarketplaceListing>(`${PROVIDER_ROOT}/listings/from-template`, payload),
    updateListing: (id: number, payload: MarketplaceListingUpsertInput) =>
        apiClient.put<MarketplaceListing>(
            API_ROUTES.marketplace.providerListingById(id),
            payload,
        ),
    deleteListing: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerListingById(id)),
    toggleListingPause: (id: number) =>
        apiClient.patch<MarketplaceListing>(API_ROUTES.marketplace.providerListingPause(id)),

    getMyFleet: (signal?: AbortSignal) =>
        apiClient.get<ProviderFleetSummary>(API_ROUTES.marketplace.providerFleet, {signal}),
    registerUav: (payload: ProviderUavCreateInput) =>
        apiClient.post<ProviderUav>(API_ROUTES.marketplace.providerFleetUavs, payload),
    deleteUav: (id: number) =>
        apiClient.delete<void>(`${API_ROUTES.marketplace.providerFleetUavs}/${id}`),
    registerEquipment: (payload: ProviderEquipmentCreateInput) =>
        apiClient.post<ProviderEquipment>(API_ROUTES.marketplace.providerFleetEquipment, payload),

    listMyPilots: async (signal?: AbortSignal): Promise<ProviderPilot[]> => {
        const res = await apiClient.get<ProviderPilot[] | { content?: ProviderPilot[] }>(
            `${PROVIDER_ROOT}/pilots`,
            {signal},
        );
        return Array.isArray(res) ? res : res?.content ?? [];
    },
    createPilot: (payload: ProviderPilotUpsertInput) =>
        apiClient.post<ProviderPilot>(`${PROVIDER_ROOT}/pilots`, payload),
    updatePilot: (id: number, payload: Partial<ProviderPilotUpsertInput>) =>
        apiClient.patch<ProviderPilot>(`${PROVIDER_ROOT}/pilots/${id}`, payload),
    deletePilot: (id: number) =>
        apiClient.delete<void>(`${PROVIDER_ROOT}/pilots/${id}`),

    listMyOrders: (signal?: AbortSignal) =>
        apiClient.get<Mission[]>(API_ROUTES.marketplace.providerOrders, {signal}),
    respondToOrder: (missionId: number, payload: ProviderOrderActionInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderRespond(missionId), payload),
    assignOrder: (missionId: number, payload: ProviderOrderAssignInput) =>
        apiClient.post<Mission>(`${PROVIDER_ROOT}/orders/${missionId}/assign`, payload),
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
