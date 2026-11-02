import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {SimCommand, SimulationStartInput, SimulationState, SurveyPlan, SurveyPlanInput} from '@/types/simulation/simulation.types';

export const simulationService = {
    list: (signal?: AbortSignal) => apiClient.get<SimulationState[]>(API_ROUTES.simulation.sessions, {signal}),
    start: (input: SimulationStartInput) => apiClient.post<SimulationState>(API_ROUTES.simulation.sessions, input),
    command: ({uavId, command}: {uavId: number; command: SimCommand}) =>
        apiClient.post<SimulationState>(API_ROUTES.simulation.commands(uavId), {command}),
    stop: (uavId: number) => apiClient.delete<void>(API_ROUTES.simulation.session(uavId)),
    surveyPlan: (input: SurveyPlanInput) => apiClient.post<SurveyPlan>(API_ROUTES.simulation.surveyPlan, input),
};

/** The simulator steps once a second, so the console follows it at the same rate. */
export const SIMULATION_POLL_MS = 1000;
