import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import {missionDraftUpdatePayload} from '@/shared/forms/mission/mission-form';
import type {Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, PageResponse, UavService} from '@/shared/types/customer';
import type {
    MissionPermitUpsertInput,
    MissionReview,
    MissionReviewUpsertInput,
    SavedFlightSite,
    SavedFlightSiteUpsertInput,
} from '@/shared/types/mission/mission.types';

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
    clone: (id: number) => apiClient.post<Mission>(API_ROUTES.missions.clone(id)),
    upsertPermit: (id: number, data: MissionPermitUpsertInput) =>
        apiClient.put<Mission>(API_ROUTES.missions.permit(id), data),
    timeline: (id: number, signal?: AbortSignal) => apiClient.get<MissionEvent[]>(API_ROUTES.missions.timeline(id), {signal}),
    media: (id: number, signal?: AbortSignal) => apiClient.get<MissionMedia[]>(API_ROUTES.missions.media(id), {signal}),
    flightSites: (signal?: AbortSignal) => apiClient.get<SavedFlightSite[]>(API_ROUTES.flightSites.list, {signal}),
    createFlightSite: (data: SavedFlightSiteUpsertInput) =>
        apiClient.post<SavedFlightSite>(API_ROUTES.flightSites.list, data),
    deleteFlightSite: (id: number) => apiClient.delete<void>(API_ROUTES.flightSites.detail(id)),
    getReview: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionReview>(API_ROUTES.missions.review(id), {signal}),
    upsertReview: (id: number, data: MissionReviewUpsertInput) =>
        apiClient.put<MissionReview>(API_ROUTES.missions.review(id), data),
};
