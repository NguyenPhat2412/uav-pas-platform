import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {UavTelemetry} from '@/features/uavs/types/telemetry.types';

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
