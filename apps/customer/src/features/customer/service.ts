import { apiClient } from '@/lib/api.client';
import type { Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, PageResponse, UavService } from './types';
import { missionUpdatePayload } from './mission-form';
export const customerService = {
  services: (signal?: AbortSignal) => apiClient.get<UavService[]>('/api/v1/uav-services', { signal }),
  // This narrows privileged accounts' UI; the backend still enforces customer ownership.
  missions: (search = '', page = 0, status?: MissionStatus, signal?: AbortSignal) => apiClient.get<PageResponse<Mission>>(`/api/v1/missions?${new URLSearchParams({ size: '20', page: String(page), ...(search ? { search } : {}), ...(status ? { status } : {}) })}`, { signal }),
  mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(`/api/v1/missions/${id}`, { signal }),
  availability: (startTime: string, endTime: string) => apiClient.get<MissionAvailability>(`/api/v1/missions/availability?${new URLSearchParams({ startTime, endTime })}`),
  create: (data: MissionInput) => apiClient.post<Mission>('/api/v1/missions', data),
  update: (id: number, data: MissionInput) => apiClient.patch<Mission>(`/api/v1/missions/${id}`, missionUpdatePayload(data)),
  submit: (id: number) => apiClient.post<Mission>(`/api/v1/missions/${id}/submit`),
  cancel: (id: number) => apiClient.post<Mission>(`/api/v1/missions/${id}/cancel`),
  timeline: (id: number, signal?: AbortSignal) => apiClient.get<MissionEvent[]>(`/api/v1/missions/${id}/timeline`, { signal }),
  media: (id: number, signal?: AbortSignal) => apiClient.get<MissionMedia[]>(`/api/v1/missions/${id}/media`, { signal }),
  download: (id: number) => apiClient.get<{ url: string; expiresInSeconds: number }>(`/api/v1/media/${id}/download-url`),
};
