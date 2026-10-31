import {apiClient, API_ROUTES} from '@/lib/api';
import type {PageResponse, Station} from '@/types/resources';

export const stationsService = {
    listStations: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Station>>(`${API_ROUTES.stations.list}?page=${page}&size=${size}`, {signal}),
    station: (id: number, signal?: AbortSignal) => apiClient.get<Station>(API_ROUTES.stations.detail(id), {signal}),
    createStation: (data: {
        code: string;
        name: string;
        address?: string;
        latitude?: number;
        longitude?: number
    }) => apiClient.post<Station>(API_ROUTES.stations.list, data),
    updateStation: (id: number, data: {
        code: string;
        name: string;
        address?: string;
        latitude?: number;
        longitude?: number
    }) => apiClient.put<Station>(API_ROUTES.stations.detail(id), data),
};
