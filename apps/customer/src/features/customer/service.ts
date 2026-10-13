import { apiClient } from '@/lib/api.client';
import type { Invoice, Mission, MissionAvailability, MissionEvent, MissionInput, MissionMedia, MissionStatus, PageResponse, ServicePlan, UavService, UserQuota } from './types';

export const DEMO_SERVICES: UavService[] = [
  { id: 1, code: 'SAR-01', name: 'Tìm Kiếm Cứu Nạn Trên Biển & Đảo (SAR AI)', description: 'Ứng dụng AI YOLOv8s trên kit AMD Kria KV260 phát hiện người trôi dạt, áo phao, xuồng cứu sinh thời gian thực với camera nhiệt FLIR Boson.', defaultDurationMinutes: 120, active: true },
  { id: 2, code: 'MAP-02', name: 'Khảo Sát Không Ảnh & Bản Đồ 3D RTK', description: 'Đo vẽ địa hình độ chính xác centimet tích hợp trạm tham chiếu D-RTK 2, xuất bản đồ số độ cao DSM và đám mây điểm LiDAR.', defaultDurationMinutes: 90, active: true },
  { id: 3, code: 'AGRI-03', name: 'Giám Sát Sinh Thái & Rừng Vườn Quốc Gia', description: 'Cảm biến hồng ngoại nhiệt và đa phổ phân tích chỉ số NDVI sức khỏe thảm thực vật, cảnh báo sớm cháy rừng theo tiêu chuẩn VJU.', defaultDurationMinutes: 60, active: true },
  { id: 4, code: 'SEC-04', name: 'Tuần Tra An Ninh & Cảnh Báo Sớm Duyên Hải', description: 'Lộ trình bay tự động Geofence kết hợp truyền hình trực tiếp WebRTC OSD độ trễ siêu thấp qua mạng 5G/Starlink.', defaultDurationMinutes: 180, active: true },
  { id: 5, code: 'ENV-05', name: 'Quan Trắc Môi Trường Nước & Tràn Dầu Vịnh Biển', description: 'Phát hiện vệt dầu loang, rác thải nhựa đại dương và thu thập mẫu nước mặt tự động tại khu vực cảng biển.', defaultDurationMinutes: 75, active: true },
  { id: 6, code: 'LOG-06', name: 'Vận Chuyển Vật Tư Y Tế Khẩn Cấp Liên Đảo', description: 'Chuyên chở thuốc cấp cứu, huyết tương và phao cứu sinh tự bơm hơi tới các đảo tiền tiêu trong điều kiện gió cấp 6.', defaultDurationMinutes: 45, active: true },
];

export const DEMO_CUSTOMER_MISSIONS: PageResponse<Mission> = {
  content: [
    { id: 1, code: 'MS-2026-001', serviceId: 1, missionType: 'AREA_INSPECTION', title: 'Tìm kiếm cứu nạn tàu cá TB-9284', description: 'Cứu hộ khẩn cấp ngư dân mất liên lạc tại vùng biển Đông Nam Vịnh Lan Hạ, Cát Bà sử dụng tổ hợp UAV M300 RTK + KV260 AI.', requestedDate: '2026-10-13', startTime: '2026-10-13T08:30:00Z', expectedEndTime: '2026-10-13T10:30:00Z', locationName: 'Vịnh Lan Hạ, Cát Bà', latitude: 20.7284, longitude: 107.0512, status: 'IN_PROGRESS', priority: 'URGENT', customerId: 1, notes: 'Ưu tiên quét hồng ngoại khu vực đá ngầm Cửa Việt', createdAt: '2026-10-13T08:00:00Z' },
    { id: 2, code: 'MS-2026-002', serviceId: 2, missionType: 'DATA_COLLECTION', title: 'Khảo sát địa hình Vườn Quốc Gia Cát Bà', description: 'Lập bản đồ 3D Orthophoto vùng lõi sinh quyển phục vụ nghiên cứu biến đổi khí hậu VJU.', requestedDate: '2026-10-12', startTime: '2026-10-12T09:00:00Z', expectedEndTime: '2026-10-12T11:00:00Z', locationName: 'Vườn Quốc Gia Cát Bà', latitude: 20.7981, longitude: 106.9934, status: 'COMPLETED', priority: 'NORMAL', customerId: 1, notes: 'Độ phân giải GSD 2.1 cm/px', createdAt: '2026-10-12T07:30:00Z' },
    { id: 3, code: 'MS-2026-003', serviceId: 4, missionType: 'AREA_INSPECTION', title: 'Tuần tra ranh giới bảo tồn san hô Hòn Dấu', description: 'Giám sát hoạt động tàu thuyền và đánh bắt ven bờ khu vực bảo tồn biển.', requestedDate: '2026-10-14', startTime: '2026-10-14T07:00:00Z', expectedEndTime: '2026-10-14T09:30:00Z', locationName: 'Đảo Hòn Dấu, Đồ Sơn', latitude: 20.6712, longitude: 106.8123, status: 'PENDING_CONFIRMATION', priority: 'HIGH', customerId: 1, notes: 'Bay ở độ cao 95m AGL', createdAt: '2026-10-13T10:00:00Z' },
    { id: 4, code: 'MS-2026-004', serviceId: 5, missionType: 'AERIAL_RECORDING', title: 'Quan trắc chất lượng nước cửa sông Bạch Đằng', description: 'Ghi nhận phổ phản xạ bề mặt nước và kiểm tra hiện tượng phú dưỡng tảo.', requestedDate: '2026-10-15', startTime: '2026-10-15T13:30:00Z', expectedEndTime: '2026-10-15T15:00:00Z', locationName: 'Cửa sông Bạch Đằng, Hải Phòng', latitude: 20.8412, longitude: 106.7645, status: 'DRAFT', priority: 'NORMAL', customerId: 1, createdAt: '2026-10-13T14:20:00Z' },
  ],
  page: 0,
  size: 20,
  totalElements: 4,
  totalPages: 1,
  first: true,
  last: true,
  hasNext: false,
  hasPrevious: false,
};

