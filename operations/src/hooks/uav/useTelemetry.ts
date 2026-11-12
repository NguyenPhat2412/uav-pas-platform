'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {fleetMapService, TELEMETRY_POLL_MS, telemetryService} from '@/api/uav/telemetry.api';
import {fleetMapKeys, telemetryKeys} from '@/hooks/uav/query-keys';
import {QUIET} from '@/lib/query';

/** Latest fix of every UAV, polled while the view is open (UAV_VIEW). */
export function useFleetTelemetry() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: telemetryKeys.fleet(user?.id),
        queryFn: ({signal}) => telemetryService.fleet(signal),
        enabled: permissionsReady && can('UAV_VIEW'),
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

/** Full 3D flight trajectory, attitude HUD and terrain clearance replay for a mission. */
export function useMissionTelemetryReplay(missionId: number, enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: telemetryKeys.replay(user?.id, missionId),
        queryFn: ({signal}) => telemetryService.replayForMission(missionId, signal),
        enabled: enabled && Number.isSafeInteger(missionId) && missionId > 0 && permissionsReady && can('MISSION_VIEW'),
        meta: QUIET,
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
