import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import {closingNote} from '@/shared/utils/maintenance/workflows';
import type {RepairOrder} from '@/shared/types/maintenance/maintenance.types';
import type {PageResponse, Station, Uav} from '@/shared/types/resources';
import type {FleetMap} from '@/shared/types/uav/fleet-map.types';
import type {UavTelemetry} from '@/shared/types/uav/telemetry.types';

export const fleetService = {
    fleetMap: (signal?: AbortSignal) =>
        apiClient.get<FleetMap>(API_ROUTES.dashboard.fleetMap, {signal}),
    uavs: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Uav>>(`${API_ROUTES.uavs.list}?${buildQueryString({size: 50})}`, {signal}),
    stations: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Station>>(`${API_ROUTES.stations.list}?${buildQueryString({size: 50})}`, {signal}),
    fleetTelemetry: (signal?: AbortSignal) =>
        apiClient.get<UavTelemetry[]>(API_ROUTES.uavs.fleetTelemetry, {signal}),
    orders: (page = 0, status = '', signal?: AbortSignal) =>
        apiClient.get<PageResponse<RepairOrder>>(
            `${API_ROUTES.maintenance.orders}?${buildQueryString({page, size: 20, status: status || undefined})}`,
            {signal},
        ),
    startOrder: (orderId: number, expectedVersion: number) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orderStart(orderId), {expectedVersion}),
    completeOrder: (orderId: number, expectedVersion: number, inspectionNotes: string, inspectionPassed: boolean) =>
        apiClient.post<RepairOrder>(API_ROUTES.maintenance.orderComplete(orderId), {
            expectedVersion,
            inspectionNotes: closingNote(inspectionNotes),
            inspectionPassed,
        }),
};