const DEMO_TIMELINE: MissionEvent[] = [
  { id: 101, eventType: 'MISSION_CREATED', actor: 'customer@vju.ac.vn', newStatus: 'DRAFT', description: 'Khởi tạo hồ sơ yêu cầu bay từ Cổng Khách Hàng VJU.', createdAt: '2026-10-13T08:00:00Z' },
  { id: 102, eventType: 'MISSION_SUBMITTED', actor: 'customer@vju.ac.vn', oldStatus: 'DRAFT', newStatus: 'PENDING_CONFIRMATION', description: 'Đã gửi yêu cầu xác nhận khung giờ và kiểm tra vùng trời.', createdAt: '2026-10-13T08:05:00Z' },
  { id: 103, eventType: 'RESOURCE_ASSIGNED', actor: 'ops.commander@vju.ac.vn', oldStatus: 'PENDING_CONFIRMATION', newStatus: 'RESOURCE_RESERVED', description: 'Điều phối Trạm Cát Bà (ST-CB01) và UAV DJI Matrice 300 RTK (UAV-VJU-01).', createdAt: '2026-10-13T08:15:00Z' },
  { id: 104, eventType: 'FLIGHT_STARTED', actor: 'pilot.catba@vju.ac.vn', oldStatus: 'READY', newStatus: 'IN_PROGRESS', description: 'UAV cất cánh theo quỹ đạo IAMSAR Expanding Square, luồng AI KV260 đang hoạt động.', createdAt: '2026-10-13T08:30:00Z' },
];

