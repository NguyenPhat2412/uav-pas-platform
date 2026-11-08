import {apiClient, apiRequest, API_ROUTES} from '@/lib/api';
import type {
    MediaRole,
    MediaType,
    Mission,
    MissionAvailability,
    MissionEvent,
    MissionInput,
    MissionMedia,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
    MissionReview,
    MissionReviewUpsertInput,
    MissionStatus,
    MissionType,
    PageResponse,
    SavedFlightSite,
    SavedFlightSiteUpsertInput,
    SignedMediaUrl,
    UavService,
} from '@/types/customer';
import {missionDraftUpdatePayload} from '@/forms/mission/mission-form';

export const customerMissionService = {
    services: (signal?: AbortSignal) => apiClient.get<UavService[]>(API_ROUTES.uavServices.list, {signal}),
    flightSites: (signal?: AbortSignal) =>
        apiClient.get<SavedFlightSite[]>(API_ROUTES.flightSites.list, {signal}),
    createFlightSite: (payload: SavedFlightSiteUpsertInput) =>
        apiClient.post<SavedFlightSite>(API_ROUTES.flightSites.list, payload),
    deleteFlightSite: (id: number) =>
        apiClient.delete<void>(API_ROUTES.flightSites.detail(id)),
    // This narrows privileged accounts' UI; the backend still enforces customer ownership.
    missions: (search = '', page = 0, status?: MissionStatus, missionType?: MissionType, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?${new URLSearchParams({
            size: '20',
            page: String(page), ...(search ? {search} : {}), ...(status ? {status} : {}), ...(missionType ? {missionType} : {})
        })}`, {signal}),
    mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(API_ROUTES.missions.detail(id), {signal}),
    /** Runs the server's create rules without saving; rejects with field errors when the request would fail. */
    validateMission: (data: unknown) => apiClient.post<void>(API_ROUTES.missions.validate, data),
    availability: (startTime: string, endTime: string) =>
        apiClient.get<MissionAvailability>(`${API_ROUTES.missions.availability}?${new URLSearchParams({startTime, endTime})}`),
    create: (data: MissionInput) => apiClient.post<Mission>(API_ROUTES.missions.list, data),
    clone: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.clone(id)),
    update: (id: number, data: MissionInput, expectedVersion: number) =>
        apiClient.patch<Mission>(API_ROUTES.missions.detail(id), missionDraftUpdatePayload(data, expectedVersion)),
    submit: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.submit(id)),
    cancel: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.cancel(id)),
    getReview: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionReview>(API_ROUTES.missions.review(id), {signal}),
    upsertReview: (id: number, payload: MissionReviewUpsertInput) =>
        apiClient.put<MissionReview>(API_ROUTES.missions.review(id), payload),
    timeline: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionEvent[]>(API_ROUTES.missions.timeline(id), {signal}),
    media: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionMedia[]>(API_ROUTES.missions.media(id), {signal}),
    requestMediaUpload: (id: number, file: File) =>
        apiClient.post<SignedMediaUrl>(API_ROUTES.missions.mediaUploadUrl(id), {
            originalName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            type: file.type.startsWith('video/')
                ? ('VIDEO' as MediaType)
                : file.type.startsWith('image/')
                  ? ('IMAGE' as MediaType)
                  : ('DOCUMENT' as MediaType),
        }),
    uploadFile: (url: string, file: File) =>
        apiRequest<void>(url, {
            method: 'PUT',
            headers: {'If-None-Match': '*', 'Content-Type': file.type || 'application/octet-stream'},
            body: file,
        }),
    confirmMedia: (id: number, mediaId: number) =>
        apiClient.post(API_ROUTES.missions.mediaConfirm(id, mediaId)),
    attachMedia: (id: number, mediaId: number, mediaRole: MediaRole) =>
        apiClient.post<MissionMedia>(API_ROUTES.missions.media(id), {mediaId, mediaRole}),
    upsertPermit: (id: number, payload: MissionPermitUpsertInput) =>
        apiClient.put<Mission>(API_ROUTES.missions.permit(id), payload),
    verifyPermit: (id: number, payload: MissionPermitVerifyInput) =>
        apiClient.post<Mission>(API_ROUTES.missions.permitVerify(id), payload),
    download: (id: number) =>
        apiClient.get<{ url: string; expiresInSeconds: number }>(API_ROUTES.media.downloadUrl(id)),
};
