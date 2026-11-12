import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import {operationsMissionService} from '@/api/operations/operations-missions.api';
import {sarService} from '@/api/sar/sar.api';
import {useAuth} from '@/providers/AuthContext';

const SAR_POLL_MS = 5_000;

export function useSarMissions(includeClosed = false) {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'sar');
    return useQuery({
        queryKey: [...key, 'missions', {includeClosed}],
        queryFn: ({signal}) => sarService.missions(includeClosed, signal),
        enabled: permissionsReady && (can('MISSION_VIEW') || can('MISSION_VIEW_ALL')),
        refetchInterval: 15_000,
    });
}

export function useSarCockpit(missionId: number) {
    const {user, can, permissionsReady} = useAuth();
    const client = useQueryClient();
    const key = queryKeys.feature(user?.id, 'sar');
    const valid = Number.isSafeInteger(missionId) && missionId > 0;
    const allowed = valid && permissionsReady && (can('MISSION_VIEW') || can('MISSION_VIEW_ALL'));

    const missionsQuery = useQuery({
        queryKey: [...key, 'missions', {includeClosed: true}],
        queryFn: ({signal}) => sarService.missions(true, signal),
        enabled: allowed,
        refetchInterval: SAR_POLL_MS,
    });

    const mission = (missionsQuery.data ?? []).find(item => item.missionId === missionId) ?? null;
    const isLive = mission != null && mission.sarStatus !== 'RESCUED';

    const detections = useQuery({
        queryKey: [...key, 'mission', missionId, 'detections'],
        queryFn: ({signal}) => sarService.detections(missionId, signal),
        enabled: allowed,
        refetchInterval: isLive ? SAR_POLL_MS : false,
    });

    const tasks = useQuery({
        queryKey: [...key, 'mission', missionId, 'tasks'],
        queryFn: ({signal}) => sarService.tasks(missionId, signal),
        enabled: allowed,
        refetchInterval: isLive ? SAR_POLL_MS : false,
    });

    const telemetry = useQuery({
        queryKey: [...key, 'mission', missionId, 'telemetry'],
        queryFn: ({signal}) => operationsMissionService.latestTelemetry(missionId, signal),
        enabled: allowed && mission != null,
        refetchInterval: isLive ? SAR_POLL_MS : false,
    });

    const refresh = () => Promise.all([
        client.invalidateQueries({queryKey: [...key, 'missions']}),
        client.invalidateQueries({queryKey: [...key, 'mission', missionId]}),
    ]);

    const verifyDetection = useMutation({
        mutationFn: ({detectionId, verified}: { detectionId: number; verified: boolean }) =>
            sarService.verifyDetection(detectionId, verified),
        onSuccess: refresh,
        retry: false,
    });

    const dispatchRescue = useMutation({
        mutationFn: (payload: Record<string, unknown>) => sarService.dispatchRescue(missionId, payload),
        onSuccess: refresh,
        retry: false,
    });

    const returnToHome = useMutation({
        mutationFn: () => sarService.returnToHome(missionId),
        onSuccess: refresh,
        retry: false,
    });

    return {
        mission,
        missionsQuery,
        detections,
        tasks,
        telemetry,
        verifyDetection,
        dispatchRescue,
        returnToHome,
        refresh,
    };
}
