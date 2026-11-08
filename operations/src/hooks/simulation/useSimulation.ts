'use client';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {SIMULATION_POLL_MS, simulationService} from '@/api/simulation/simulation.api';
import {useOperationMutation} from '@/hooks/useOperationMutation';

/** Every simulated flight, polled at the simulator's own 1 Hz step (UAV_VIEW). */
export function useSimulations() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'simulation', 0),
        queryFn: ({signal}) => simulationService.list(signal),
        enabled: permissionsReady && can('UAV_VIEW'),
        refetchInterval: SIMULATION_POLL_MS,
    });
}

/** Persisted digital flight rehearsal history from PostgreSQL simulation_run_logs (UAV_VIEW). */
export function useSimulationRuns(params?: {uavId?: number; missionId?: number}) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'simulation-runs', params?.missionId ?? params?.uavId ?? 0),
        queryFn: ({signal}) => simulationService.runs(params, signal),
        enabled: permissionsReady && can('UAV_VIEW'),
        refetchInterval: 4000,
    });
}

export function useSimulationMutations() {
    return {
        start: useOperationMutation(simulationService.start, ['simulation', 'simulation-runs', 'audit']),
        rehearseMission: useOperationMutation(simulationService.rehearseMission, [
            'simulation',
            'simulation-runs',
            'audit',
        ]),
        command: useOperationMutation(simulationService.command, ['simulation', 'simulation-runs', 'audit']),
        stop: useOperationMutation(simulationService.stop, ['simulation', 'simulation-runs', 'audit']),
        surveyPlan: useMutation({mutationFn: simulationService.surveyPlan}),
    };
}
