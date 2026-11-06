import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import {acceptanceInput, completionInput, failureInput, missionEventNote} from '@/shared/utils/mission/workflows';
import type {
    Mission,
    MissionEvent,
    MissionMedia,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
    MissionStatus,
    MissionType,
    PageResponse,
} from '@/shared/types/mission/mission.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';

export interface OperationsMissionListParams {
    status?: MissionStatus;
    missionType?: MissionType;
    search?: string;
    page?: number;
    size?: number;
}

export const operationsMissionService = {
    list: (params?: OperationsMissionListParams, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(
            `${API_ROUTES.missions.list}?${buildQueryString({
                page: params?.page ?? 0,
                size: params?.size ?? 50,
                status: params?.status,
                missionType: params?.missionType,
                search: params?.search?.trim() || undefined,
            })}`,
            {signal},
        ),
    detail: (id: number, signal?: AbortSignal) =>
        apiClient.get<Mission>(API_ROUTES.missions.detail(id), {signal}),
    timeline: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionEvent[]>(API_ROUTES.missions.timeline(id), {signal}),
    media: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionMedia[]>(API_ROUTES.missions.media(id), {signal}),
    accept: (id: number, expectedVersion: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.accept(id), acceptanceInput(expectedVersion)),
    confirm: (id: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.confirm(id)),
    reject: (id: number, reason: string) =>
        apiClient.post<Mission>(`${API_ROUTES.missions.reject(id)}?${buildQueryString({reason: missionEventNote(reason)})}`),
    ready: (id: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.ready(id)),
    start: (id: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.start(id)),
    complete: (id: number, completionNote: string, equipmentCondition?: string) =>
        apiClient.post<Mission>(API_ROUTES.missions.complete(id), completionInput(completionNote, equipmentCondition)),
    fail: (id: number, failureReason: string, notes?: string) =>
        apiClient.post<Mission>(API_ROUTES.missions.fail(id), failureInput(failureReason, notes)),
    forceFail: (id: number, reason: string, notes?: string) =>
        apiClient.post<Mission>(API_ROUTES.missions.forceFail(id), {
            reason: reason.trim(),
            ...(notes?.trim() ? {notes: notes.trim()} : {}),
        }),
    reportConflict: (id: number, note: string) =>
        apiClient.post<Mission>(`${API_ROUTES.missions.reportConflict(id)}?${buildQueryString({note: missionEventNote(note)})}`),
    upsertPermit: (id: number, data: MissionPermitUpsertInput) =>
        apiClient.put<Mission>(API_ROUTES.missions.permit(id), data),
    verifyPermit: (id: number, data: MissionPermitVerifyInput) =>
        apiClient.post<Mission>(API_ROUTES.missions.permitVerify(id), data),
    latestTelemetry: (id: number, signal?: AbortSignal) =>
        apiClient.get<UavTelemetry | undefined>(API_ROUTES.missions.latestTelemetry(id), {signal}),
};
