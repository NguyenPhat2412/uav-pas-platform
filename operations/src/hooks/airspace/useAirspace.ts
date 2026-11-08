'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, QUIET, type MutationOptions} from '@/lib/query';
import {airspaceService} from '@/api/airspace/airspace.api';
import {airspaceKeys} from '@/hooks/airspace/query-keys';
import type {
    AirspaceCheckInput,
    AirspaceCheckResult,
    AirspaceZone,
    AirspaceZoneUpsertInput,
} from '@/types/airspace/airspace.types';

const AIRSPACE_ZONES_STALE_MS = 2 * 60_000;
const AIRSPACE_CHECK_STALE_MS = 30_000;

export function useAirspaceZones(activeOnly = true) {
    const {user, can, permissionsReady} = useAuth();
    const allowed = activeOnly ? Boolean(user) : Boolean(user) && permissionsReady && can('USER_MANAGE');
    return useQuery({
        queryKey: airspaceKeys.zones(user?.id, activeOnly),
        queryFn: ({signal}) => airspaceService.listZones(activeOnly, signal),
        enabled: allowed,
        staleTime: AIRSPACE_ZONES_STALE_MS,
        ...(activeOnly ? {meta: QUIET} : {}),
    });
}

export function useAirspaceCheck(input: AirspaceCheckInput | null, enabled = true) {
    const {user} = useAuth();
    return useQuery<AirspaceCheckResult>({
        queryKey: airspaceKeys.check(user?.id, input),
        queryFn: ({signal}) => airspaceService.check(input!, signal),
        enabled: enabled && Boolean(user) && input != null,
        staleTime: AIRSPACE_CHECK_STALE_MS,
        meta: QUIET,
    });
}

export function useCreateAirspaceZone(options?: MutationOptions<AirspaceZone, AirspaceZoneUpsertInput>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (input: AirspaceZoneUpsertInput) => airspaceService.createZone(input),
        onSuccess: afterSuccess(options, () => {
            void client.invalidateQueries({queryKey: airspaceKeys.all(user?.id)});
        }),
    });
}

export function useUpdateAirspaceZone(
    options?: MutationOptions<AirspaceZone, { id: number; input: AirspaceZoneUpsertInput }>,
) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({id, input}: { id: number; input: AirspaceZoneUpsertInput }) =>
            airspaceService.updateZone(id, input),
        onSuccess: afterSuccess(options, () => {
            void client.invalidateQueries({queryKey: airspaceKeys.all(user?.id)});
        }),
    });
}

export function useDeleteAirspaceZone(options?: MutationOptions<void, number>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (id: number) => airspaceService.deleteZone(id),
        onSuccess: afterSuccess(options, () => {
            void client.invalidateQueries({queryKey: airspaceKeys.all(user?.id)});
        }),
    });
}
