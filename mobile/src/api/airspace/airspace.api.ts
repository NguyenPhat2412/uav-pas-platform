import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {AirspaceCheckInput, AirspaceCheckResult, AirspaceZone} from '@/shared/types/airspace/airspace.types';

export const airspaceService = {
    zones: (activeOnly = true, signal?: AbortSignal) =>
        apiClient.get<AirspaceZone[]>(`${API_ROUTES.airspace.zones}?${buildQueryString({activeOnly})}`, {signal}),
    check: (input: AirspaceCheckInput, signal?: AbortSignal) =>
        apiClient.post<AirspaceCheckResult>(API_ROUTES.airspace.check, input, {signal}),
};
