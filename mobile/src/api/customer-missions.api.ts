import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import {missionCreatePayload, missionDraftUpdatePayload} from '@/shared/forms/mission-form';
import type {Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, PageResponse, UavService} from '@/shared/types/customer';
import type {
    MissionInspectionReport,
    MissionPermitUpsertInput,
    MissionReview,
    MissionReviewUpsertInput,
    SavedFlightSite,
    SavedFlightSiteUpsertInput,
} from '@/shared/types/mission.types';
import type {OrderStatusGroup} from '@/shared/types/project.types';
import type {MissionTelemetryReplay} from '@/shared/types/telemetry.types';

export interface CustomerMissionListParams {
    status?: MissionStatus;
    search?: string;
    projectId?: number;
    statusGroup?: OrderStatusGroup;
}

/** Same requests as the web customerMissionService; the backend scopes every list to the signed-in customer. */
export const customerMissionService = {
    services: (signal?: AbortSignal) => apiClient.get<UavService[]>(API_ROUTES.uavServices.list, {signal}),
    missions: (
        page = 0,
        status?: MissionStatus,
        search = '',
        signal?: AbortSignal,
        extra?: { projectId?: number; statusGroup?: OrderStatusGroup },
    ) =>
        apiClient.get<PageResponse<Mission>>(
            `${API_ROUTES.missions.list}?${buildQueryString({
                size: 20,
                page,
                status,
                search: search || undefined,
                projectId: extra?.projectId,
                statusGroup: extra?.statusGroup,
            })}`,
            {signal},
        ),
    mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(API_ROUTES.missions.detail(id), {signal}),
    telemetryReplay: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionTelemetryReplay>(API_ROUTES.missions.telemetryReplay(id), {signal}),
    inspectionReport: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionInspectionReport>(API_ROUTES.missions.inspectionReport(id), {signal}),
    availability: (startTime: string, endTime: string) =>
        apiClient.get<MissionAvailability>(`${API_ROUTES.missions.availability}?${buildQueryString({startTime, endTime})}`),
    create: (data: MissionInput) => apiClient.post<Mission>(API_ROUTES.missions.list, missionCreatePayload(data)),
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
