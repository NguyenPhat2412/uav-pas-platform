import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {
    MissionRehearsalInput,
    SimCommand,
    SimulationRunLog,
    SimulationStartInput,
    SimulationState,
} from '@/shared/types/simulation/simulation.types';

export const simulationService = {
    list: (signal?: AbortSignal) =>
        apiClient.get<SimulationState[]>(API_ROUTES.simulation.sessions, {signal}),
    runs: (params?: {uavId?: number; missionId?: number}, signal?: AbortSignal) => {
        const qs = buildQueryString({
            uavId: params?.uavId,
            missionId: params?.missionId,
        });
        return apiClient.get<SimulationRunLog[]>(
            `${API_ROUTES.simulation.runs}${qs ? `?${qs}` : ''}`,
            {signal},
        );
    },
    start: (input: SimulationStartInput) =>
        apiClient.post<SimulationState>(API_ROUTES.simulation.sessions, input),
    rehearseMission: ({missionId, windSpeedMs, windDirectionDeg, timeScale}: MissionRehearsalInput) => {
        const qs = buildQueryString({windSpeedMs, windDirectionDeg, timeScale});
        return apiClient.post<SimulationState>(
            `${API_ROUTES.simulation.rehearseMission(missionId)}${qs ? `?${qs}` : ''}`,
        );
    },
    command: ({uavId, command}: {uavId: number; command: SimCommand}) =>
        apiClient.post<SimulationState>(API_ROUTES.simulation.commands(uavId), {command}),
    stop: (uavId: number) =>
        apiClient.delete<void>(API_ROUTES.simulation.session(uavId)),
};

export const MOBILE_SIMULATION_POLL_MS = 2_000;
