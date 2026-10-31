import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {FleetMap} from '@/types/uav/fleet-map.types';
import type {UavTelemetry} from '@/types/uav/telemetry.types';

export const fleetMapService = {
    get: (signal?: AbortSignal) => apiClient.get<FleetMap>(API_ROUTES.dashboard.fleetMap, {signal}),
};

/** Every call resolves to undefined (HTTP 204) when the UAV has never reported. */
export const telemetryService = {
    latest: (uavId: number, signal?: AbortSignal) =>
        apiClient.get<UavTelemetry | undefined>(API_ROUTES.uavs.latestTelemetry(uavId), {signal}),
    fleet: (signal?: AbortSignal) =>
        apiClient.get<UavTelemetry[]>(API_ROUTES.uavs.fleetTelemetry, {signal}),
    forMission: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<UavTelemetry | undefined>(API_ROUTES.missions.latestTelemetry(missionId), {signal}),
};

/** Telemetry is polled; device gateways push at roughly 1 Hz, the UI refreshes every few seconds. */
export const TELEMETRY_POLL_MS = 5000;
