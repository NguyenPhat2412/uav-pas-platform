import {API_ROUTES, apiClient} from '@/lib/api';
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
    services: (signal?: AbortSignal) => apiClient.get<UavService[]>('/api/v1/uav-services', {signal}),
    // This narrows privileged accounts' UI; the backend still enforces customer ownership.
    missions: (search = '', page = 0, status?: MissionStatus, missionType?: MissionType, signal?: AbortSignal) => apiClient.get<PageResponse<Mission>>(`/api/v1/missions?${new URLSearchParams({
        size: '20',
        page: String(page), ...(search ? {search} : {}), ...(status ? {status} : {}), ...(missionType ? {missionType} : {})
    })}`, {signal}),
    mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(`/api/v1/missions/${id}`, {signal}),
    availability: (startTime: string, endTime: string) => apiClient.get<MissionAvailability>(`/api/v1/missions/availability?${new URLSearchParams({
        startTime,
        endTime
    })}`),
    create: (data: MissionInput) => apiClient.post<Mission>('/api/v1/missions', data),
    update: (id: number, data: MissionInput, expectedVersion: number) => apiClient.patch<Mission>(`/api/v1/missions/${id}`, missionDraftUpdatePayload(data, expectedVersion)),
    submit: (id: number) => apiClient.post<Mission>(`/api/v1/missions/${id}/submit`),
    cancel: (id: number) => apiClient.post<Mission>(`/api/v1/missions/${id}/cancel`),
    timeline: (id: number, signal?: AbortSignal) => apiClient.get<MissionEvent[]>(`/api/v1/missions/${id}/timeline`, {signal}),
    media: (id: number, signal?: AbortSignal) => apiClient.get<MissionMedia[]>(`/api/v1/missions/${id}/media`, {signal}),
    download: (id: number) => apiClient.get<{
        url: string;
        expiresInSeconds: number
    }>(`/api/v1/media/${id}/download-url`),
    quota: (signal?: AbortSignal) => apiClient.get<UserQuota>(API_ROUTES.billing.subscription, {signal}),
    plans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, {signal}),
    invoices: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<Invoice>>(`${API_ROUTES.billing.invoices}?page=${page}&size=20`, {signal}),
    payInvoice: (id: number) => apiClient.post(`${API_ROUTES.billing.invoices}/${id}/pay`),
};
