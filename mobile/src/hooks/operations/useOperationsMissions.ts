import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import type {
    MissionPermitUpsertInput,
    MissionPermitVerifyInput,
    MissionPreflightUpsertInput,
    MissionStatus,
    MissionType,
} from '@/shared/types/mission/mission.types';
import {operationsMissionService} from '@/api/operations/operations-missions.api';
import {useAuth} from '@/providers/AuthContext';

const TELEMETRY_POLL_MS = 5_000;

function useOperationsKey() {
    const auth = useAuth();
    return {...auth, key: queryKeys.feature(auth.user?.id, 'operations')};
}

export function useOperatorLogbook() {
    const {key, can, permissionsReady} = useOperationsKey();
    return useQuery({
        queryKey: [...key, 'operator-logbook'],
        queryFn: ({signal}) => operationsMissionService.operatorLogbook(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
    });
}

export function useOperationsMissionPreflight(id: number, enabled = true) {
    const {key, can, permissionsReady} = useOperationsKey();
    const valid = Number.isSafeInteger(id) && id > 0;
    return useQuery({
        queryKey: [...key, 'mission', id, 'preflight'],
        queryFn: ({signal}) => operationsMissionService.getPreflight(id, signal),
        enabled: valid && enabled && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useOperationsDispatchCandidates(id: number, enabled = true) {
    const {key, can, permissionsReady} = useOperationsKey();
    const valid = Number.isSafeInteger(id) && id > 0;
    const canViewDispatch =
        can('MISSION_VIEW_ALL') ||
        can('MISSION_CONFIRM') ||
        can('MISSION_ASSIGN_STATION') ||
        can('MISSION_ASSIGN_UAV') ||
        can('MISSION_ASSIGN_OPERATOR') ||
        can('MISSION_RESERVE_EQUIPMENT');
    return useQuery({
        queryKey: [...key, 'mission', id, 'dispatch-candidates'],
        queryFn: ({signal}) => operationsMissionService.dispatchCandidates(id, signal),
        enabled: valid && enabled && permissionsReady && canViewDispatch,
    });
}

export function useOperationsMissionReview(id: number, enabled = true) {
    const {key, can, permissionsReady} = useOperationsKey();
    const valid = Number.isSafeInteger(id) && id > 0;
    return useQuery({
        queryKey: [...key, 'mission', id, 'review'],
        queryFn: ({signal}) => operationsMissionService.getReview(id, signal),
        enabled: valid && enabled && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useOperationsMissionTelemetryReplay(id: number, enabled = true) {
    const {key, can, permissionsReady} = useOperationsKey();
    const valid = Number.isSafeInteger(id) && id > 0;
    return useQuery({
        queryKey: [...key, 'mission', id, 'telemetry-replay'],
        queryFn: ({signal}) => operationsMissionService.telemetryReplay(id, signal),
        enabled: valid && enabled && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useOperationsMissionInspectionReport(id: number, enabled = true) {
    const {key, can, permissionsReady} = useOperationsKey();
    const valid = Number.isSafeInteger(id) && id > 0;
    return useQuery({
        queryKey: [...key, 'mission', id, 'inspection-report'],
        queryFn: ({signal}) => operationsMissionService.inspectionReport(id, signal),
        enabled: valid && enabled && permissionsReady && can('MISSION_VIEW'),
    });
}

export function useOperationsMissionList(params?: { status?: MissionStatus; missionType?: MissionType; search?: string }) {
    const {key, can, permissionsReady} = useOperationsKey();
    return useQuery({
        queryKey: [...key, 'missions', params ?? {}],
        queryFn: ({signal}) => operationsMissionService.list({...params, size: 50}, signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
    });
}

export function useOperatorsList() {
    const {key, can, permissionsReady} = useOperationsKey();
    return useQuery({
        queryKey: [...key, 'operators'],
        queryFn: ({signal}) => operationsMissionService.operators(signal),
        enabled: permissionsReady && can('USER_VIEW'),
    });
}

export function useOperationsMissionDetail(id: number) {
    const {key, can, permissionsReady} = useOperationsKey();
    const valid = Number.isSafeInteger(id) && id > 0;

    const detail = useQuery({
        queryKey: [...key, 'mission', id, 'detail'],
        queryFn: ({signal}) => operationsMissionService.detail(id, signal),
        enabled: valid && permissionsReady && can('MISSION_VIEW'),
    });

    const timeline = useQuery({
        queryKey: [...key, 'mission', id, 'timeline'],
        queryFn: ({signal}) => operationsMissionService.timeline(id, signal),
        enabled: detail.isSuccess && can('MISSION_TIMELINE_VIEW'),
    });

    const media = useQuery({
        queryKey: [...key, 'mission', id, 'media'],
        queryFn: ({signal}) => operationsMissionService.media(id, signal),
        enabled: detail.isSuccess && can('MISSION_MEDIA_VIEW'),
    });

    const telemetry = useQuery({
        queryKey: [...key, 'mission', id, 'telemetry'],
        queryFn: ({signal}) => operationsMissionService.latestTelemetry(id, signal),
        enabled: detail.isSuccess && detail.data.status === 'IN_PROGRESS' && can('MISSION_VIEW'),
        refetchInterval: detail.data?.status === 'IN_PROGRESS' ? TELEMETRY_POLL_MS : false,
    });

    return {detail, timeline, media, telemetry};
}

export function useOperationsMissionActions() {
    const client = useQueryClient();
    const {key, user} = useOperationsKey();
    const customerKey = queryKeys.feature(user?.id, 'customer');
    const fleetKey = queryKeys.feature(user?.id, 'fleet');

    const refresh = (id?: number) => Promise.all([
        client.invalidateQueries({queryKey: [...key, 'missions']}),
        client.invalidateQueries({queryKey: [...key, 'operator-logbook']}),
        id ? client.invalidateQueries({queryKey: [...key, 'mission', id]}) : undefined,
        client.invalidateQueries({queryKey: customerKey}),
        client.invalidateQueries({queryKey: fleetKey}),
    ]);

    return {
        accept: useMutation({
            mutationFn: ({id, expectedVersion}: { id: number; expectedVersion: number }) =>
                operationsMissionService.accept(id, expectedVersion),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        confirm: useMutation({
            mutationFn: (id: number) => operationsMissionService.confirm(id),
            onSettled: (_d, _e, id) => refresh(id),
            retry: false,
        }),
        reject: useMutation({
            mutationFn: ({id, reason}: { id: number; reason: string }) =>
                operationsMissionService.reject(id, reason),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        ready: useMutation({
            mutationFn: (id: number) => operationsMissionService.ready(id),
            onSettled: (_d, _e, id) => refresh(id),
            retry: false,
        }),
        start: useMutation({
            mutationFn: (id: number) => operationsMissionService.start(id),
            onSettled: (_d, _e, id) => refresh(id),
            retry: false,
        }),
        complete: useMutation({
            mutationFn: ({id, completionNote, equipmentCondition}: { id: number; completionNote: string; equipmentCondition?: string }) =>
                operationsMissionService.complete(id, completionNote, equipmentCondition),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        fail: useMutation({
            mutationFn: ({id, failureReason, notes}: { id: number; failureReason: string; notes?: string }) =>
                operationsMissionService.fail(id, failureReason, notes),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        forceFail: useMutation({
            mutationFn: ({id, reason, notes}: { id: number; reason: string; notes?: string }) =>
                operationsMissionService.forceFail(id, reason, notes),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        reportConflict: useMutation({
            mutationFn: ({id, note}: { id: number; note: string }) =>
                operationsMissionService.reportConflict(id, note),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        upsertPermit: useMutation({
            mutationFn: ({id, data}: { id: number; data: MissionPermitUpsertInput }) =>
                operationsMissionService.upsertPermit(id, data),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        verifyPermit: useMutation({
            mutationFn: ({id, data}: { id: number; data: MissionPermitVerifyInput }) =>
                operationsMissionService.verifyPermit(id, data),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        assignStation: useMutation({
            mutationFn: ({id, resourceId}: { id: number; resourceId: number }) =>
                operationsMissionService.assignStation(id, resourceId),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        assignUav: useMutation({
            mutationFn: ({id, resourceId}: { id: number; resourceId: number }) =>
                operationsMissionService.assignUav(id, resourceId),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        assignOperator: useMutation({
            mutationFn: ({id, resourceId}: { id: number; resourceId: number }) =>
                operationsMissionService.assignOperator(id, resourceId),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        upsertPreflight: useMutation({
            mutationFn: ({id, data}: { id: number; data: MissionPreflightUpsertInput }) =>
                operationsMissionService.upsertPreflight(id, data),
            onSettled: (_d, _e, {id}) => refresh(id),
            retry: false,
        }),
        autoAssign: useMutation({
            mutationFn: (id: number) => operationsMissionService.autoAssign(id),
            onSettled: (_d, _e, id) => refresh(id),
            retry: false,
        }),
    };
}
