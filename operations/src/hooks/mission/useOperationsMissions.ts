'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {missionService} from '@/api/mission/missions.api';
import {useAuth} from '@/providers/AuthContext';
import {QUIET} from '@/lib/query';
import type {MissionPreflightUpsertInput, MissionStatus} from '@/types/mission/mission.types';

export function useMissions(filters?: { status?: MissionStatus; search?: string }, enabled = true) {
    const query = useQuery({
        queryKey: ['missions', 'list', filters ?? {}],
        queryFn: () => missionService.list(filters),
        enabled,
    });
    return {
        missions: query.data?.content ?? [],
        isLoading: query.isLoading,
        error: query.error instanceof Error ? query.error.message : null,
        reload: query.refetch
    };
}

export const useOperationsMissions = useMissions;

export function useOperatorLogbook(operatorId?: number) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['missions', 'operator-logbook', user?.id, operatorId ?? 'self'],
        queryFn: ({signal}) => missionService.operatorLogbook(operatorId, signal),
        enabled: !!user && permissionsReady && can('MISSION_VIEW'),
        meta: QUIET,
    });
}

export function useMissionPreflight(id: number, enabled = true) {
    const {can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['missions', 'preflight', id],
        queryFn: ({signal}) => missionService.getPreflight(id, signal),
        enabled: enabled && Number.isSafeInteger(id) && id > 0 && permissionsReady && can('MISSION_VIEW'),
        meta: QUIET,
    });
}

export function useOperationsMissionReview(id: number, enabled = true) {
    const {can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['missions', 'review', id],
        queryFn: ({signal}) => missionService.getReview(id, signal),
        enabled: enabled && Number.isSafeInteger(id) && id > 0 && permissionsReady && can('MISSION_VIEW'),
        meta: QUIET,
    });
}

export function useOperationsMissionInspectionReport(id: number, enabled = true) {
    const {can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['missions', 'inspection-report', id],
        queryFn: ({signal}) => missionService.inspectionReport(id, signal),
        enabled: enabled && Number.isSafeInteger(id) && id > 0 && permissionsReady && can('MISSION_VIEW'),
        meta: QUIET,
    });
}

export function useDispatchCandidates(id: number, enabled = true) {
    const {can, permissionsReady} = useAuth();
    const canViewDispatch =
        can('MISSION_VIEW_ALL') ||
        can('MISSION_CONFIRM') ||
        can('MISSION_ASSIGN_STATION') ||
        can('MISSION_ASSIGN_UAV') ||
        can('MISSION_ASSIGN_OPERATOR') ||
        can('MISSION_RESERVE_EQUIPMENT');
    return useQuery({
        queryKey: ['missions', 'dispatch-candidates', id],
        queryFn: ({signal}) => missionService.dispatchCandidates(id, signal),
        enabled: enabled && Number.isSafeInteger(id) && id > 0 && permissionsReady && canViewDispatch,
        meta: QUIET,
    });
}

export function useInvalidateOperationsMissionQueries() {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({queryKey: ['missions']});
}

export function useMissionMutations() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({queryKey: ['missions']});
    const submit = useMutation({mutationFn: (id: number) => missionService.submit(id), onSuccess: invalidate});
    const cancel = useMutation({mutationFn: (id: number) => missionService.cancel(id), onSuccess: invalidate});
    const confirm = useMutation({mutationFn: (id: number) => missionService.confirm(id), onSuccess: invalidate});
    const reject = useMutation({
        mutationFn: ({id, reason}: {
            id: number;
            reason: string
        }) => missionService.reject(id, reason), onSuccess: invalidate
    });
    const ready = useMutation({mutationFn: (id: number) => missionService.ready(id), onSuccess: invalidate});
    const start = useMutation({mutationFn: (id: number) => missionService.start(id), onSuccess: invalidate});
    const complete = useMutation({
        mutationFn: ({id, note, condition}: {
            id: number;
            note: string;
            condition?: string
        }) => missionService.complete(id, note, condition), onSuccess: invalidate
    });
    const fail = useMutation({
        mutationFn: ({id, reason, notes}: {
            id: number;
            reason: string;
            notes?: string
        }) => missionService.fail(id, reason, notes), onSuccess: invalidate
    });
    const upsertPreflight = useMutation({
        mutationFn: ({id, payload}: { id: number; payload: MissionPreflightUpsertInput }) =>
            missionService.upsertPreflight(id, payload),
        onSuccess: invalidate,
        retry: false,
    });
    const autoAssign = useMutation({
        mutationFn: (id: number) => missionService.autoAssign(id),
        onSuccess: invalidate,
        retry: false,
    });
    return {submit, cancel, confirm, reject, ready, start, complete, fail, upsertPreflight, autoAssign};
}
