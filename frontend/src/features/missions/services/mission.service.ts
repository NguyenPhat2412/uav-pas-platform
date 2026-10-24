import {validateMediaFile} from "@/lib/api/media-policy";
import {API_ROUTES, apiClient, apiRequest} from '@/lib/api';
import {
    acceptanceInput,
    completionInput,
    failureInput,
    missionEventNote,
    resourceRedispatchInput,
    uavRedispatchInput
} from "@/features/missions/utils/workflows";
import {
    DispatchResources,
    MediaRole,
    MediaType,
    Mission,
    MissionAvailability,
    MissionDashboard,
    MissionEvent,
    MissionInput,
    MissionMedia,
    MissionStatus,
    MissionType,
    PageResponse,
    SignedMediaUrl,
    UavService
} from "@/features/missions/types/mission.types";

const base = '/api/v1/missions';
export const missionService = {
    services: () => apiClient.get<UavService[]>('/api/v1/uav-services'),
    list: (params?: { status?: MissionStatus; missionType?: MissionType; search?: string }) => {
        const query = new URLSearchParams({size: '50'});
        if (params?.status) query.set('status', params.status);
        if (params?.missionType) query.set('missionType', params.missionType);
        if (params?.search) query.set('search', params.search);
        return apiClient.get<PageResponse<Mission>>(`${base}?${query.toString()}`);
    },
    dispatchResources: (id: number) => apiClient.get<DispatchResources>(`${base}/${id}/dispatch-resources`),
    redispatchResource: (id: number, kind: 'operator' | 'station', expectedVersion: number, replacementId: number | null, reason: string) => apiClient.post<Mission>(`${base}/${id}/redispatch-${kind}`, resourceRedispatchInput(expectedVersion, replacementId, reason)),
    redispatchEquipment: (id: number, expectedVersion: number, reservationId: number, replacementId: number | null, quantity: number | null, reason: string) => apiClient.post<Mission>(`${base}/${id}/redispatch-equipment`, {
        ...resourceRedispatchInput(expectedVersion, replacementId, reason),
        reservationId,
        quantity
    }),
    operatorAvailability: (startTime: string, endTime: string, operatorId: number) => apiClient.get<MissionAvailability>(`${base}/availability?${new URLSearchParams({
        startTime,
        endTime,
        operatorId: String(operatorId)
    })}`),
    get: (id: number) => apiClient.get<Mission>(`${base}/${id}`),
    create: (data: MissionInput) => apiClient.post<Mission>(base, data),
    update: (id: number, data: Omit<MissionInput, 'missionType'>) => apiClient.patch<Mission>(`${base}/${id}`, data),
    submit: (id: number) => apiClient.post<Mission>(`${base}/${id}/submit`),
    cancel: (id: number) => apiClient.post<Mission>(`${base}/${id}/cancel`),
    confirm: (id: number) => apiClient.post<Mission>(`${base}/${id}/confirm`),
    reject: (id: number, reason: string) => apiClient.post<Mission>(`${base}/${id}/reject?reason=${encodeURIComponent(missionEventNote(reason))}`),
    ready: (id: number) => apiClient.post<Mission>(`${base}/${id}/ready`),
    start: (id: number) => apiClient.post<Mission>(`${base}/${id}/start`),
    accept: (id: number, expectedVersion: number) => apiClient.post<Mission>(`${base}/${id}/accept`, acceptanceInput(expectedVersion)),
    reportConflict: (id: number, note: string) => apiClient.post<Mission>(`${base}/${id}/report-conflict?note=${encodeURIComponent(missionEventNote(note))}`),
    complete: (id: number, completionNote: string, equipmentCondition?: string) => apiClient.post<Mission>(`${base}/${id}/complete`, completionInput(completionNote, equipmentCondition)),
    fail: (id: number, failureReason: string, notes?: string) => apiClient.post<Mission>(`${base}/${id}/fail`, failureInput(failureReason, notes)),
    assignStation: (id: number, resourceId: number) => apiClient.post<Mission>(`${base}/${id}/assign-station`, {
        resourceId,
        quantity: 1
    }),
    assignUav: (id: number, resourceId: number) => apiClient.post<Mission>(`${base}/${id}/assign-uav`, {
        resourceId,
        quantity: 1
    }),
    replaceUav: (id: number, expectedCurrentUavId: number, replacementUavId: number, reason: string) => apiClient.post<Mission>(`${base}/${id}/replace-uav`, uavRedispatchInput(expectedCurrentUavId, reason, replacementUavId)),
    unassignUav: (id: number, expectedCurrentUavId: number, reason: string) => apiClient.post<Mission>(`${base}/${id}/unassign-uav`, uavRedispatchInput(expectedCurrentUavId, reason)),
    assignOperator: (id: number, resourceId: number) => apiClient.post<Mission>(`${base}/${id}/assign-operator`, {
        resourceId,
        quantity: 1
    }),
    reserveEquipment: (id: number, resourceId: number, quantity: number) => apiClient.post<Mission>(`${base}/${id}/reserve-equipment`, {
        resourceId,
        quantity
    }),
    media: (id: number) => apiClient.get<MissionMedia[]>(`${base}/${id}/media`),
    attachMedia: (id: number, mediaId: number, mediaRole: MediaRole) => apiClient.post<MissionMedia>(`${base}/${id}/media`, {
        mediaId,
        mediaRole
    }),
    requestMediaUpload: async (id: number, file: File) => apiClient.post<SignedMediaUrl>(`${base}/${id}/media/upload-url`, {
        originalName: file.name,
        contentType: validateMediaFile(file),
        size: file.size,
        type: file.type.startsWith('video/') ? 'VIDEO' as MediaType : file.type.startsWith('image/') ? 'IMAGE' as MediaType : 'DOCUMENT' as MediaType
    }),
    uploadFile: async (url: string, file: File) => apiRequest<void>(url, {
        method: 'PUT',
        headers: {'If-None-Match': '*', 'Content-Type': validateMediaFile(file)},
        body: file
    }),
    confirmMedia: (id: number, mediaId: number) => apiClient.post(`${base}/${id}/media/${mediaId}/confirm`),
    timeline: (id: number) => apiClient.get<MissionEvent[]>(`${base}/${id}/timeline`),
    dashboard: () => apiClient.get<MissionDashboard>('/api/v1/dashboard/missions'),
    availability: (startTime: string, endTime: string) => apiClient.get<MissionAvailability>(`${base}/availability?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`),
    sarGridGenerate: (payload: unknown) => apiClient.post(API_ROUTES.sar.gridGenerate, payload),
    sarDetections: (missionId?: string) => apiClient.get(API_ROUTES.sar.detections(missionId)),
    verifySarDetection: (detectionId: string, verified: boolean) => apiClient.patch(API_ROUTES.sar.verifyDetection(detectionId, verified)),
    sendSarCommand: (uavId: string, payload: unknown) => apiClient.post(API_ROUTES.sar.command(uavId), payload),
    aiModels: () => apiClient.get(API_ROUTES.ai.models),
    activateAiModel: (modelId: string) => apiClient.post(API_ROUTES.ai.activateModel(modelId)),
    aiInfer: (payload: unknown) => apiClient.post(API_ROUTES.ai.infer, payload),
};
