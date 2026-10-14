import { API_ROUTES, apiClient } from '@/lib/api.client';
import { DEMO_AUDIT, DEMO_EQUIPMENT, DEMO_MEDIA, DEMO_MOVEMENTS, DEMO_STATIONS, DEMO_UAVS } from '@/lib/collection';
import type { AuditLog, Equipment, InventoryMovement, MediaAsset, Operator, PageResponse, Station, Uav, UavHistory } from '../types/operations.types';

function toPage<T>(items: T[], page = 0, size = 20): PageResponse<T> {
  return {
    content: items,
    page,
    size,
    totalElements: items.length,
    totalPages: 1,
    first: true,
    last: true,
    hasNext: false,
    hasPrevious: false,
  };
}

export interface QuantityInput { quantity: number; note?: string; requestId: string; }
export interface MediaInput { originalName: string; contentType: string; size: number; type: string; linkedEntityType?: string; linkedEntityId?: string; }
export const operationsService = {
  listStations: (page = 0, size = 100, signal?: AbortSignal) =>
    apiClient.get<PageResponse<Station>>(`/api/v1/stations?page=${page}&size=${size}`, { signal }).catch(() => toPage(DEMO_STATIONS as Station[], page, size)),
  station: (id: number, signal?: AbortSignal) =>
    apiClient.get<Station>(`/api/v1/stations/${id}`, { signal }).catch(() => (DEMO_STATIONS.find(s => s.id === id) ?? DEMO_STATIONS[0]) as Station),
  listUavs: (page = 0, size = 100, signal?: AbortSignal) =>
    apiClient.get<PageResponse<Uav>>(`/api/v1/uavs?page=${page}&size=${size}`, { signal }).catch(() => toPage(DEMO_UAVS as Uav[], page, size)),
  uav: (id: number, signal?: AbortSignal) =>
    apiClient.get<Uav>(`/api/v1/uavs/${id}`, { signal }).catch(() => (DEMO_UAVS.find(u => u.id === id) ?? DEMO_UAVS[0]) as Uav),
  uavHistory: (id: number, page = 0, signal?: AbortSignal) =>
    apiClient.get<PageResponse<UavHistory>>(`/api/v1/uavs/${id}/history?page=${page}&size=20`, { signal }).catch(() =>
      toPage<UavHistory>([
        { id: 1, uavId: id, fromStatus: 'AVAILABLE', toStatus: 'IN_USE', reason: 'Cất cánh thực hiện nhiệm vụ SAR-2026-004', changedBy: 'pilot.catba@vju.ac.vn', createdAt: '2026-10-13T08:30:00Z' },
      ], page, 20),
    ),
  listEquipment: (page = 0, size = 100, signal?: AbortSignal) =>
    apiClient.get<PageResponse<Equipment>>(`/api/v1/inventory/equipment?page=${page}&size=${size}`, { signal }).catch(() => toPage(DEMO_EQUIPMENT as Equipment[], page, size)),
  inventoryHistory: (page = 0, signal?: AbortSignal) =>
    apiClient.get<PageResponse<InventoryMovement>>(`/api/v1/inventory/equipment/history?page=${page}&size=20`, { signal }).catch(() => toPage(DEMO_MOVEMENTS as InventoryMovement[], page, 20)),
  listOperators: () =>
    apiClient.get<PageResponse<Operator>>('/api/v1/users?role=ROLE_OPERATOR&size=100').catch(() =>
      toPage<Operator>([
        { id: 2, username: 'pilot.catba', fullName: 'Nguyễn Văn An (Pilot #01)', status: 'ACTIVE', role: 'ROLE_OPERATOR' },
        { id: 3, username: 'pilot.doson', fullName: 'Trần Quốc Bảo (Pilot #02)', status: 'ACTIVE', role: 'ROLE_OPERATOR' },
      ]),
    ),
  createStation: (data: { code: string; name: string; address?: string; latitude?: number; longitude?: number }) => apiClient.post<Station>('/api/v1/stations', data),
  createUav: (data: { model: string; serialNumber: string; manufacturer: string }) => apiClient.post<Uav>('/api/v1/uavs', data),
  createEquipment: (data: { name: string; type: string; serialNumber?: string; stationId?: number }) => apiClient.post<Equipment>('/api/v1/inventory/equipment', data),
  stockIn: (id: number, quantity: number) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/stock-in`, { quantity, requestId: crypto.randomUUID() }),
  reserve: (id: number, quantity: number) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/reserve`, { quantity, requestId: crypto.randomUUID() }),
  release: (id: number, quantity: number) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/release`, { quantity, requestId: crypto.randomUUID() }),
  moveEquipment: ({ id, action, stationId, ...quantity }: QuantityInput & { id: number; action: string; stationId?: number }) => apiClient.post<Equipment>(`/api/v1/inventory/equipment/${id}/${action}${action === 'transfer' ? `/${stationId}` : ''}`, quantity),
  maintenanceUav: (id: number) => apiClient.post<Uav>(`/api/v1/uavs/${id}/maintenance`),
  assignUav: (id: number, stationId: number) => apiClient.put<Uav>(`/api/v1/uavs/${id}/station/${stationId}`),
  listMedia: (page = 0, signal?: AbortSignal) =>
    apiClient.get<PageResponse<MediaAsset>>(`/api/v1/media?page=${page}&size=20`, { signal }).catch(() => toPage(DEMO_MEDIA as MediaAsset[], page, 20)),
  registerMedia: (data: MediaInput) =>
    apiClient.post<MediaAsset>('/api/v1/media', data).catch(() => ({
      id: Date.now(),
      originalName: data.originalName,
      contentType: data.contentType,
      size: data.size,
      type: data.type,
      uploadedBy: 'KV260-SAR-Cockpit',
      storageProvider: 'MINIO_S3',
      confirmed: true,
      createdAt: new Date().toISOString(),
    })),
  uploadUrl: (id: number) => apiClient.get<{ url: string }>(`/api/v1/media/${id}/upload-url`),
  confirmMedia: (id: number) => apiClient.post<MediaAsset>(`/api/v1/media/${id}/confirm`),
  downloadUrl: (id: number) => apiClient.get<{ url: string }>(`/api/v1/media/${id}/download-url`).catch(() => ({ url: `#signed-media-${id}` })),
  deleteMedia: (id: number) => apiClient.delete<void>(`/api/v1/media/${id}`),
  listAudit: (page = 0, signal?: AbortSignal) =>
    apiClient.get<PageResponse<AuditLog>>(`/api/v1/audit-logs?page=${page}&size=20`, { signal }).catch(() => toPage(DEMO_AUDIT as AuditLog[], page, 20)),
  notifications: (page = 0, size = 20, signal?: AbortSignal) =>
    apiClient.get(`${API_ROUTES.notifications.list}?page=${page}&size=${size}`, { signal }),
  unreadCount: (signal?: AbortSignal) =>
    apiClient.get<{ count: number }>(API_ROUTES.notifications.unreadCount, { signal }),
  markNotificationRead: (id: string | number) =>
    apiClient.patch(API_ROUTES.notifications.markRead(String(id))),
  markAllNotificationsRead: () =>
    apiClient.patch(API_ROUTES.notifications.markAllRead),
};
