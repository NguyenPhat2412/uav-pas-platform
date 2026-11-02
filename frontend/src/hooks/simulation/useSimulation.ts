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

export function useSimulationMutations() {
    return {
        start: useOperationMutation(simulationService.start, ['simulation', 'audit']),
        command: useOperationMutation(simulationService.command, ['simulation', 'audit']),
        stop: useOperationMutation(simulationService.stop, ['simulation', 'audit']),
        surveyPlan: useMutation({mutationFn: simulationService.surveyPlan}),
    };
}
