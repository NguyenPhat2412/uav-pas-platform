/** [latitude, longitude] in decimal degrees, as the backend sends and receives points. */
export type LatLng = [number, number];

export type SimFlightMode = 'TAKEOFF' | 'MISSION' | 'HOLD' | 'RETURN_TO_HOME' | 'LANDING' | 'LANDED';
export type SimCommand = 'PAUSE' | 'RESUME' | 'RETURN_TO_HOME' | 'LAND';
export type SimEventLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SimulationState {
    uavId: number;
    uavCode: string;
    missionId: number | null;
    mode: SimFlightMode;
    finished: boolean;
    startedAt: string;
    elapsedSeconds: number;
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    groundSpeedMs: number;
    headingDeg: number;
    batteryPct: number;
    nextWaypoint: number;
    waypointCount: number;
    distanceFlownMeters: number;
    distanceToHomeMeters: number;
    home: LatLng;
    waypoints: LatLng[];
    track: LatLng[];
    settings: {
        altitudeMeters: number;
        cruiseSpeedMs: number;
        packetLossPct: number;
        latencyMs: number;
        jitterMs: number;
        geofenceRadiusMeters: number;
    };
    /** sent = samples produced by the simulated UAV, delivered = ingested by the platform. */
    link: {sent: number; delivered: number; lost: number; lossPct: number; averageLatencyMs: number; maxLatencyMs: number};
    events: {at: string; level: SimEventLevel; message: string}[];
}

export interface SimulationStartInput {
    uavId: number;
    missionId?: number;
    waypoints?: LatLng[];
    homeLatitude?: number;
    homeLongitude?: number;
    altitudeMeters?: number;
    cruiseSpeedMs?: number;
    packetLossPct?: number;
    latencyMs?: number;
    jitterMs?: number;
    batteryPct?: number;
}

export interface SurveyPlanInput {
    vertices: LatLng[];
    altitudeMeters?: number;
    sideOverlapPercent?: number;
    cruiseSpeedMs?: number;
}

export interface SurveyPlan {
    waypoints: LatLng[];
    lineSpacingMeters: number;
    lengthMeters: number;
    estimatedMinutes: number;
}
