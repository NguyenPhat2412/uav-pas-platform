import type {FlightPlanInput} from '@/types/mission/flight-plan.types';
import type {FlightGeometry} from '@/types/mission/mission.types';

export type {FlightGeometry};

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => deg * Math.PI / 180;

/**
 * Same local equirectangular approximation the backend uses, so the planner shows the figures that will be saved.
 * Accurate to well under 1% for survey areas a few kilometres across.
 */
export function flightGeometry(plan: FlightPlanInput): FlightGeometry {
    if (plan.areaType === 'CIRCLE' && plan.vertices.length === 1 && plan.radiusMeters) {
        const r = plan.radiusMeters;
        return {center: plan.vertices[0], areaSquareMeters: Math.PI * r * r, perimeterMeters: 2 * Math.PI * r};
    }
    if (plan.areaType === 'POLYGON' && plan.vertices.length >= 3) {
        const lat0 = plan.vertices.reduce((s, p) => s + p[0], 0) / plan.vertices.length;
        const lng0 = plan.vertices.reduce((s, p) => s + p[1], 0) / plan.vertices.length;
        const cos = Math.cos(rad(lat0));
        const xy = plan.vertices.map(([lat, lng]) => [rad(lng - lng0) * EARTH_RADIUS_M * cos, rad(lat - lat0) * EARTH_RADIUS_M]);
        let area = 0, perimeter = 0;
        for (let i = 0; i < xy.length; i++) {
            const a = xy[i], b = xy[(i + 1) % xy.length];
            area += a[0] * b[1] - b[0] * a[1];
            perimeter += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        return {center: [lat0, lng0], areaSquareMeters: Math.abs(area / 2), perimeterMeters: perimeter};
    }
    const takeoff = plan.takeoffLatitude != null && plan.takeoffLongitude != null ? [plan.takeoffLatitude, plan.takeoffLongitude] as [number, number] : null;
    return {center: plan.areaType === 'POLYGON' && plan.vertices.length ? plan.vertices[0] : takeoff, areaSquareMeters: null, perimeterMeters: null};
}

export {flightPlanComplete} from '@/forms/mission/mission-form';
