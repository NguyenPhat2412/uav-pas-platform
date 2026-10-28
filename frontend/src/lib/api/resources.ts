// Canonical Operations API endpoints (/api/v1/stations, /api/v1/uavs, /api/v1/inventory, /api/v1/media, /api/v1/audit-logs)
import {apiClient, API_ROUTES} from '@/lib/api';
import {uavChangeReason} from "@/features/uavs/utils/workflows";
import type {
    AuditLog,
    Equipment,
    InventoryMovement,
    MediaAsset,
    MediaInput,
    Operator,
    PageResponse,
    QuantityInput,
    Station,
    Uav,
    UavHistory
} from "@/types/resources";
import type {
    TrainingDocument,
    TrainingOverview,
    TrainingPortalTier,
    UpdateTrainingProgressPayload,
    UpsertTrainingDocumentPayload,
} from "@/features/training/types/training.types";

export type {MediaInput, QuantityInput};

export const operationsService = {
    listStations: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Station>>(`${API_ROUTES.stations.list}?page=${page}&size=${size}`, {signal}),
    station: (id: number, signal?: AbortSignal) => apiClient.get<Station>(API_ROUTES.stations.detail(id), {signal}),
    listUavs: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Uav>>(`${API_ROUTES.uavs.list}?page=${page}&size=${size}`, {signal}),
    uav: (id: number, signal?: AbortSignal) => apiClient.get<Uav>(API_ROUTES.uavs.detail(id), {signal}),
    uavHistory: (id: number, page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<UavHistory>>(`${API_ROUTES.uavs.history(id)}?page=${page}&size=20`, {signal}),
    listEquipment: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Equipment>>(`${API_ROUTES.inventory.equipment}?page=${page}&size=${size}`, {signal}),
    inventoryHistory: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<InventoryMovement>>(`${API_ROUTES.inventory.equipmentHistory}?page=${page}&size=20`, {signal}),
    listOperators: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Operator>>(`${API_ROUTES.users.list}?role=ROLE_OPERATOR&page=${page}&size=${size}`, {signal}),
    createStation: (data: {
        code: string;
        name: string;
        address?: string;
        latitude?: number;
        longitude?: number
    }) => apiClient.post<Station>(API_ROUTES.stations.list, data),
    createUav: (data: {
        model: string;
        serialNumber: string;
        manufacturer: string
    }) => apiClient.post<Uav>(API_ROUTES.uavs.list, data),
    createEquipment: (data: {
        name: string;
        type: string;
        serialNumber?: string;
        stationId?: number
    }) => apiClient.post<Equipment>(API_ROUTES.inventory.equipment, data),
    stockIn: (id: number, quantity: number) =>
        apiClient.post<Equipment>(API_ROUTES.inventory.equipmentStockIn(id), {
            quantity,
            requestId: crypto.randomUUID()
        }),
    reserve: (id: number, quantity: number) =>
        apiClient.post<Equipment>(API_ROUTES.inventory.equipmentReserve(id), {
            quantity,
            requestId: crypto.randomUUID()
        }),
    release: (id: number, quantity: number) =>
        apiClient.post<Equipment>(API_ROUTES.inventory.equipmentRelease(id), {
            quantity,
            requestId: crypto.randomUUID()
        }),
    moveEquipment: ({id, action, stationId, ...quantity}: QuantityInput & {
        id: number;
        action: string;
        stationId?: number
    }) => apiClient.post<Equipment>(API_ROUTES.inventory.equipmentMove(id, action, stationId), quantity),
    maintenanceUav: ({id, reason, expectedStatus}: {
        id: number;
        reason: string;
        expectedStatus: string
    }) => {
        const params = new URLSearchParams({
            reason: uavChangeReason(reason),
            expectedStatus
        });
        return apiClient.post<Uav>(`${API_ROUTES.uavs?.maintenance(id) ?? `/api/v1/uavs/${id}/maintenance`}?${params}`);
    },
    completeUavMaintenance: ({id, reason, expectedStatus}: {
        id: number;
        reason: string;
        expectedStatus: string
    }) => {
        const params = new URLSearchParams({
            status: 'AVAILABLE',
            reason: uavChangeReason(reason),
            expectedStatus
        });
        return apiClient.put<Uav>(`${API_ROUTES.uavs?.status(id) ?? `/api/v1/uavs/${id}/status`}?${params}`);
    },
    assignUav: (id: number, stationId: number) => apiClient.put<Uav>(API_ROUTES.uavs.station(id, stationId)),
    listMedia: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<MediaAsset>>(`${API_ROUTES.media.list}?page=${page}&size=20`, {signal}),
    registerMedia: (data: MediaInput) => apiClient.post<MediaAsset>(API_ROUTES.media.list, data),
    uploadUrl: (id: number) => apiClient.get<{ url: string }>(API_ROUTES.media.uploadUrl(id)),
    confirmMedia: (id: number) => apiClient.post<MediaAsset>(API_ROUTES.media.confirm(id)),
    downloadUrl: (id: number) => apiClient.get<{ url: string }>(API_ROUTES.media.downloadUrl(id)),
    deleteMedia: (id: number) => apiClient.delete<void>(API_ROUTES.media.detail(id)),
    listAudit: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<AuditLog>>(`${API_ROUTES.auditLogs.list}?page=${page}&size=20`, {signal}),
};

export const trainingService = {
    getOverview: (
        params: {portal: TrainingPortalTier; category?: string; search?: string},
        signal?: AbortSignal,
    ) => {
        const query = new URLSearchParams({portal: params.portal});
        if (params.category && params.category !== 'ALL') {
            query.set('category', params.category);
        }
        if (params.search && params.search.trim()) {
            query.set('search', params.search.trim());
        }
        return apiClient.get<TrainingOverview>(`${API_ROUTES.training.list}?${query.toString()}`, {signal});
    },

    getByCode: (codeOrSlug: string, signal?: AbortSignal) =>
        apiClient.get<TrainingDocument>(API_ROUTES.training.byCode(codeOrSlug), {signal}),

    updateProgress: (documentId: number, payload: UpdateTrainingProgressPayload) =>
        apiClient.put<TrainingDocument>(API_ROUTES.training.progress(documentId), payload),

    createDocument: (payload: UpsertTrainingDocumentPayload) =>
        apiClient.post<TrainingDocument>(API_ROUTES.training.list, payload),

    updateDocument: (id: number, payload: UpsertTrainingDocumentPayload) =>
        apiClient.put<TrainingDocument>(API_ROUTES.training.byId(id), payload),
};
