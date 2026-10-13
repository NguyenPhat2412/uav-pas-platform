import { apiClient } from '@/lib/api.client';
import type { Invoice, Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, PageResponse, ServicePlan, UavService, UserQuota } from './types';
const DEMO_SERVICES: UavService[] = [
  { id: 1, code: 'SAR-01', name: 'Tìm Kiếm Cứu Nạn Trên Biển & Đảo (SAR AI)', description: 'Ứng dụng AI YOLOv8s trên kit AMD KV260 phát hiện người trôi dạt, áo phao, xuồng cứu sinh thời gian thực.', defaultDurationMinutes: 120, active: true },
  { id: 2, code: 'MAP-02', name: 'Khảo Sát Không Ảnh & Bản Đồ 3D RTK', description: 'Đo vẽ độ chính xác centimet tích hợp trạm tham chiếu D-RTK 2, xuất bản đồ số độ cao DSM.', defaultDurationMinutes: 90, active: true },
  { id: 3, code: 'AGRI-03', name: 'Giám Sát Sinh Thái & Rừng Vườn Quốc Gia', description: 'Cảm biến hồng ngoại nhiệt và đa phổ phân tích sức khỏe thảm thực vật theo tiêu chuẩn VJU.', defaultDurationMinutes: 60, active: true },
  { id: 4, code: 'SEC-04', name: 'Tuần Tra An Ninh & Cảnh Báo Sớm Duyên Hải', description: 'Lộ trình bay tự động Geofence kết hợp truyền hình trực tiếp OSD độ trễ siêu thấp 5G.', defaultDurationMinutes: 180, active: true },
];

const DEMO_CUSTOMER_MISSIONS: PageResponse<Mission> = {
  content: [
    { id: 1, code: 'MS-2026-001', missionType: 'AREA_INSPECTION', title: 'Tìm kiếm cứu nạn tàu cá TB-9284', description: 'Cứu hộ khẩn cấp ngư dân tại vùng biển Cát Bà', requestedDate: '2026-10-13', startTime: '08:30', expectedEndTime: '10:30', locationName: 'Vịnh Lan Hạ, Cát Bà', latitude: 20.7284, longitude: 107.0512, status: 'IN_PROGRESS', priority: 'HIGH', customerId: 1, createdAt: '2026-10-13T08:30:00Z' },
    { id: 2, code: 'MS-2026-002', missionType: 'DATA_COLLECTION', title: 'Khảo sát địa hình Vườn Quốc Gia Cát Bà', description: 'Lập bản đồ 3D vùng lõi sinh quyển', requestedDate: '2026-10-12', startTime: '09:00', expectedEndTime: '11:00', locationName: 'Vườn Quốc Gia Cát Bà', latitude: 20.7981, longitude: 106.9934, status: 'COMPLETED', priority: 'NORMAL', customerId: 1, createdAt: '2026-10-12T09:00:00Z' },
    { id: 3, code: 'MS-2026-003', missionType: 'AREA_INSPECTION', title: 'Tuần tra ranh giới bảo tồn san hô', description: 'Giám sát hoạt động đánh bắt ven bờ', requestedDate: '2026-10-14', startTime: '07:00', expectedEndTime: '09:30', locationName: 'Đảo Hòn Dấu, Đồ Sơn', latitude: 20.6712, longitude: 106.8123, status: 'PENDING_CONFIRMATION', priority: 'LOW', customerId: 1, createdAt: '2026-10-13T10:00:00Z' },
  ],
  page: 0,
  size: 20,
  totalElements: 3,
  totalPages: 1,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

export const customerService = {
  services: async (signal?: AbortSignal) => {
    try {
      return await apiClient.get<UavService[]>('/api/v1/uav-services', { signal });
    } catch {
      return DEMO_SERVICES;
    }
  },
  // This narrows privileged accounts' UI; the backend still enforces customer ownership.
  missions: async (search = '', page = 0, status?: MissionStatus, signal?: AbortSignal) => {
    try {
      return await apiClient.get<PageResponse<Mission>>(`/api/v1/missions?${new URLSearchParams({ size: '20', page: String(page), ...(search ? { search } : {}), ...(status ? { status } : {}) })}`, { signal });
    } catch {
      return DEMO_CUSTOMER_MISSIONS;
    }
  },
  mission: (id: number, signal?: AbortSignal) => apiClient.get<Mission>(`/api/v1/missions/${id}`, { signal }),
  availability: (startTime: string, endTime: string) => apiClient.get<MissionAvailability>(`/api/v1/missions/availability?${new URLSearchParams({ startTime, endTime })}`),
  create: (data: MissionInput) => apiClient.post<Mission>('/api/v1/missions', data),
  update: (id: number, data: MissionInput) => {
    const { title, description, requestedDate, startTime, expectedEndTime, locationName, latitude, longitude, priority, notes } = data;
    return apiClient.patch<Mission>(`/api/v1/missions/${id}`, { title, description, requestedDate, startTime, expectedEndTime, locationName, latitude, longitude, priority, notes });
  },
  submit: (id: number) => apiClient.post<Mission>(`/api/v1/missions/${id}/submit`),
  cancel: (id: number) => apiClient.post<Mission>(`/api/v1/missions/${id}/cancel`),
  timeline: (id: number, signal?: AbortSignal) => apiClient.get<MissionEvent[]>(`/api/v1/missions/${id}/timeline`, { signal }),
  media: (id: number, signal?: AbortSignal) => apiClient.get<MissionMedia[]>(`/api/v1/missions/${id}/media`, { signal }),
  download: (id: number) => apiClient.get<{ url: string; expiresInSeconds: number }>(`/api/v1/media/${id}/download-url`),
  quota: (signal?: AbortSignal) => apiClient.get<UserQuota>('/api/v1/billing/quota', { signal }),
  plans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>('/api/v1/billing/plans', { signal }),
  invoices: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<Invoice>>(`/api/v1/billing/invoices?page=${page}&size=20`, { signal }),
  payInvoice: (id: number) => apiClient.post(`/api/v1/billing/invoices/${id}/pay`),
};

