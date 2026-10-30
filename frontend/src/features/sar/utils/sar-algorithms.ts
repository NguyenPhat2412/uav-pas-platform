/**
 * UAV PAS - SAR & Autonomous Flight Navigation Algorithms
 * Bộ thuật toán toán học & hình học giải tích cho hệ thống Tác chiến Tìm kiếm Cứu nạn (SAR)
 * Áp dụng theo tiêu chuẩn hướng dẫn IAMSAR (International Aeronautical and Maritime Search and Rescue)
 */

import type {
    GeofenceViolationResult,
    LatLng,
    RthCalculation,
    Waypoint,
} from '@/features/sar/types/sar.types';

export type {GeofenceViolationResult, LatLng, RthCalculation, Waypoint};

const EARTH_RADIUS_METERS = 6371000; // WGS-84 mean radius

/**
 * 1. THUẬT TOÁN HAVERSINE: Tính khoảng cách cung lớn giữa 2 tọa độ GPS
 */
export function calculateHaversineDistance(p1: LatLng, p2: LatLng): number {
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_METERS * c;
}

/**
 * Tính tọa độ điểm mới khi tịnh tiến từ điểm gốc theo góc phương vị (bearing) và khoảng cách
 */
export function movePointByDistanceAndBearing(
    origin: LatLng,
    distanceMeters: number,
    bearingDeg: number
): LatLng {
    const distRatio = distanceMeters / EARTH_RADIUS_METERS;
    const bearingRad = (bearingDeg * Math.PI) / 180;
    const lat1Rad = (origin.lat * Math.PI) / 180;
    const lng1Rad = (origin.lng * Math.PI) / 180;

    const lat2Rad = Math.asin(
        Math.sin(lat1Rad) * Math.cos(distRatio) +
        Math.cos(lat1Rad) * Math.sin(distRatio) * Math.cos(bearingRad)
    );

    const lng2Rad =
        lng1Rad +
        Math.atan2(
            Math.sin(bearingRad) * Math.sin(distRatio) * Math.cos(lat1Rad),
            Math.cos(distRatio) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
        );

    return {
        lat: (lat2Rad * 180) / Math.PI,
        lng: (lng2Rad * 180) / Math.PI,
    };
}

/**
 * 2. THUẬT TOÁN EXPANDING SQUARE SEARCH (Quét ô vuông mở rộng từ vị trí cuối cùng nhìn thấy - LKP)
 * Chuẩn IAMSAR Volume III: Sử dụng khi vị trí mục tiêu có độ bất định vừa phải, tâm điểm là LKP.
 * Mỗi bước đi dài hơn bước trước, tạo thành hình xoắn ốc chữ nhật 90 độ.
 */
export function generateExpandingSquarePattern(
    lkp: LatLng,
    stepMeters = 50,
    iterations = 12,
    cruiseAltMeters = 60,
    cruiseSpeedMps = 12
): Waypoint[] {
    const waypoints: Waypoint[] = [];
    let currentPos = {...lkp};
    let currentBearing = 0; // Bắt đầu bay hướng Bắc (0 độ)

    waypoints.push({
        id: 'WP-00-LKP',
        order: 0,
        lat: currentPos.lat,
        lng: currentPos.lng,
        altMeters: cruiseAltMeters,
        speedMps: cruiseSpeedMps,
        legDistanceMeters: 0,
    });

    for (let i = 1; i <= iterations; i++) {
        // Chiều dài chân bay tăng dần: 1*S, 1*S, 2*S, 2*S, 3*S, 3*S, ...
        const legLength = Math.ceil(i / 2) * stepMeters;
        currentPos = movePointByDistanceAndBearing(currentPos, legLength, currentBearing);

        waypoints.push({
            id: `WP-${i.toString().padStart(2, '0')}`,
            order: i,
            lat: currentPos.lat,
            lng: currentPos.lng,
            altMeters: cruiseAltMeters,
            speedMps: cruiseSpeedMps,
            legDistanceMeters: legLength,
        });

        // Rẽ phải 90 độ (sang Đông, Nam, Tây, Bắc,...)
        currentBearing = (currentBearing + 90) % 360;
    }

    return waypoints;
}

/**
 * 3. THUẬT TOÁN RAY-CASTING (Kiểm tra Điểm Nằm Trong Đa Giác - Point-In-Polygon cho Geofence)
 * Bắn một tia ngang từ điểm khảo sát sang vô cực, đếm số lần giao cắt với các cạnh đa giác.
 * Số lần lẻ = Bên trong vùng an toàn; Số lần chẵn = Ngoài vùng an toàn (Vi phạm Geofence).
 */
export function isPointInsideGeofence(point: LatLng, polygon: LatLng[]): boolean {
    if (polygon.length < 3) return false;

    let inside = false;
    const x = point.lng;
    const y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

/**
 * 4. THUẬT TOÁN DỰ BÁO TIÊU HAO NĂNG LƯỢNG & RTH AN TOÀN (Battery Return-to-Home Predictor)
 * Tính toán xem UAV còn đủ pin để bay trở về trạm xuất phát (Home Station) hay không.
 */
export function calculateRthFeasibility(
    currentPos: LatLng,
    homeStation: LatLng,
    currentBatteryPercent: number,
    cruiseSpeedMps = 14,
    nominalDischargePercentPerMinute = 2.2, // Tỷ lệ xả pin trung bình của tải payload/camera
    safetyReservePercent = 15 // Ngưỡng dự phòng an toàn khẩn cấp
): RthCalculation {
    const distanceHomeMeters = calculateHaversineDistance(currentPos, homeStation);
    const flightTimeSeconds = distanceHomeMeters / Math.max(cruiseSpeedMps, 1);
    const flightTimeMinutes = flightTimeSeconds / 60;

    // Pin cần để bay về: thời gian bay * tốc độ xả + biên độ gió ngược (hệ số 1.25)
    const batteryRequired = flightTimeMinutes * nominalDischargePercentPerMinute * 1.25 + safetyReservePercent;

    let recommendedAction: RthCalculation['recommendedAction'] = 'CONTINUE_MISSION';
    if (currentBatteryPercent <= batteryRequired) {
        recommendedAction = 'CRITICAL_IMMEDIATE_RTH';
    } else if (currentBatteryPercent <= batteryRequired + 10) {
        recommendedAction = 'WARNING_PREPARE_RTH';
    }

    return {
        distanceHomeMeters: Math.round(distanceHomeMeters),
        flightTimeRequiredSeconds: Math.round(flightTimeSeconds),
        batteryRequiredPercent: Math.min(100, Math.round(batteryRequired * 10) / 10),
        isSafeToContinue: currentBatteryPercent > batteryRequired,
        recommendedAction,
    };
}
