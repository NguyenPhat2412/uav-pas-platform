export type FlightAreaType = 'POINT' | 'POLYGON' | 'CIRCLE';
export type FlightSensor = 'RGB_4K' | 'THERMAL' | 'LIDAR' | 'MULTISPECTRAL';

export const flightAltitudes = [30, 50, 80, 100, 120] as const;
export const flightGsdOptions = [1.5, 3.0, 5.0] as const;
export const flightSensors: FlightSensor[] = ['RGB_4K', 'THERMAL', 'LIDAR', 'MULTISPECTRAL'];
export const radiusLimits = {min: 100, max: 2000} as const;

/** Sent with a mission. vertices are [lat, lng]; a CIRCLE has exactly one vertex, its centre. */
export interface FlightPlanInput {
    areaType: FlightAreaType;
    vertices: [number, number][];
    radiusMeters?: number;
    takeoffLatitude?: number;
    takeoffLongitude?: number;
    altitudeAglMeters: number;
    targetGsdCm: number;
    forwardOverlap: number;
    sideOverlap: number;
    sensors: FlightSensor[];
    obstacles?: string;
    permitSupport: boolean;
}

/** As stored: the server recomputes centre, area (m²) and perimeter (m). */
export interface FlightPlan extends FlightPlanInput {
    centerLatitude: number;
    centerLongitude: number;
    areaSquareMeters: number | null;
    perimeterMeters: number | null;
}

export const defaultFlightPlan = (): FlightPlanInput => ({
    areaType: 'POINT', vertices: [], altitudeAglMeters: 80, targetGsdCm: 3.0,
    forwardOverlap: 80, sideOverlap: 70, sensors: ['RGB_4K'], permitSupport: false,
});
