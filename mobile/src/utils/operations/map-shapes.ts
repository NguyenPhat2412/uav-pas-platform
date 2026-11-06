export interface MapCoordinate {
    latitude: number;
    longitude: number;
}

export function isFinitePoint(lat: unknown, lng: unknown): boolean {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
    );
}

export const isFiniteCoord = isFinitePoint;

function validLatLng(latitude: number, longitude: number): boolean {
    return isFinitePoint(latitude, longitude);
}

function parseGeoJsonRing(ring: unknown): MapCoordinate[] {
    if (!Array.isArray(ring)) return [];
    const points: MapCoordinate[] = [];
    for (const item of ring) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const lng = Number(item[0]);
        const lat = Number(item[1]);
        if (validLatLng(lat, lng)) {
            points.push({latitude: lat, longitude: lng});
        } else if (validLatLng(lng, lat)) {
            points.push({latitude: lng, longitude: lat});
        }
    }
    // Drop a closing duplicate GeoJSON vertex when >= 4 points repeat the start point.
    if (
        points.length >= 4 &&
        points[0].latitude === points[points.length - 1].latitude &&
        points[0].longitude === points[points.length - 1].longitude
    ) {
        points.pop();
    }
    return points.length >= 3 ? points : [];
}

/** Converts `[lat, lng]` vertex arrays (FlightPlan.vertices / AirspaceZone.vertices) to MapView coordinates. */
export function verticesToMapCoordinates(
    vertices?: readonly (readonly number[])[] | number[][] | null,
): MapCoordinate[] {
    if (!vertices?.length) return [];
    const points: MapCoordinate[] = [];
    for (const pair of vertices) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const first = Number(pair[0]);
        const second = Number(pair[1]);
        if (validLatLng(first, second)) {
            points.push({latitude: first, longitude: second});
        } else if (validLatLng(second, first)) {
            points.push({latitude: second, longitude: first});
        }
    }
    return points.length >= 3 ? points : [];
}

/**
 * Safely parses a GeoJSON Polygon (`{"type":"Polygon","coordinates":[[[lng,lat],...]]}`), a Feature wrapping a Polygon,
 * a 3D GeoJSON ring `[[[lng,lat],...]]`, a 2D `[[lat,lng],...]` array (SAR `searchAreaPolygon`), or `{lat,lng}` objects.
 * Never throws on malformed input; returns `[]` when fewer than 3 valid vertices exist.
 */
export function parseGeoJsonPolygonCoordinates(geojson: string | null | undefined): MapCoordinate[] {
    if (!geojson || !geojson.trim()) return [];
    try {
        const parsed: unknown = JSON.parse(geojson);
        if (!parsed || typeof parsed !== 'object') return [];

        if (!Array.isArray(parsed)) {
            const record = parsed as Record<string, unknown>;
            if (record.type === 'Feature' && record.geometry && typeof record.geometry === 'object') {
                const geometry = record.geometry as Record<string, unknown>;
                if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
                    return parseGeoJsonRing(geometry.coordinates[0]);
                }
            }
            if (record.type === 'Polygon' && Array.isArray(record.coordinates)) {
                return parseGeoJsonRing(record.coordinates[0]);
            }
            if (record.type === 'MultiPolygon' && Array.isArray(record.coordinates) && Array.isArray(record.coordinates[0])) {
                return parseGeoJsonRing((record.coordinates[0] as unknown[])[0]);
            }
            return [];
        }

        if (parsed.length === 0) return [];
        const first = parsed[0];

        // 3D ring array: [[[lng, lat], ...]]
        if (Array.isArray(first) && Array.isArray(first[0])) {
            return parseGeoJsonRing(first);
        }

        // 2D array: [[lat, lng], ...]
        if (Array.isArray(first)) {
            return verticesToMapCoordinates(parsed as number[][]);
        }

        // Array of {lat, lng} or {latitude, longitude}
        if (first && typeof first === 'object') {
            const points: MapCoordinate[] = [];
            for (const entry of parsed) {
                if (!entry || typeof entry !== 'object') continue;
                const obj = entry as Record<string, unknown>;
                const lat = Number(obj.latitude ?? obj.lat);
                const lng = Number(obj.longitude ?? obj.lng);
                if (validLatLng(lat, lng)) points.push({latitude: lat, longitude: lng});
            }
            return points.length >= 3 ? points : [];
        }

        return [];
    } catch {
        return [];
    }
}
