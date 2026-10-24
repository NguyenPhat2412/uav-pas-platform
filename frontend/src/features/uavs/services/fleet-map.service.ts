import {apiClient} from '@/lib/api';
import type {FleetMap} from '@/features/uavs/types/fleet-map.types';

export const fleetMapService = {
    get: (signal?: AbortSignal) => apiClient.get<FleetMap>('/api/v1/dashboard/fleet-map', {signal}),
};
