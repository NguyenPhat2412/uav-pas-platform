import { apiClient } from '@/lib/api.client';
import { uavChangeReason } from '../uav-workflows';
import type { AuditLog, Equipment, InventoryMovement, MediaAsset, Operator, PageResponse, Station, Uav, UavHistory } from '../types/operations.types';

export interface QuantityInput { quantity: number; note?: string; requestId: string; }
export interface MediaInput { originalName: string; contentType: string; size: number; type: string; linkedEntityType?: string; linkedEntityId?: string; }
export const operationsService = {
  listStations: (page = 0, size = 100, signal?: AbortSignal) => apiClient.get<PageResponse<Station>>(`/api/v1/stations?page=${page}&size=${size}`, { signal }),
  station: (id: number, signal?: AbortSignal) => apiClient.get<Station>(`/api/v1/stations/${id}`, { signal }),
  listUavs: (page = 0, size = 100, signal?: AbortSignal) => apiClient.get<PageResponse<Uav>>(`/api/v1/uavs?page=${page}&size=${size}`, { signal }),
  uav: (id: number, signal?: AbortSignal) => apiClient.get<Uav>(`/api/v1/uavs/${id}`, { signal }),
  uavHistory: (id: number, page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<UavHistory>>(`/api/v1/uavs/${id}/history?page=${page}&size=20`, { signal }),
  listEquipment: (page = 0, size = 100, signal?: AbortSignal) => apiClient.get<PageResponse<Equipment>>(`/api/v1/inventory/equipment?page=${page}&size=${size}`, { signal }),
  inventoryHistory: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<InventoryMovement>>(`/api/v1/inventory/equipment/history?page=${page}&size=20`, { signal }),
  listOperators: (page = 0, size = 100, signal?: AbortSignal) => apiClient.get<PageResponse<Operator>>(`/api/v1/users?role=ROLE_OPERATOR&page=${page}&size=${size}`, { signal }),
  createStation: (data: { code: string; name: string; address?: string; latitude?: number; longitude?: number }) => apiClient.post<Station>('/api/v1/stations', data),
  createUav: (data: { model: string; serialNumber: string; manufacturer: string }) => apiClient.post<Uav>('/api/v1/uavs', data),
  createEquipment: (data: { name: string; type: string; serialNumber?: string; stationId?: number }) => apiClient.post<Equipment>('/api/v1/inventory/equipment', data),
  stockIn: (id: number, quantity: number) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/stock-in`, { quantity, requestId: crypto.randomUUID() }),
  reserve: (id: number, quantity: number) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/reserve`, { quantity, requestId: crypto.randomUUID() }),
  release: (id: number, quantity: number) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/release`, { quantity, requestId: crypto.randomUUID() }),
  moveEquipment: ({ id, action, stationId, ...quantity }: QuantityInput & { id: number; action: string; stationId?: number }) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/${action}${action === 'transfer' ? `/${stationId}` : ''}`, quantity),
  maintenanceUav: ({ id, reason, expectedStatus }: { id: number; reason: string; expectedStatus: string }) => apiClient.post<Uav>(`/api/v1/uavs/${id}/maintenance?${new URLSearchParams({ reason: uavChangeReason(reason), expectedStatus })}`),
  completeUavMaintenance: ({ id, reason, expectedStatus }: { id: number; reason: string; expectedStatus: string }) => apiClient.put<Uav>(`/api/v1/uavs/${id}/status?${new URLSearchParams({ status: 'AVAILABLE', reason: uavChangeReason(reason), expectedStatus })}`),
  assignUav: (id: number, stationId: number) => apiClient.put<Uav>(`/api/v1/uavs/${id}/station/${stationId}`),
  listMedia: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<MediaAsset>>(`/api/v1/media?page=${page}&size=20`, { signal }),
  registerMedia: (data: MediaInput) => apiClient.post<MediaAsset>('/api/v1/media', data),
  uploadUrl: (id: number) => apiClient.get<{ url: string }>(`/api/v1/media/${id}/upload-url`),
  confirmMedia: (id: number) => apiClient.post<MediaAsset>(`/api/v1/media/${id}/confirm`),
  downloadUrl: (id: number) => apiClient.get<{ url: string }>(`/api/v1/media/${id}/download-url`),
  deleteMedia: (id: number) => apiClient.delete<void>(`/api/v1/media/${id}`),
  listAudit: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<AuditLog>>(`/api/v1/audit-logs?page=${page}&size=20`, { signal }),
};
