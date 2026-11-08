import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {
    MissionRehearsalInput,
    SimCommand,
    SimulationRunLog,
    SimulationStartInput,
    SimulationState,
    SurveyPlan,
    SurveyPlanInput,
} from '@/types/simulation/simulation.types';

export const simulationService = {
    list: (signal?: AbortSignal) => apiClient.get<SimulationState[]>(API_ROUTES.simulation.sessions, {signal}),
    runs: (params?: {uavId?: number; missionId?: number}, signal?: AbortSignal) => {
        const search = new URLSearchParams();
        if (params?.uavId != null) search.set('uavId', String(params.uavId));
        if (params?.missionId != null) search.set('missionId', String(params.missionId));
        const qs = search.toString();
        return apiClient.get<SimulationRunLog[]>(`${API_ROUTES.simulation.runs}${qs ? `?${qs}` : ''}`, {signal});
    },
    start: (input: SimulationStartInput) => apiClient.post<SimulationState>(API_ROUTES.simulation.sessions, input),
    rehearseMission: ({missionId, windSpeedMs, windDirectionDeg, timeScale}: MissionRehearsalInput) => {
        const search = new URLSearchParams();
        if (windSpeedMs != null) search.set('windSpeedMs', String(windSpeedMs));
        if (windDirectionDeg != null) search.set('windDirectionDeg', String(windDirectionDeg));
        if (timeScale != null) search.set('timeScale', String(timeScale));
        const qs = search.toString();
        return apiClient.post<SimulationState>(
            `${API_ROUTES.simulation.rehearseMission(missionId)}${qs ? `?${qs}` : ''}`,
        );
    },
    command: ({uavId, command}: {uavId: number; command: SimCommand}) =>
        apiClient.post<SimulationState>(API_ROUTES.simulation.commands(uavId), {command}),
    stop: (uavId: number) => apiClient.delete<void>(API_ROUTES.simulation.session(uavId)),
    surveyPlan: (input: SurveyPlanInput) => apiClient.post<SurveyPlan>(API_ROUTES.simulation.surveyPlan, input),
};

/** The simulator steps once a second, so the console follows it at the same rate. */
export const SIMULATION_POLL_MS = 1000;
