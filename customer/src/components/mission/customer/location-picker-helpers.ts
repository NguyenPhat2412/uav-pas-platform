import type {LayerGroup} from 'leaflet';
import type {FlightPlanInput} from '@/types/mission/flight-plan.types';
import type {PlannerTool} from '@/types/mission/mission.types';

export const roundCoord = (value: number): number => Math.round(value * 1e6) / 1e6;

export function parseCoordinate(raw: string, limit: number): number | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= -limit && value <= limit ? roundCoord(value) : null;
}

export function parsePastedCoordinatePair(pasted: string): [number, number] | null {
    const match = pasted.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return null;
    const lat = parseCoordinate(match[1], 90);
    const lng = parseCoordinate(match[2], 180);
    return lat != null && lng != null ? [lat, lng] : null;
}

export function nextPlanFromMapClick(
    current: FlightPlanInput,
    tool: PlannerTool,
    point: [number, number],
): FlightPlanInput {
    if (tool === 'takeoff') {
        return {...current, takeoffLatitude: point[0], takeoffLongitude: point[1]};
    }
    if (tool === 'POLYGON') {
        return {
            ...current,
            areaType: 'POLYGON',
            radiusMeters: undefined,
            ...(current.takeoffLatitude == null || current.takeoffLongitude == null
                ? {takeoffLatitude: point[0], takeoffLongitude: point[1]}
                : {}),
            vertices: [...(current.areaType === 'POLYGON' ? current.vertices : []), point],
        };
    }
    return {
        ...current,
        areaType: 'CIRCLE',
        takeoffLatitude: point[0],
        takeoffLongitude: point[1],
        vertices: [point],
        radiusMeters: current.radiusMeters ?? 300,
    };
}

export function renderFlightPlanOverlay(
    L: typeof import('leaflet'),
    group: LayerGroup,
    current: FlightPlanInput,
): void {
    group.clearLayers();
    const areaStyle = {color: '#c43a4a', weight: 2, fillColor: '#c43a4a', fillOpacity: 0.15};
    if (current.areaType === 'POLYGON' && current.vertices.length) {
        if (current.vertices.length >= 3) L.polygon(current.vertices, areaStyle).addTo(group);
        else L.polyline(current.vertices, {color: '#c43a4a', weight: 2, dashArray: '6 4'}).addTo(group);
        current.vertices.forEach(vertex =>
            L.circleMarker(vertex, {radius: 4, color: '#fff', weight: 2, fillColor: '#c43a4a', fillOpacity: 1}).addTo(group),
        );
    }
    if (current.areaType === 'CIRCLE' && current.vertices.length === 1 && current.radiusMeters) {
        L.circle(current.vertices[0], {...areaStyle, radius: current.radiusMeters}).addTo(group);
    }
    if (current.takeoffLatitude != null && current.takeoffLongitude != null) {
        L.marker([current.takeoffLatitude, current.takeoffLongitude], {
            keyboard: false,
            icon: L.divIcon({
                className: '',
                iconSize: [26, 26],
                iconAnchor: [13, 13],
                html: '<span style="display:flex;width:26px;height:26px;align-items:center;justify-content:center;background:#475569;color:#fff;font:700 11px system-ui;border:2px solid #fff;box-shadow:0 1px 4px rgb(0 0 0/.4)">H</span>',
            }),
        }).addTo(group);
    }
}
