export type AirspaceZoneType = 'PROHIBITED' | 'RESTRICTED' | 'WARNING';

export type AirspaceGeometryType = 'CIRCLE' | 'POLYGON';

export type AirspaceClearance = 'CLEAR' | 'CAUTION' | 'PERMIT_REQUIRED' | 'BLOCKED';

export interface AirspaceZone {
    id: number;
    code: string;
    name: string;
    zoneType: AirspaceZoneType;
    geometryType: AirspaceGeometryType;
    centerLat: number;
    centerLng: number;
    radiusMeters?: number | null;
    vertices?: [number, number][] | number[][] | null;
    maxAltitudeAglM?: number | null;
    authority: string;
    active: boolean;
    description?: string | null;
    effectiveFrom?: string | null;
    effectiveUntil?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AirspaceViolation {
    zoneId: number;
    code: string;
    name: string;
    zoneType: AirspaceZoneType;
    authority: string;
    maxAltitudeAglM?: number | null;
    distanceMeters: number;
    blocking: boolean;
    requiresPermit: boolean;
    message: string;
}

export interface AirspaceCheckInput {
    areaType: 'POINT' | 'POLYGON' | 'CIRCLE';
    vertices?: number[][];
    radiusMeters?: number;
    takeoffLatitude?: number;
    takeoffLongitude?: number;
    altitudeAglMeters?: number;
    plannedStartTime?: string;
    plannedEndTime?: string;
}

export interface AirspaceCheckResult {
    clear: boolean;
    blocked: boolean;
    requiresPermit: boolean;
    clearance: AirspaceClearance;
    violations: AirspaceViolation[];
}

export interface AirspaceZoneUpsertInput {
    code: string;
    name: string;
    zoneType: AirspaceZoneType;
    geometryType: AirspaceGeometryType;
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number | null;
    vertices?: number[][] | null;
    maxAltitudeAglM?: number | null;
    authority: string;
    active?: boolean;
    description?: string | null;
    effectiveFrom?: string | null;
    effectiveUntil?: string | null;
}
