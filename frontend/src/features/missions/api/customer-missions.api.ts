import {apiClient, API_ROUTES} from '@/lib/api';
import type {Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, MissionType, PageResponse, UavService} from '@/types/customer';
import {missionDraftUpdatePayload} from '@/features/missions/forms/mission-form';

export const customerMissionService = {
    services: (signal?: AbortSignal) => apiClient.get<UavService[]>(API_ROUTES.uavServices.list, {signal}),
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
    update: (id: number, data: MissionInput, expectedVersion: number) =>
        apiClient.patch<Mission>(API_ROUTES.missions.detail(id), missionDraftUpdatePayload(data, expectedVersion)),
    submit: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.submit(id)),
    cancel: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.cancel(id)),
    timeline: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionEvent[]>(API_ROUTES.missions.timeline(id), {signal}),
    media: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionMedia[]>(API_ROUTES.missions.media(id), {signal}),
    download: (id: number) =>
        apiClient.get<{ url: string; expiresInSeconds: number }>(API_ROUTES.media.downloadUrl(id)),
};
