import { apiClient } from './api.client';
export interface CollectionPage<T> { content: T[]; totalPages: number; totalElements: number; }

export const DEMO_UAVS = [
  { id: 1, model: 'DJI Matrice 350 RTK', serialNumber: 'M350-VJU-8891', manufacturer: 'DJI Enterprise', status: 'IN_USE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 92 },
  { id: 2, model: 'DJI Matrice 30T Dual Thermal', serialNumber: 'M30T-VJU-4420', manufacturer: 'DJI Enterprise', status: 'AVAILABLE', stationId: 2, stationName: 'ST-02 Trạm Tiền tiêu Đồ Sơn', batteryLevel: 88 },
  { id: 3, model: 'DJI Mavic 3 Enterprise RTK', serialNumber: 'M3E-VJU-1102', manufacturer: 'DJI Enterprise', status: 'AVAILABLE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 100 },
  { id: 4, model: 'DJI Inspire 3 8K Cinema', serialNumber: 'INS3-VJU-9901', manufacturer: 'DJI Enterprise', status: 'MAINTENANCE', stationId: 3, stationName: 'ST-03 Trạm Kỹ thuật Trung tâm', batteryLevel: 45 },
  { id: 5, model: 'WingtraOne Gen II VTOL', serialNumber: 'WTG2-VJU-7712', manufacturer: 'Wingtra AG', status: 'AVAILABLE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 85 },
  { id: 6, model: 'AMD Kria KV260 AI Experimental', serialNumber: 'KV260-XIL-0042', manufacturer: 'VJU Lab & AMD Xilinx', status: 'IN_USE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 94 },
];

export const DEMO_STATIONS = [
  { id: 1, code: 'ST-01', name: 'Trạm Tác chiến Cát Bà (HQ)', address: 'Bến Bèo, Thị trấn Cát Bà, Hải Phòng', latitude: 20.7284, longitude: 107.0512, capacity: 4, status: 'ACTIVE', activeUavCount: 3 },
  { id: 2, code: 'ST-02', name: 'Trạm Tiền tiêu Đồ Sơn', address: 'Khu II, Quận Đồ Sơn, Hải Phòng', latitude: 20.7100, longitude: 107.0300, capacity: 2, status: 'ACTIVE', activeUavCount: 1 },
  { id: 3, code: 'ST-03', name: 'Trạm Kỹ thuật & Nghiên cứu VJU', address: 'Khu Công nghệ cao Hòa Lạc, Hà Nội', latitude: 21.0042, longitude: 105.7915, capacity: 6, status: 'ACTIVE', activeUavCount: 1 },
];

export const DEMO_EQUIPMENT = [
  { id: 1, code: 'BAT-TB65-01', name: 'Pin thông minh TB65 Matrice 350', type: 'BATTERY', status: 'AVAILABLE', serialNumber: 'TB65-2026-9901', quantity: 12, availableQuantity: 9, reservedQuantity: 3, stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)' },
  { id: 2, code: 'AI-KV260-01', name: 'Kit vi xử lý AI Kria KV260 (Int8 YOLOv8)', type: 'AI_MODULE', status: 'DEPLOYED', serialNumber: 'KV260-AMD-0042', quantity: 4, availableQuantity: 2, reservedQuantity: 2, stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)' },
  { id: 3, code: 'CAM-H20T-01', name: 'Cảm biến Hồng ngoại Quang học Zenmuse H20T', type: 'PAYLOAD', status: 'AVAILABLE', serialNumber: 'H20T-DJI-5521', quantity: 3, availableQuantity: 2, reservedQuantity: 1, stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)' },
  { id: 4, code: 'CHG-BS65-01', name: 'Trạm sạc nhanh đa năng BS65', type: 'CHARGER', status: 'AVAILABLE', serialNumber: 'BS65-DJI-1104', quantity: 2, availableQuantity: 2, reservedQuantity: 0, stationId: 2, stationName: 'ST-02 Trạm Tiền tiêu Đồ Sơn' },
  { id: 5, code: 'RTK-D2-01', name: 'Trạm tham chiếu mặt đất D-RTK 2 High-Precision', type: 'TELEMETRY', status: 'AVAILABLE', serialNumber: 'DRTK2-DJI-7719', quantity: 3, availableQuantity: 2, reservedQuantity: 1, stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)' },
];

export const DEMO_MOVEMENTS = [
  { id: 1, equipmentId: 1, equipmentName: 'Pin thông minh TB65 Matrice 350', type: 'RESERVE', quantity: 2, fromStationId: 1, actor: 'ops.commander@vju.ac.vn', note: 'Cấp phát cho ca bay SAR-2026-004', createdAt: '2026-10-13T08:10:00Z' },
  { id: 2, equipmentId: 2, equipmentName: 'Kit vi xử lý AI Kria KV260 (Int8 YOLOv8)', type: 'RESERVE', quantity: 1, fromStationId: 1, actor: 'pilot.catba@vju.ac.vn', note: 'Gắn payload AI lên M350-VJU-8891', createdAt: '2026-10-13T08:15:00Z' },
  { id: 3, equipmentId: 1, equipmentName: 'Pin thông minh TB65 Matrice 350', type: 'STOCK_IN', quantity: 4, toStationId: 1, actor: 'tech.lead@vju.ac.vn', note: 'Nhập bổ sung lô pin mới từ kho Hòa Lạc', createdAt: '2026-10-12T16:30:00Z' },
];

export const DEMO_MEDIA = [
  { id: 501, originalName: 'SAR_LanHa_Thermal_Target01_94pct.tiff', objectKey: 'sar/2026/10/target01_thermal.tiff', contentType: 'image/tiff', size: 14820400, type: 'IMAGE', uploadedBy: 'KV260-Edge-AI', storageProvider: 'MINIO_S3', confirmed: true, confirmedAt: '2026-10-13T08:48:10Z', createdAt: '2026-10-13T08:48:00Z' },
  { id: 502, originalName: 'SAR_LanHa_Optical_4K_Frame_0842.jpg', objectKey: 'sar/2026/10/frame_0842.jpg', contentType: 'image/jpeg', size: 8420100, type: 'IMAGE', uploadedBy: 'M350-VJU-8891', storageProvider: 'MINIO_S3', confirmed: true, confirmedAt: '2026-10-13T08:52:05Z', createdAt: '2026-10-13T08:52:00Z' },
  { id: 503, originalName: 'CatBa_Biosphere_Orthophoto_DSM.tif', objectKey: 'survey/2026/10/catba_dsm.tif', contentType: 'image/tiff', size: 64210800, type: 'IMAGE', uploadedBy: 'WTG2-VJU-7712', storageProvider: 'MINIO_S3', confirmed: true, confirmedAt: '2026-10-12T11:20:00Z', createdAt: '2026-10-12T11:18:00Z' },
  { id: 504, originalName: 'IAMSAR_FlightPath_Log_SAR2026004.geojson', objectKey: 'telemetry/2026/10/sar004.geojson', contentType: 'application/geo+json', size: 512400, type: 'DOCUMENT', uploadedBy: 'MAVLink-Gateway', storageProvider: 'MINIO_S3', confirmed: true, confirmedAt: '2026-10-13T09:05:00Z', createdAt: '2026-10-13T09:04:55Z' },
];

export const DEMO_MISSIONS = [
  { id: 1, code: 'SAR-2026-004', title: 'Tìm kiếm cứu nạn tàu cá TB-9284', name: 'Tìm kiếm cứu nạn tàu cá TB-9284', missionType: 'AREA_INSPECTION', requestedDate: '2026-10-13', startTime: '2026-10-13T08:30:00Z', expectedEndTime: '2026-10-13T10:30:00Z', locationName: 'Vịnh Lan Hạ, Cát Bà', latitude: 20.7284, longitude: 107.0512, status: 'IN_PROGRESS', priority: 'URGENT', uavId: 1, stationId: 1, operatorId: 2, operatorAccepted: true, createdAt: '2026-10-13T08:30:00Z', waypointsCount: 14 },
  { id: 2, code: 'PATROL-2026-042', title: 'Tuần tra ranh giới bảo tồn vịnh Lan Hạ', name: 'Tuần tra ranh giới bảo tồn vịnh Lan Hạ', missionType: 'AREA_INSPECTION', requestedDate: '2026-10-13', startTime: '2026-10-13T06:15:00Z', expectedEndTime: '2026-10-13T08:00:00Z', locationName: 'Đảo Hòn Dấu, Đồ Sơn', latitude: 20.6712, longitude: 106.8123, status: 'COMPLETED', priority: 'HIGH', uavId: 2, stationId: 2, operatorId: 2, operatorAccepted: true, createdAt: '2026-10-13T06:15:00Z', waypointsCount: 8 },
  { id: 3, code: 'SURVEY-2026-089', title: 'Khảo sát bản đồ 3D địa hình đảo Cát Bà', name: 'Khảo sát bản đồ 3D địa hình đảo Cát Bà', missionType: 'DATA_COLLECTION', requestedDate: '2026-10-14', startTime: '2026-10-14T09:00:00Z', expectedEndTime: '2026-10-14T11:30:00Z', locationName: 'Vườn Quốc Gia Cát Bà', latitude: 20.7981, longitude: 106.9934, status: 'PENDING_CONFIRMATION', priority: 'NORMAL', uavId: 5, stationId: 1, operatorId: 2, createdAt: '2026-10-12T14:00:00Z', waypointsCount: 22 },
];

export const DEMO_AUDIT = [
  { id: 1, actorUsername: 'pilot.vju@vju.ac.vn', action: 'SAR_MISSION_LAUNCHED', entityType: 'MISSION', entityId: 'SAR-2026-004', createdAt: '2026-10-13T08:30:15Z', details: 'Kích hoạt đường bay cứu nạn IAMSAR Expanding Square' },
  { id: 2, actorUsername: 'sar_lead@vju.ac.vn', action: 'AI_EDGE_DETECTION_CONFIRMED', entityType: 'UAV_DETECTION', entityId: 'TRK-101', createdAt: '2026-10-13T08:42:00Z', details: 'Xác nhận mục tiêu Nạn nhân #1 & Phao cứu sinh độ tin cậy 94%' },
  { id: 3, actorUsername: 'system_autonomous', action: 'GEOFENCE_CHECK_PASSED', entityType: 'MISSION_GEOFENCE', entityId: 'ST-01-ZONE', createdAt: '2026-10-13T08:45:10Z', details: 'Ray-Casting xác thực vị trí nằm trong hành lang bay an toàn' },
  { id: 4, actorUsername: 'webhook_worker', action: 'WEBHOOK_EMERGENCY_DISPATCHED', entityType: 'WEBHOOK_ENDPOINT', entityId: 'RESCUE-114', createdAt: '2026-10-13T08:45:12Z', details: 'Gửi payload ký HMAC-SHA256 tới Đội Cứu nạn Mặt đất Cát Bà' },
];

const MAX_PAGES_TO_COLLECT = 8;

/** Read pages concurrently in parallel chunks so client-side filters never block on sequential network roundtrips. */
export async function collectPages<T extends { id: number }>(read: (page: number, signal?: AbortSignal) => Promise<CollectionPage<T>>, signal?: AbortSignal): Promise<T[]> {
  const first = await read(0, signal);
  const rows = [...first.content];
  if (first.totalPages <= 1) {
    return rows;
  }

  const pagesToFetch = Math.min(first.totalPages, MAX_PAGES_TO_COLLECT);
  const remainingPageIndices: number[] = [];
  for (let p = 1; p < pagesToFetch; p++) {
    remainingPageIndices.push(p);
  }

  // Fetch in parallel chunks of 4 to maximize throughput without exceeding browser socket limit
  const CHUNK_SIZE = 4;
  for (let i = 0; i < remainingPageIndices.length; i += CHUNK_SIZE) {
    signal?.throwIfAborted();
    const chunk = remainingPageIndices.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(p => read(p, signal)));
    for (const res of chunkResults) {
      rows.push(...res.content);
    }
  }

  return [...new Map(rows.map(row => [row.id, row])).values()];
}

export async function fetchCollection<T extends { id: number }>(path: string, signal?: AbortSignal): Promise<T[]> {
  try {
    return await collectPages<T>((page, abort) => apiClient.get<CollectionPage<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, { signal: abort }), signal);
  } catch {
    if (path.includes('/equipment/history')) return DEMO_MOVEMENTS as unknown as T[];
    if (path.includes('/uavs')) return DEMO_UAVS as unknown as T[];
    if (path.includes('/stations')) return DEMO_STATIONS as unknown as T[];
    if (path.includes('/equipment')) return DEMO_EQUIPMENT as unknown as T[];
    if (path.includes('/media')) return DEMO_MEDIA as unknown as T[];
    if (path.includes('/missions')) return DEMO_MISSIONS as unknown as T[];
    if (path.includes('/audit')) return DEMO_AUDIT as unknown as T[];
    return [];
  }
}
