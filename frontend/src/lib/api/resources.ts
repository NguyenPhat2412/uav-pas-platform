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
    AdminTrainingLesson,
    TrainingAssetConfirmation,
    TrainingAssetUploadRequest,
    TrainingAssetUploadTicket,
    TrainingCourseDetail,
    TrainingCourseSummary,
    TrainingDocument,
    TrainingLessonDetail,
    TrainingOverview,
    TrainingPortalTier,
    UpdateTrainingLessonProgressPayload,
    UpdateTrainingProgressPayload,
    UpsertTrainingDocumentPayload,
    UpsertTrainingLessonPayload,
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
    updateStation: (id: number, data: {
        code: string;
        name: string;
        address?: string;
        latitude?: number;
        longitude?: number
    }) => apiClient.put<Station>(API_ROUTES.stations.detail(id), data),
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

    // Courses (docs/training-courses-api.md)
    listCourses: (portal: TrainingPortalTier, signal?: AbortSignal) =>
        apiClient.get<TrainingCourseSummary[]>(`${API_ROUTES.training.courses}?portal=${portal}`, {signal}),

    getCourse: (codeOrSlug: string, signal?: AbortSignal) =>
        apiClient.get<TrainingCourseDetail>(API_ROUTES.training.course(codeOrSlug), {signal}),

    getLesson: (id: number, signal?: AbortSignal) =>
        apiClient.get<TrainingLessonDetail>(API_ROUTES.training.lesson(id), {signal}),

    updateLessonProgress: (id: number, payload: UpdateTrainingLessonProgressPayload) =>
        apiClient.put<TrainingLessonDetail>(API_ROUTES.training.lessonProgress(id), payload),

    adminListLessons: (courseId: number, signal?: AbortSignal) =>
        apiClient.get<AdminTrainingLesson[]>(API_ROUTES.training.adminCourseLessons(courseId), {signal}),

    adminCreateLesson: (payload: UpsertTrainingLessonPayload) =>
        apiClient.post<AdminTrainingLesson>(API_ROUTES.training.adminLessons, payload),

    adminUpdateLesson: (id: number, payload: UpsertTrainingLessonPayload) =>
        apiClient.put<AdminTrainingLesson>(API_ROUTES.training.adminLesson(id), payload),

    adminDeleteLesson: (id: number) => apiClient.delete<void>(API_ROUTES.training.adminLesson(id)),

    adminSetCover: (courseId: number, assetId: number | null) =>
        apiClient.put<TrainingCourseSummary>(API_ROUTES.training.adminCourseCover(courseId), {assetId}),

    /**
     * Register the file, PUT it straight to storage with the signed URL (progress reported 0–1), then
     * have the backend confirm the object. Resolves with the READY asset.
     */
    uploadAsset: async (file: File, onProgress?: (fraction: number) => void, signal?: AbortSignal) => {
        const request: TrainingAssetUploadRequest = {fileName: file.name, contentType: file.type, size: file.size};
        const ticket = await apiClient.post<TrainingAssetUploadTicket>(API_ROUTES.training.adminAssets, request, {signal});
        await putFileWithProgress(ticket, file, onProgress, signal);
        return apiClient.post<TrainingAssetConfirmation>(API_ROUTES.training.adminAssetConfirm(ticket.assetId), undefined, {signal});
    },
};

/**
 * XMLHttpRequest rather than fetch so the upload can report progress. No cookies or app headers go to
 * the storage host: only the headers the signed URL was issued with, every one of them (the signature
 * covers them, e.g. `Content-Type` and `If-None-Match: *`).
 */
function putFileWithProgress(
    ticket: TrainingAssetUploadTicket,
    file: File,
    onProgress?: (fraction: number) => void,
    signal?: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('Upload aborted', 'AbortError'));
            return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open(ticket.method || 'PUT', ticket.uploadUrl);
        xhr.withCredentials = false;
        for (const [name, value] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(name, value);
        xhr.upload.onprogress = event => {
            if (event.lengthComputable) onProgress?.(event.loaded / event.total);
        };
        const abort = () => xhr.abort();
        signal?.addEventListener('abort', abort, {once: true});
        const settle = () => signal?.removeEventListener('abort', abort);
        xhr.onload = () => {
            settle();
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(1);
                resolve();
            } else {
                reject(new Error(`Kho lưu trữ từ chối tệp (HTTP ${xhr.status}).`));
            }
        };
        xhr.onerror = () => {
            settle();
            reject(new Error('Không tải được tệp lên kho lưu trữ. Kiểm tra kết nối và thử lại.'));
        };
        xhr.onabort = () => {
            settle();
            reject(new DOMException('Upload aborted', 'AbortError'));
        };
        xhr.send(file);
    });
}
