import {apiClient, API_ROUTES} from '@/lib/api';
import type {PageResponse, Station, StationFields, StationStatus} from '@/types/resources';

export const stationsService = {
    listStations: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Station>>(`${API_ROUTES.stations.list}?page=${page}&size=${size}`, {signal}),
    station: (id: number, signal?: AbortSignal) => apiClient.get<Station>(API_ROUTES.stations.detail(id), {signal}),
    createStation: (data: StationFields) => apiClient.post<Station>(API_ROUTES.stations.list, data),
    updateStation: (id: number, data: StationFields) => apiClient.put<Station>(API_ROUTES.stations.detail(id), data),
    /** STATION_STATUS_UPDATE; an edit never changes the status. */
    updateStationStatus: (id: number, status: StationStatus) =>
        apiClient.patch<Station>(API_ROUTES.stations.status(id), {status}),
    /** Deletes an unused station; one with history comes back deactivated instead (BR-08). */
    deleteStation: (id: number) => apiClient.delete<Station | undefined>(API_ROUTES.stations.detail(id)),
};
