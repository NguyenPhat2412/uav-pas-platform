import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import {missionDraftUpdatePayload} from '@/shared/forms/mission/mission-form';
import type {Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, PageResponse, UavService} from '@/shared/types/customer';

/** Same requests as the web customerMissionService; the backend scopes every list to the signed-in customer. */
export const customerMissionService = {
    services: (signal?: AbortSignal) => apiClient.get<UavService[]>(API_ROUTES.uavServices.list, {signal}),
    missions: (page = 0, status?: MissionStatus, search = '', signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?${buildQueryString({size: 20, page, status, search: search || undefined})}`, {signal}),
    mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(API_ROUTES.missions.detail(id), {signal}),
    availability: (startTime: string, endTime: string) =>
        apiClient.get<MissionAvailability>(`${API_ROUTES.missions.availability}?${buildQueryString({startTime, endTime})}`),
    create: (data: MissionInput) => apiClient.post<Mission>(API_ROUTES.missions.list, data),
    update: (id: number, data: MissionInput, expectedVersion: number) =>
        apiClient.patch<Mission>(API_ROUTES.missions.detail(id), missionDraftUpdatePayload(data, expectedVersion)),
    submit: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.submit(id)),
    cancel: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.cancel(id)),
    timeline: (id: number, signal?: AbortSignal) => apiClient.get<MissionEvent[]>(API_ROUTES.missions.timeline(id), {signal}),
    media: (id: number, signal?: AbortSignal) => apiClient.get<MissionMedia[]>(API_ROUTES.missions.media(id), {signal}),
};
