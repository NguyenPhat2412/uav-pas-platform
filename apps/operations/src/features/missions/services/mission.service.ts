import { apiClient, apiRequest } from '@/lib/api.client';
import { Mission, MissionDashboard, MissionEvent, MissionInput, MissionMedia, MissionStatus, MissionType, PageResponse, MediaRole, UavService, MediaType, SignedMediaUrl, MissionAvailability } from '../types/mission.types';

const base = '/api/v1/missions';
export const missionService = {
  services: () => apiClient.get<UavService[]>('/api/v1/uav-services'),
  list: (params?: { status?: MissionStatus; missionType?: MissionType; search?: string }) => {
    const query = new URLSearchParams({ size: '50' });
    if (params?.status) query.set('status', params.status);
    if (params?.missionType) query.set('missionType', params.missionType);
    if (params?.search) query.set('search', params.search);
    return apiClient.get<PageResponse<Mission>>(`${base}?${query.toString()}`);
  },
  get: (id: number) => apiClient.get<Mission>(`${base}/${id}`),
  create: (data: MissionInput) => apiClient.post<Mission>(base, data),
  update: (id: number, data: Omit<MissionInput, 'missionType'>) => apiClient.patch<Mission>(`${base}/${id}`, data),
  submit: (id: number) => apiClient.post<Mission>(`${base}/${id}/submit`),
  cancel: (id: number) => apiClient.post<Mission>(`${base}/${id}/cancel`),
  confirm: (id: number) => apiClient.post<Mission>(`${base}/${id}/confirm`),
  reject: (id: number, reason: string) => apiClient.post<Mission>(`${base}/${id}/reject?reason=${encodeURIComponent(reason)}`),
  ready: (id: number) => apiClient.post<Mission>(`${base}/${id}/ready`),
  start: (id: number) => apiClient.post<Mission>(`${base}/${id}/start`),
  accept: (id: number) => apiClient.post<Mission>(`${base}/${id}/accept`),
  reportConflict: (id: number, note: string) => apiClient.post<Mission>(`${base}/${id}/report-conflict?note=${encodeURIComponent(note)}`),
  complete: (id: number, completionNote: string, equipmentCondition?: string) => apiClient.post<Mission>(`${base}/${id}/complete`, { completionNote, equipmentCondition }),
  fail: (id: number, failureReason: string, notes?: string) => apiClient.post<Mission>(`${base}/${id}/fail`, { failureReason, notes }),
  assignStation: (id: number, resourceId: number) => apiClient.post<Mission>(`${base}/${id}/assign-station`, { resourceId, quantity: 1 }),
  assignUav: (id: number, resourceId: number) => apiClient.post<Mission>(`${base}/${id}/assign-uav`, { resourceId, quantity: 1 }),
  assignOperator: (id: number, resourceId: number) => apiClient.post<Mission>(`${base}/${id}/assign-operator`, { resourceId, quantity: 1 }),
  reserveEquipment: (id: number, resourceId: number, quantity: number) => apiClient.post<Mission>(`${base}/${id}/reserve-equipment`, { resourceId, quantity }),
  media: (id: number) => apiClient.get<MissionMedia[]>(`${base}/${id}/media`),
  attachMedia: (id: number, mediaId: number, mediaRole: MediaRole) => apiClient.post<MissionMedia>(`${base}/${id}/media`, { mediaId, mediaRole }),
  requestMediaUpload: (id: number, file: File) => apiClient.post<SignedMediaUrl>(`${base}/${id}/media/upload-url`, { originalName: file.name, contentType: file.type || 'application/octet-stream', size: file.size, type: file.type.startsWith('video/') ? 'VIDEO' as MediaType : file.type.startsWith('image/') ? 'IMAGE' as MediaType : 'DOCUMENT' as MediaType }),
  uploadFile: async (url: string, file: File) => apiRequest<void>(url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }),
  confirmMedia: (id: number, mediaId: number) => apiClient.post(`${base}/${id}/media/${mediaId}/confirm`),
  timeline: (id: number) => apiClient.get<MissionEvent[]>(`${base}/${id}/timeline`),
  dashboard: () => apiClient.get<MissionDashboard>('/api/v1/dashboard/missions'),
  availability: (startTime: string, endTime: string) => apiClient.get<MissionAvailability>(`${base}/availability?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`),
};
