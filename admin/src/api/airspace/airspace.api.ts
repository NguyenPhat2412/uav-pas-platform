import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    AirspaceCheckInput,
    AirspaceCheckResult,
    AirspaceZone,
    AirspaceZoneUpsertInput,
} from '@/types/airspace/airspace.types';

export const airspaceService = {
    listZones: (activeOnly = true, signal?: AbortSignal) =>
        apiClient.get<AirspaceZone[]>(`${API_ROUTES.airspace.zones}?activeOnly=${activeOnly}`, {signal}),
    check: (input: AirspaceCheckInput, signal?: AbortSignal) =>
        apiClient.post<AirspaceCheckResult>(API_ROUTES.airspace.check, input, {signal}),
    createZone: (input: AirspaceZoneUpsertInput) =>
        apiClient.post<AirspaceZone>(API_ROUTES.airspace.zones, input),
    updateZone: (id: number, input: AirspaceZoneUpsertInput) =>
        apiClient.put<AirspaceZone>(API_ROUTES.airspace.zoneById(id), input),
    deleteZone: (id: number) =>
        apiClient.delete<void>(API_ROUTES.airspace.zoneById(id)),
};
