import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {queryKeys} from '@/shared/lib/query';
import type {MissionRehearsalInput, SimCommand, SimulationStartInput} from '@/shared/types/simulation/simulation.types';
import {MOBILE_SIMULATION_POLL_MS, simulationService} from '@/api/simulation/simulation.api';
import {useAuth} from '@/providers/AuthContext';

export function useSimulations(enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'simulation');
    return useQuery({
        queryKey: [...key, 'sessions'],
        queryFn: ({signal}) => simulationService.list(signal),
        enabled: enabled && permissionsReady && can('UAV_VIEW'),
        refetchInterval: MOBILE_SIMULATION_POLL_MS,
    });
}

export function useSimulationRuns(params?: {uavId?: number; missionId?: number}, enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    const key = queryKeys.feature(user?.id, 'simulation');
    return useQuery({
        queryKey: [...key, 'runs', params ?? {}],
        queryFn: ({signal}) => simulationService.runs(params, signal),
        enabled: enabled && permissionsReady && can('UAV_VIEW'),
        refetchInterval: 6_000,
    });
}

export function useSimulationActions() {
    const {user} = useAuth();
    const client = useQueryClient();
    const simulationKey = queryKeys.feature(user?.id, 'simulation');
    const fleetKey = queryKeys.feature(user?.id, 'fleet');

    const refresh = () =>
        Promise.all([
            client.invalidateQueries({queryKey: simulationKey}),
            client.invalidateQueries({queryKey: fleetKey}),
        ]);

    const start = useMutation({
        mutationFn: (input: SimulationStartInput) => simulationService.start(input),
        onSuccess: refresh,
        retry: false,
    });

    const rehearseMission = useMutation({
        mutationFn: (input: MissionRehearsalInput) => simulationService.rehearseMission(input),
        onSuccess: refresh,
        retry: false,
    });

    const command = useMutation({
        mutationFn: (input: {uavId: number; command: SimCommand}) => simulationService.command(input),
        onSuccess: refresh,
        retry: false,
    });

    const stop = useMutation({
        mutationFn: (uavId: number) => simulationService.stop(uavId),
        onSuccess: refresh,
        retry: false,
    });

    return {start, rehearseMission, command, stop};
}
