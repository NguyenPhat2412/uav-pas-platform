export type RtkStatus = 'NONE' | 'SINGLE' | 'FLOAT' | 'FIXED';

/** Latest device sample (GET /uavs/{id}/telemetry/latest). stale is true once it is older than 120 s. */
export interface UavTelemetry {
    uavId: number;
    missionId: number | null;
    recordedAt: string;
    latitude: number;
    longitude: number;
    altitudeAglMeters: number | null;
    groundSpeedMs: number | null;
    headingDeg: number | null;
    batteryPct: number | null;
    rtkStatus: RtkStatus | null;
    satellites: number | null;
    ageSeconds: number;
    stale: boolean;
}
