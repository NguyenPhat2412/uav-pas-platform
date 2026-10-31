import {apiClient, API_ROUTES} from '@/lib/api';
import type {Equipment, InventoryMovement, PageResponse, QuantityInput} from '@/types/resources';

export const inventoryService = {
    listEquipment: (page = 0, size = 100, signal?: AbortSignal) =>
        apiClient.get<PageResponse<Equipment>>(`${API_ROUTES.inventory.equipment}?page=${page}&size=${size}`, {signal}),
    inventoryHistory: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<InventoryMovement>>(`${API_ROUTES.inventory.equipmentHistory}?page=${page}&size=20`, {signal}),
    createEquipment: (data: {
        name: string;
        type: string;
        serialNumber?: string;
        stationId?: number
    }) => apiClient.post<Equipment>(API_ROUTES.inventory.equipment, data),
    stockIn: (id: number, quantity: number) =>
        apiClient.post<Equipment>(API_ROUTES.inventory.equipmentStockIn(id), {
            quantity,
            requestId: crypto.randomUUID()
        }),
    reserve: (id: number, quantity: number) =>
        apiClient.post<Equipment>(API_ROUTES.inventory.equipmentReserve(id), {
            quantity,
            requestId: crypto.randomUUID()
        }),
    release: (id: number, quantity: number) =>
        apiClient.post<Equipment>(API_ROUTES.inventory.equipmentRelease(id), {
            quantity,
            requestId: crypto.randomUUID()
        }),
    moveEquipment: ({id, action, stationId, ...quantity}: QuantityInput & {
        id: number;
        action: string;
        stationId?: number
    }) => apiClient.post<Equipment>(API_ROUTES.inventory.equipmentMove(id, action, stationId), quantity),
};
