export type UavStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE';

export const uavStatuses: UavStatus[] = ['AVAILABLE', 'ASSIGNED', 'IN_USE', 'MAINTENANCE', 'INACTIVE'];

/** MISSION: placed at the current mission; STATION: at its home station; NONE: no known coordinates. */
export type PositionSource = 'MISSION' | 'STATION' | 'NONE';

export interface FleetUav {
    id: number;
    model: string;
    serialNumber: string;
    manufacturer: string | null;
    status: UavStatus;
    stationId: number | null;
    stationName: string | null;
    lastMaintenanceAt: string | null;
    positionSource: PositionSource;
    latitude: number | null;
    longitude: number | null;
    activeMission: {
        id: number;
        code: string;
        title: string;
        status: string;
        locationName: string | null;
        startTime: string | null;
    } | null;
}

export interface FleetStation {
    id: number;
    code: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    status: string | null;
    uavCount: number;
}

/** GET /api/v1/dashboard/fleet-map */
export interface FleetMap {
    uavs: FleetUav[];
    stations: FleetStation[];
    generatedAt: string;
}
