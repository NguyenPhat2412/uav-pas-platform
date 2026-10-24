// Canonical Customer API endpoints (/api/v1/missions, /submit, /cancel)
import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    Invoice,
    Mission,
    MissionAvailability,
    MissionEvent,
    MissionInput,
    MissionMedia,
    MissionStatus,
    MissionType,
    PageResponse,
    ServicePlan,
    UavService,
    UserQuota
} from "@/types/customer";
import {missionDraftUpdatePayload} from "@/features/missions/forms/mission-form";

export const customerService = {
    services: (signal?: AbortSignal) => apiClient.get<UavService[]>(API_ROUTES.uavServices.list, {signal}),
    // This narrows privileged accounts' UI; the backend still enforces customer ownership.
    missions: (search = '', page = 0, status?: MissionStatus, missionType?: MissionType, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?${new URLSearchParams({
            size: '20',
            page: String(page), ...(search ? {search} : {}), ...(status ? {status} : {}), ...(missionType ? {missionType} : {})
        })}`, {signal}),
    mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(API_ROUTES.missions.detail(id), {signal}),
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
    quota: (signal?: AbortSignal) => apiClient.get<UserQuota>(API_ROUTES.billing.subscription, {signal}),
    plans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, {signal}),
    invoices: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?page=${page}&size=20`, {signal}),
    payInvoice: (id: number) => apiClient.post(API_ROUTES.billing.payInvoice(id)),
};
