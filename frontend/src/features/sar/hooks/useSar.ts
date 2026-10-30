'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, type MutationOptions} from '@/lib/query';
import {sarService} from '@/features/sar/api/sar.api';
import {sarKeys} from '@/features/sar/hooks/query-keys';
import type {AiDetection, SarDispatchResult, SarFlightPlan} from '@/features/sar/types/sar.types';

/** Detections and AI tasks arrive from the edge device; the cockpit polls them. */
export const DETECTION_POLL_MS = 10000;

export function useSarMissions(options: { enabled?: boolean; refetchInterval?: number } = {}) {
    const {user} = useAuth();
    return useQuery({
        queryKey: sarKeys.missions(user?.id),
        queryFn: ({signal}) => sarService.missions(false, signal),
        enabled: options.enabled,
        refetchInterval: options.refetchInterval,
    });
}

export function useSarDetections(missionId: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: sarKeys.detections(user?.id, missionId),
        queryFn: ({signal}) => sarService.detections(missionId, signal),
        refetchInterval: DETECTION_POLL_MS,
    });
}

export function useSarTasks(missionId: number) {
    const {user} = useAuth();
    return useQuery({
        queryKey: sarKeys.tasks(user?.id, missionId),
        queryFn: ({signal}) => sarService.tasks(missionId, signal),
        refetchInterval: DETECTION_POLL_MS,
    });
}

function useRefreshSarMissions() {
    const client = useQueryClient();
    const {user} = useAuth();
    return () => void client.invalidateQueries({queryKey: sarKeys.missions(user?.id)});
}

export function useSarDispatchRescue(missionId: number, options?: MutationOptions<SarDispatchResult, AiDetection>) {
    const refresh = useRefreshSarMissions();
    return useMutation({
        ...options,
        mutationFn: (target: AiDetection) => sarService.dispatchRescue(missionId, {
            detectionId: target.id,
            label: target.label,
            confidence: target.confidence,
            latitude: target.latitude,
            longitude: target.longitude,
            coordinates: `${target.latitude}, ${target.longitude}`,
            verified: target.verified,
        }),
        onSuccess: afterSuccess(options, refresh),
    });
}

export function useSarReturnToHome(missionId: number, options?: MutationOptions<SarDispatchResult>) {
    const refresh = useRefreshSarMissions();
    return useMutation({
        ...options,
        mutationFn: () => sarService.returnToHome(missionId),
        onSuccess: afterSuccess(options, refresh),
    });
}

/** Toggles a detection's verified flag and patches the shared detection list in place. */
export function useSarVerifyDetection(missionId: number, options?: MutationOptions<AiDetection, AiDetection>) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        ...options,
        mutationFn: (detection: AiDetection) => sarService.verify(detection.id, !detection.verified),
        onSuccess: afterSuccess(options, updated => client.setQueryData<AiDetection[]>(sarKeys.detections(user?.id, missionId),
            previous => previous?.map(d => d.id === updated.id ? updated : d))),
    });
}

export function useSarFlightPlan(mission: { missionId: number; lkpLatitude: number; lkpLongitude: number }, options?: MutationOptions<SarFlightPlan>) {
    return useMutation({
        ...options,
        mutationFn: () => sarService.flightPlan(mission.missionId, mission.lkpLatitude, mission.lkpLongitude),
    });
}
