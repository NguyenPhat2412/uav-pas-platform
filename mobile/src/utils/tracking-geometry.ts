export interface LatLng {
    latitude: number;
    longitude: number;
}

export interface FitRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

function validCoord(lat: unknown, lng: unknown): boolean {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

/**
 * Normalizes backend `[lat, lng]` coordinate tuples or `{latitude, longitude}` objects
 * from `GET /api/v1/orders/{id}/tracking` into `react-native-maps` coordinates.
 */
export function toLatLngList(pairs?: unknown[] | null): LatLng[] {
    if (!Array.isArray(pairs)) return [];
    const out: LatLng[] = [];
    for (const item of pairs) {
        if (Array.isArray(item) && item.length >= 2 && validCoord(item[0], item[1])) {
            out.push({latitude: item[0], longitude: item[1]});
        } else if (item && typeof item === 'object') {
            const rec = item as { latitude?: unknown; longitude?: unknown; lat?: unknown; lng?: unknown };
            const lat = typeof rec.latitude === 'number' ? rec.latitude : rec.lat;
            const lng = typeof rec.longitude === 'number' ? rec.longitude : rec.lng;
            if (validCoord(lat, lng)) {
                out.push({latitude: lat as number, longitude: lng as number});
            }
        }
    }
    return out;
}

export function computeFitRegion(points: LatLng[], fallbackLat: number, fallbackLng: number): FitRegion {
    if (points.length === 0) {
        return {
            latitude: fallbackLat,
            longitude: fallbackLng,
            latitudeDelta: 0.006,
            longitudeDelta: 0.006,
        };
    }
    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;
    for (const pt of points) {
        if (pt.latitude < minLat) minLat = pt.latitude;
        if (pt.latitude > maxLat) maxLat = pt.latitude;
        if (pt.longitude < minLng) minLng = pt.longitude;
        if (pt.longitude > maxLng) maxLng = pt.longitude;
    }
    const spanLat = maxLat - minLat;
    const spanLng = maxLng - minLng;
    const distinct = spanLat > 0.00005 || spanLng > 0.00005;
    return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: distinct ? Math.max(0.0022, spanLat * 1.55) : 0.005,
        longitudeDelta: distinct ? Math.max(0.0022, spanLng * 1.55) : 0.005,
    };
}