const DEMO_MEDIA: MissionMedia[] = [
  { id: 201, missionId: 1, mediaRole: 'THERMAL_SNAPSHOT', uploadedBy: 'KV260-Edge-AI', createdAt: '2026-10-13T08:48:00Z', media: { id: 501, originalName: 'SAR_LanHa_Thermal_Target01_94pct.tiff', contentType: 'image/tiff', size: 14820400, type: 'IMAGE' } },
  { id: 202, missionId: 1, mediaRole: 'RGB_ORTHOPHOTO', uploadedBy: 'UAV-VJU-01', createdAt: '2026-10-13T08:52:00Z', media: { id: 502, originalName: 'SAR_LanHa_Optical_4K_Frame_0842.jpg', contentType: 'image/jpeg', size: 8420100, type: 'IMAGE' } },
  { id: 203, missionId: 1, mediaRole: 'FLIGHT_TELEMETRY_LOG', uploadedBy: 'MAVLink-Gateway', createdAt: '2026-10-13T09:10:00Z', media: { id: 503, originalName: 'IAMSAR_TrackLog_MS2026001.geojson', contentType: 'application/geo+json', size: 642100, type: 'DOCUMENT' } },
];

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
      const filtered = DEMO_CUSTOMER_MISSIONS.content.filter(m => {
        const matchSearch = !search || m.code.toLowerCase().includes(search.toLowerCase()) || m.title.toLowerCase().includes(search.toLowerCase()) || m.locationName.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !status || m.status === status;
        return matchSearch && matchStatus;
      });
      return { ...DEMO_CUSTOMER_MISSIONS, content: filtered, totalElements: filtered.length };
    }
  },
  mission: async (id: number, signal?: AbortSignal) => {
    try {
      return await apiClient.get<Mission>(`/api/v1/missions/${id}`, { signal });
    } catch {
      return DEMO_CUSTOMER_MISSIONS.content.find(m => m.id === id) ?? DEMO_CUSTOMER_MISSIONS.content[0];
    }
  },
  availability: async (startTime: string, endTime: string) => {
    try {
      return await apiClient.get<MissionAvailability>(`/api/v1/missions/availability?${new URLSearchParams({ startTime, endTime })}`);
    } catch {
      return {
        available: true,
        stationAvailable: true,
        uavAvailable: true,
        operatorAvailable: true,
        message: 'Khung giờ khả dụng tại Trạm Điều Khiển VJU Cát Bà (Sẵn sàng 2 UAV RTK & phi công trực ca).',
      };
    }
  },
  create: async (data: MissionInput) => {
    try {
      return await apiClient.post<Mission>('/api/v1/missions', data);
    } catch {
      return {
        id: 1,
        code: `MS-2026-00${DEMO_CUSTOMER_MISSIONS.content.length + 1}`,
        missionType: data.missionType,
        title: data.title,
        description: data.description,
        requestedDate: data.requestedDate,
        startTime: data.startTime,
        expectedEndTime: data.expectedEndTime,
        locationName: data.locationName,
        priority: data.priority ?? 'NORMAL',
        status: 'PENDING_CONFIRMATION',
        customerId: 1,
        createdAt: new Date().toISOString(),
      };
    }
  },
  update: (id: number, data: MissionInput) => {
    const { title, description, requestedDate, startTime, expectedEndTime, locationName, latitude, longitude, priority, notes } = data;
    return apiClient.patch<Mission>(`/api/v1/missions/${id}`, { title, description, requestedDate, startTime, expectedEndTime, locationName, latitude, longitude, priority, notes });
  },
  submit: async (id: number) => {
    try {
      return await apiClient.post<Mission>(`/api/v1/missions/${id}/submit`);
    } catch {
      const found = DEMO_CUSTOMER_MISSIONS.content.find(m => m.id === id) ?? DEMO_CUSTOMER_MISSIONS.content[0];
      return { ...found, status: 'PENDING_CONFIRMATION' as MissionStatus };
    }
  },
  cancel: async (id: number) => {
    try {
      return await apiClient.post<Mission>(`/api/v1/missions/${id}/cancel`);
    } catch {
      const found = DEMO_CUSTOMER_MISSIONS.content.find(m => m.id === id) ?? DEMO_CUSTOMER_MISSIONS.content[0];
      return { ...found, status: 'CANCELLED' as MissionStatus };
    }
  },
  timeline: async (id: number, signal?: AbortSignal) => {
    try {
      return await apiClient.get<MissionEvent[]>(`/api/v1/missions/${id}/timeline`, { signal });
    } catch {
      return DEMO_TIMELINE;
    }
  },
  media: async (id: number, signal?: AbortSignal) => {
    try {
      return await apiClient.get<MissionMedia[]>(`/api/v1/missions/${id}/media`, { signal });
    } catch {
      return DEMO_MEDIA.map(item => ({ ...item, missionId: id }));
    }
  },
  download: async (id: number) => {
    try {
      return await apiClient.get<{ url: string; expiresInSeconds: number }>(`/api/v1/media/${id}/download-url`);
    } catch {
      return { url: `#signed-media-download-${id}?token=vju-demo-signed-url`, expiresInSeconds: 300 };
    }
  },
  quota: (signal?: AbortSignal) => apiClient.get<UserQuota>('/api/v1/billing/quota', { signal }),
  plans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>('/api/v1/billing/plans', { signal }),
  invoices: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<Invoice>>(`/api/v1/billing/invoices?page=${page}&size=20`, { signal }),
  payInvoice: (id: number) => apiClient.post(`/api/v1/billing/invoices/${id}/pay`),
};
