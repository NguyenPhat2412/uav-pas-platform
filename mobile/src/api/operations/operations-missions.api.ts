import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import {acceptanceInput, completionInput, failureInput, missionEventNote} from '@/shared/utils/mission/workflows';
import type {
    Mission,
    MissionDispatchCandidates,
    MissionEvent,
    MissionInspectionReport,
    MissionMedia,
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
    MissionPreflight,
    MissionPreflightUpsertInput,
    MissionReview,
    MissionStatus,
    MissionType,
    OperatorLogbook,
    PageResponse,
} from '@/shared/types/mission/mission.types';
import type {Operator} from '@/shared/types/resources';
import type {MissionTelemetryReplay, UavTelemetry} from '@/shared/types/uav/telemetry.types';

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
    assignStation: (id: number, resourceId: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.assignStation(id), {resourceId, quantity: 1}),
    assignUav: (id: number, resourceId: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.assignUav(id), {resourceId, quantity: 1}),
    assignOperator: (id: number, resourceId: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.assignOperator(id), {resourceId, quantity: 1}),
    operators: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Operator>>(
            `${API_ROUTES.users.list}?${buildQueryString({role: 'ROLE_OPERATOR', page: 0, size: 100})}`,
            {signal},
        ),
    latestTelemetry: (id: number, signal?: AbortSignal) =>
        apiClient.get<UavTelemetry | undefined>(API_ROUTES.missions.latestTelemetry(id), {signal}),
    getPreflight: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionPreflight>(API_ROUTES.missions.preflight(id), {signal}),
    upsertPreflight: (id: number, data: MissionPreflightUpsertInput) =>
        apiClient.put<MissionPreflight>(API_ROUTES.missions.preflight(id), data),
    dispatchCandidates: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionDispatchCandidates>(API_ROUTES.missions.dispatchCandidates(id), {signal}),
    autoAssign: (id: number) =>
        apiClient.post<Mission>(API_ROUTES.missions.autoAssign(id)),
    operatorLogbook: (signal?: AbortSignal) =>
        apiClient.get<OperatorLogbook>(API_ROUTES.missions.operatorLogbook, {signal}),
    getReview: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionReview>(API_ROUTES.missions.review(id), {signal}),
    telemetryReplay: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionTelemetryReplay>(API_ROUTES.missions.telemetryReplay(id), {signal}),
    inspectionReport: (id: number, signal?: AbortSignal) =>
        apiClient.get<MissionInspectionReport>(API_ROUTES.missions.inspectionReport(id), {signal}),
};
