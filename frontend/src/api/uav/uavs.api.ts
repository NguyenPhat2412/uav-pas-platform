import {apiClient, API_ROUTES} from '@/lib/api';
import {uavChangeReason} from '@/utils/uav/workflows';
import type {PageResponse, Uav, UavHistory} from '@/types/resources';

export const uavsService = {
    listUavs: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Uav>>(`${API_ROUTES.uavs.list}?page=${page}&size=${size}`, {signal}),
    uav: (id: number, signal?: AbortSignal) => apiClient.get<Uav>(API_ROUTES.uavs.detail(id), {signal}),
    uavHistory: (id: number, page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<UavHistory>>(`${API_ROUTES.uavs.history(id)}?page=${page}&size=20`, {signal}),
    createUav: (data: {
        model: string;
        serialNumber: string;
        manufacturer: string
    }) => apiClient.post<Uav>(API_ROUTES.uavs.list, data),
    maintenanceUav: ({id, reason, expectedStatus}: {
        id: number;
        reason: string;
        expectedStatus: string
    }) => {
        const params = new URLSearchParams({
            reason: uavChangeReason(reason),
            expectedStatus
        });
        return apiClient.post<Uav>(`${API_ROUTES.uavs.maintenance(id)}?${params}`);
    },
    completeUavMaintenance: ({id, reason, expectedStatus}: {
        id: number;
        reason: string;
        expectedStatus: string
    }) => {
        const params = new URLSearchParams({
            status: 'AVAILABLE',
            reason: uavChangeReason(reason),
            expectedStatus
        });
        return apiClient.put<Uav>(`${API_ROUTES.uavs.status(id)}?${params}`);
    },
    assignUav: (id: number, stationId: number) => apiClient.put<Uav>(API_ROUTES.uavs.station(id, stationId)),
};
