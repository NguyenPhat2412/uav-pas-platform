import { API_ROUTES, apiClient, apiRequest } from '@/lib/api.client';
import { DEMO_MISSIONS } from '@/lib/collection';
import { Mission, MissionDashboard, MissionEvent, MissionInput, MissionMedia, MissionStatus, MissionType, PageResponse, MediaRole, UavService, MediaType, SignedMediaUrl, MissionAvailability } from '../types/mission.types';

const base = '/api/v1/missions';
export const missionService = {
  services: () =>
    apiClient.get<UavService[]>('/api/v1/uav-services').catch(() => [
      { id: 1, code: 'SAR-01', name: 'Tìm Kiếm Cứu Nạn Trên Biển & Đảo (SAR AI)', active: true, defaultDurationMinutes: 120 },
      { id: 2, code: 'MAP-02', name: 'Khảo Sát Không Ảnh & Bản Đồ 3D RTK', active: true, defaultDurationMinutes: 90 },
    ]),
  list: (params?: { status?: MissionStatus; missionType?: MissionType; search?: string }) => {
    const query = new URLSearchParams({ size: '50' });
    if (params?.status) query.set('status', params.status);
    if (params?.missionType) query.set('missionType', params.missionType);
    if (params?.search) query.set('search', params.search);
    return apiClient.get<PageResponse<Mission>>(`${base}?${query.toString()}`).catch(() => {
      const items = (DEMO_MISSIONS as unknown as Mission[]).filter(m => {
        const matchStatus = !params?.status || m.status === params.status;
        const matchSearch = !params?.search || m.code.toLowerCase().includes(params.search.toLowerCase()) || m.title.toLowerCase().includes(params.search.toLowerCase());
        return matchStatus && matchSearch;
      });
      return {
        content: items,
        page: 0,
        size: 50,
        totalElements: items.length,
        totalPages: 1,
        first: true,
        last: true,
        hasNext: false,
        hasPrevious: false,
      };
    });
  },
  get: (id: number) =>
    apiClient.get<Mission>(`${base}/${id}`).catch(() => ((DEMO_MISSIONS as unknown as Mission[]).find(m => m.id === id) ?? (DEMO_MISSIONS[0] as unknown as Mission))),
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
  media: (id: number): Promise<MissionMedia[]> =>
    apiClient.get<MissionMedia[]>(`${base}/${id}/media`).catch((): MissionMedia[] => [
      { id: 201, missionId: id, mediaRole: 'OUTPUT', uploadedBy: 'KV260-Edge-AI', createdAt: '2026-10-13T08:48:00Z', media: { id: 501, originalName: 'SAR_LanHa_Thermal_Target01_94pct.tiff', contentType: 'image/tiff', size: 14820400, type: 'IMAGE' } },
    ]),
  attachMedia: (id: number, mediaId: number, mediaRole: MediaRole) => apiClient.post<MissionMedia>(`${base}/${id}/media`, { mediaId, mediaRole }),
  requestMediaUpload: (id: number, file: File) => apiClient.post<SignedMediaUrl>(`${base}/${id}/media/upload-url`, { originalName: file.name, contentType: file.type || 'application/octet-stream', size: file.size, type: file.type.startsWith('video/') ? 'VIDEO' as MediaType : file.type.startsWith('image/') ? 'IMAGE' as MediaType : 'DOCUMENT' as MediaType }),
  uploadFile: async (url: string, file: File) => apiRequest<void>(url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }),
  confirmMedia: (id: number, mediaId: number) => apiClient.post(`${base}/${id}/media/${mediaId}/confirm`),
  timeline: (id: number): Promise<MissionEvent[]> =>
    apiClient.get<MissionEvent[]>(`${base}/${id}/timeline`).catch((): MissionEvent[] => [
      { id: 1, eventType: 'MISSION_STARTED', actor: 'pilot.catba@vju.ac.vn', newStatus: 'IN_PROGRESS', description: 'Cất cánh từ Trạm ST-01 Cát Bà theo quỹ đạo IAMSAR.', createdAt: '2026-10-13T08:30:00Z' },
    ]),
  dashboard: () =>
    apiClient.get<MissionDashboard>('/api/v1/dashboard/missions').catch(() => ({
      totalMissions: 18,
      pendingMissions: 3,
      confirmedMissions: 4,
      readyMissions: 2,
      inProgressMissions: 2,
      completedMissions: 6,
      failedMissions: 1,
    })),
  availability: (startTime: string, endTime: string) => apiClient.get<MissionAvailability>(`${base}/availability?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`),
  sarGridGenerate: (payload: unknown) => apiClient.post(API_ROUTES.sar.gridGenerate, payload),
  sarDetections: (missionId?: string) => apiClient.get(API_ROUTES.sar.detections(missionId)),
  verifySarDetection: (detectionId: string, verified: boolean) => apiClient.patch(API_ROUTES.sar.verifyDetection(detectionId, verified)),
  sendSarCommand: (uavId: string, payload: unknown) => apiClient.post(API_ROUTES.sar.command(uavId), payload),
  aiModels: () => apiClient.get(API_ROUTES.ai.models),
  activateAiModel: (modelId: string) => apiClient.post(API_ROUTES.ai.activateModel(modelId)),
  aiInfer: (payload: unknown) => apiClient.post(API_ROUTES.ai.infer, payload),
};
