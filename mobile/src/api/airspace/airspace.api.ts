import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {
    AirspaceCheckInput,
    AirspaceCheckResult,
    AirspaceZone,
    AirspaceZoneUpsertInput,
} from '@/shared/types/airspace/airspace.types';

/** Airspace restriction zones and pre-flight geofence conflict checks. */
export const airspaceService = {
    /** Lists restricted, prohibited, and warning airspace zones. */
    zones: (activeOnly = true, signal?: AbortSignal) =>
        apiClient.get<AirspaceZone[]>(`${API_ROUTES.airspace.zones}?${buildQueryString({activeOnly})}`, {signal}),

    /** Evaluates a proposed flight geometry and altitude against active airspace zones. */
    check: (input: AirspaceCheckInput, signal?: AbortSignal) =>
        apiClient.post<AirspaceCheckResult>(API_ROUTES.airspace.check, input, {signal}),

    /** Creates a new regulated airspace zone (Administrator only). */
    createZone: (input: AirspaceZoneUpsertInput) =>
        apiClient.post<AirspaceZone>(API_ROUTES.airspace.zones, input),

    /** Updates an existing airspace zone's geometry, altitude ceiling, or active state. */
    updateZone: (id: number, input: AirspaceZoneUpsertInput) =>
        apiClient.put<AirspaceZone>(API_ROUTES.airspace.zoneById(id), input),

    /** Permanently removes an airspace zone by ID. */
    deleteZone: (id: number) =>
        apiClient.delete<void>(API_ROUTES.airspace.zoneById(id)),
};
