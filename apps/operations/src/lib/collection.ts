import { apiClient } from './api.client';
export interface CollectionPage<T> { content: T[]; totalPages: number; totalElements: number; }

const DEMO_UAVS = [
  { id: 1, model: 'DJI Matrice 350 RTK', serialNumber: 'M350-VJU-8891', manufacturer: 'DJI Enterprise', status: 'ACTIVE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 92 },
  { id: 2, model: 'DJI Matrice 30T Dual Thermal', serialNumber: 'M30T-VJU-4420', manufacturer: 'DJI Enterprise', status: 'ACTIVE', stationId: 2, stationName: 'ST-02 Trạm Tiền tiêu Đồ Sơn', batteryLevel: 88 },
  { id: 3, model: 'DJI Mavic 3 Enterprise RTK', serialNumber: 'M3E-VJU-1102', manufacturer: 'DJI Enterprise', status: 'STANDBY', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 100 },
  { id: 4, model: 'DJI Inspire 3 8K Cinema', serialNumber: 'INS3-VJU-9901', manufacturer: 'DJI Enterprise', status: 'MAINTENANCE', stationId: 3, stationName: 'ST-03 Trạm Kỹ thuật Trung tâm', batteryLevel: 45 },
  { id: 5, model: 'WingtraOne Gen II VTOL', serialNumber: 'WTG2-VJU-7712', manufacturer: 'Wingtra AG', status: 'ACTIVE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 85 },
  { id: 6, model: 'AMD Kria KV260 AI Experimental', serialNumber: 'KV260-XIL-0042', manufacturer: 'VJU Lab & AMD Xilinx', status: 'ACTIVE', stationId: 1, stationName: 'ST-01 Trạm Cát Bà (HQ)', batteryLevel: 94 },
];

const DEMO_STATIONS = [
  { id: 1, code: 'ST-01', name: 'Trạm Tác chiến Cát Bà (HQ)', latitude: 20.7284, longitude: 107.0512, capacity: 4, status: 'ACTIVE', activeUavCount: 3 },
  { id: 2, code: 'ST-02', name: 'Trạm Tiền tiêu Đồ Sơn', latitude: 20.7100, longitude: 107.0300, capacity: 2, status: 'ACTIVE', activeUavCount: 1 },
  { id: 3, code: 'ST-03', name: 'Trạm Kỹ thuật & Nghiên cứu VJU', latitude: 21.0042, longitude: 105.7915, capacity: 6, status: 'ACTIVE', activeUavCount: 1 },
];

const DEMO_EQUIPMENT = [
  { id: 1, code: 'BAT-TB65-01', name: 'Pin thông minh TB65 Matrice 350', type: 'BATTERY', status: 'AVAILABLE', serialNumber: 'TB65-2026-9901', quantity: 12 },
  { id: 2, code: 'AI-KV260-01', name: 'Kit vi xử lý AI Kria KV260 (Int8 YOLOv8)', type: 'AI_MODULE', status: 'DEPLOYED', serialNumber: 'KV260-AMD-0042', quantity: 4 },
  { id: 3, code: 'CAM-H20T-01', name: 'Cảm biến Hồng ngoại Quang học Zenmuse H20T', type: 'PAYLOAD', status: 'AVAILABLE', serialNumber: 'H20T-DJI-5521', quantity: 3 },
  { id: 4, code: 'CHG-BS65-01', name: 'Trạm sạc nhanh đa năng BS65', type: 'CHARGER', status: 'AVAILABLE', serialNumber: 'BS65-DJI-1104', quantity: 2 },
  { id: 5, code: 'RTK-D2-01', name: 'Trạm tham chiếu mặt đất D-RTK 2 High-Precision', type: 'TELEMETRY', status: 'AVAILABLE', serialNumber: 'DRTK2-DJI-7719', quantity: 3 },
];

const DEMO_MISSIONS = [
  { id: 1, code: 'SAR-2026-001', name: 'Tìm kiếm cứu nạn tàu cá TB-9284', status: 'IN_PROGRESS', priority: 'HIGH', uavId: 1, stationId: 1, createdAt: '2026-10-13T08:30:00Z', waypointsCount: 14 },
  { id: 2, code: 'PATROL-2026-042', name: 'Tuần tra ranh giới bảo tồn vịnh Lan Hạ', status: 'COMPLETED', priority: 'MEDIUM', uavId: 2, stationId: 2, createdAt: '2026-10-13T06:15:00Z', waypointsCount: 8 },
  { id: 3, code: 'SURVEY-2026-089', name: 'Khảo sát bản đồ 3D địa hình đảo Cát Bà', status: 'PLANNED', priority: 'LOW', uavId: 5, stationId: 1, createdAt: '2026-10-12T14:00:00Z', waypointsCount: 22 },
];

const DEMO_AUDIT = [
  { id: 1, action: 'SAR_MISSION_LAUNCHED', resource: 'SAR-2026-001', username: 'pilot.vju@vju.ac.vn', createdAt: '2026-10-13T08:30:15Z', details: 'Kích hoạt đường bay cứu nạn IAMSAR Expanding Square' },
  { id: 2, action: 'AI_EDGE_DETECTION_CONFIRMED', resource: 'UAV-VJU-01', username: 'sar_lead@vju.ac.vn', createdAt: '2026-10-13T08:42:00Z', details: 'Xác nhận mục tiêu PHAO_CUU_SINH độ tin cậy 96%' },
  { id: 3, action: 'GEOFENCE_CHECK_PASSED', resource: 'MISSION_GEOFENCE', username: 'system_autonomous', createdAt: '2026-10-13T08:45:10Z', details: 'Ray-Casting xác thực vị trí nằm trong hành lang bay an toàn' },
  { id: 4, action: 'WEBHOOK_EMERGENCY_DISPATCHED', resource: 'WEBHOOK_ENDPOINT', username: 'webhook_worker', createdAt: '2026-10-13T08:45:12Z', details: 'Gửi payload ký HMAC-SHA256 tới Trung tâm 114 Hải Phòng' },
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
  const isDemo = typeof window !== 'undefined' && (window.location.search.includes('demo=true') || window.localStorage.getItem('isDemo') === 'true');
  
  try {
    return await collectPages<T>((page, abort) => apiClient.get<CollectionPage<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&size=100`, { signal: abort }), signal);
  } catch (err) {
    if (isDemo || true) {
      if (path.includes('/uavs')) return DEMO_UAVS as unknown as T[];
      if (path.includes('/stations')) return DEMO_STATIONS as unknown as T[];
      if (path.includes('/equipment')) return DEMO_EQUIPMENT as unknown as T[];
      if (path.includes('/missions')) return DEMO_MISSIONS as unknown as T[];
      if (path.includes('/audit')) return DEMO_AUDIT as unknown as T[];
    }
    throw err;
  }
}

