'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {fleetMapService, TELEMETRY_POLL_MS, telemetryService} from '@/features/uavs/api/telemetry.api';
import {fleetMapKeys, telemetryKeys} from '@/features/uavs/hooks/query-keys';

/** Latest fix of every UAV, polled while the view is open (UAV_READ). */
export function useFleetTelemetry() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: telemetryKeys.fleet(user?.id),
        queryFn: ({signal}) => telemetryService.fleet(signal),
        enabled: permissionsReady && can('UAV_READ'),
        refetchInterval: TELEMETRY_POLL_MS,
    });
}

/** Latest fix reported for a mission; null when its UAV has never reported. Polls only while `live`. */
export function useMissionTelemetry(missionId: number, {enabled = true, live = true}: { enabled?: boolean; live?: boolean } = {}) {
    const {user} = useAuth();
    return useQuery({
        queryKey: telemetryKeys.mission(user?.id, missionId),
        queryFn: ({signal}) => telemetryService.forMission(missionId, signal).then(v => v ?? null),
        enabled,
        refetchInterval: live ? TELEMETRY_POLL_MS : false,
    });
}

export function useFleetMap() {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: fleetMapKeys.all(user?.id),
        queryFn: ({signal}) => fleetMapService.get(signal),
        enabled: can('MISSION_VIEW_ALL'),
        refetchInterval: 60_000,
    });
}
