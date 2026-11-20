import {apiClient, API_ROUTES} from '@/lib/api';
import type {Mission, PageResponse, UavService} from '@/types/mission/mission.types';
import type {
    MarketplaceListing,
    MarketplaceListingFromTemplateInput,
    MarketplaceListingUpsertInput,
    ProviderDocument,
    ProviderDocumentInput,
    ProviderEquipment,
    ProviderEquipmentCreateInput,
    ProviderFleetSummary,
    ProviderOnboardingInput,
    ProviderOrderActionInput,
    ProviderOrderAssignInput,
    ProviderOrderCompleteInput,
    ProviderPilot,
    ProviderPilotUpsertInput,
    ProviderProfile,
    ProviderUav,
    ProviderUavCreateInput,
    ProviderUavUpdateInput,
    ProviderWallet,
} from '@/types/marketplace/marketplace.types';

function unwrapList<T>(res: T[] | PageResponse<T> | null | undefined): T[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.content)) return res.content;
    return [];
}

export const marketplaceApi = {
    // 1. Hồ sơ & Giấy tờ đối tác (/api/v1/marketplace/provider/me & /documents)
    getMyProfile: async () => (await apiClient.get<ProviderProfile | undefined>(API_ROUTES.marketplace.providerMe)) ?? null,
    upsertMyProfile: (payload: ProviderOnboardingInput) =>
        apiClient.put<ProviderProfile>(API_ROUTES.marketplace.providerMe, payload),
    listDocuments: async () => {
        const res = await apiClient.get<ProviderDocument[] | PageResponse<ProviderDocument>>(API_ROUTES.marketplace.providerDocuments);
        return unwrapList(res);
    },
    addDocument: (payload: ProviderDocumentInput) =>
        apiClient.post<ProviderDocument>(API_ROUTES.marketplace.providerDocuments, payload),
    deleteDocument: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerDocumentById(id)),

    // 2. Dịch vụ của tôi (/api/v1/marketplace/provider/listings & /from-template)
    listServiceTemplates: () =>
        apiClient.get<UavService[]>(API_ROUTES.uavServices.list),
    listMyListings: async () => {
        const res = await apiClient.get<MarketplaceListing[] | PageResponse<MarketplaceListing>>(API_ROUTES.marketplace.providerListings);
        return unwrapList(res);
    },
    createListing: (payload: MarketplaceListingUpsertInput) =>
        apiClient.post<MarketplaceListing>(API_ROUTES.marketplace.providerListings, payload),
    createListingFromTemplate: (payload: MarketplaceListingFromTemplateInput) =>
        apiClient.post<MarketplaceListing>(API_ROUTES.marketplace.providerListingsFromTemplate, payload),
    updateListing: (id: number, payload: MarketplaceListingUpsertInput) =>
        apiClient.put<MarketplaceListing>(API_ROUTES.marketplace.providerListingById(id), payload),
    toggleListingPause: (id: number) =>
        apiClient.patch<MarketplaceListing>(API_ROUTES.marketplace.providerListingPause(id)),
    deleteListing: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerListingById(id)),

    // 3. Đội UAV & Thiết bị (/api/v1/marketplace/provider/fleet & /fleet/uavs)
    getMyFleet: () =>
        apiClient.get<ProviderFleetSummary>(API_ROUTES.marketplace.providerFleet),
    listProviderUavs: async () => {
        const res = await apiClient.get<ProviderUav[] | PageResponse<ProviderUav> | ProviderFleetSummary>(
            API_ROUTES.marketplace.providerFleetUavs,
        );
        if (res && typeof res === 'object' && 'uavs' in res && Array.isArray(res.uavs)) {
            return res.uavs;
        }
        return unwrapList(res as ProviderUav[] | PageResponse<ProviderUav>);
    },
    registerUav: (payload: ProviderUavCreateInput) =>
        apiClient.post<ProviderUav>(API_ROUTES.marketplace.providerFleetUavs, payload),
    updateUav: (id: number, payload: ProviderUavUpdateInput) =>
        apiClient.patch<ProviderUav>(API_ROUTES.marketplace.providerFleetUavById(id), payload),
    deleteUav: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerFleetUavById(id)),
    registerEquipment: (payload: ProviderEquipmentCreateInput) =>
        apiClient.post<ProviderEquipment>(API_ROUTES.marketplace.providerFleetEquipment, payload),
    deleteEquipment: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerFleetEquipmentById(id)),

    // 4. Kỹ sư điều khiển (/api/v1/marketplace/provider/pilots)
    listPilots: async () => {
        const res = await apiClient.get<ProviderPilot[] | PageResponse<ProviderPilot>>(API_ROUTES.marketplace.providerPilots);
        return unwrapList(res);
    },
    createPilot: (payload: ProviderPilotUpsertInput) =>
        apiClient.post<ProviderPilot>(API_ROUTES.marketplace.providerPilots, payload),
    updatePilot: (id: number, payload: Partial<ProviderPilotUpsertInput>) =>
        apiClient.patch<ProviderPilot>(API_ROUTES.marketplace.providerPilotById(id), payload),
    deletePilot: (id: number) =>
        apiClient.delete<void>(API_ROUTES.marketplace.providerPilotById(id)),

    // 5. Đơn được giao (/api/v1/marketplace/provider/orders)
    listMyOrders: async () => {
        const res = await apiClient.get<Mission[] | PageResponse<Mission>>(API_ROUTES.marketplace.providerOrders);
        return unwrapList(res);
    },
    respondToOrder: (missionId: number, payload: ProviderOrderActionInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderRespond(missionId), payload),
    assignOrderResources: (missionId: number, payload: ProviderOrderAssignInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderAssign(missionId), payload),
    startOrder: (missionId: number) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderStart(missionId)),
    completeOrder: (missionId: number, payload: ProviderOrderCompleteInput) =>
        apiClient.post<Mission>(API_ROUTES.marketplace.providerOrderComplete(missionId), payload),

    // 6. Ví & Đối soát minh hoạ (/api/v1/marketplace/provider/wallet)
    getMyWallet: () =>
        apiClient.get<ProviderWallet>(API_ROUTES.marketplace.providerWallet),
};
