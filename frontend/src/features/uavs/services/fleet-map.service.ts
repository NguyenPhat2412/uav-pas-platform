import {apiClient} from '@/lib/api';
import {API_ROUTES} from '@/lib/api/routes';
import type {FleetMap} from '@/features/uavs/types/fleet-map.types';

export const fleetMapService = {
    get: (signal?: AbortSignal) => apiClient.get<FleetMap>(API_ROUTES.dashboard.fleetMap, {signal}),
};
