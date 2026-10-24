export type SarStatus = 'SEARCHING' | 'SUSPENDED' | 'TARGET_LOCATED' | 'RESCUED';

/** GET /sar/missions — one SAR mission with its datum, assigned UAV and home station. */
export interface SarCockpitMission {
    sarId: number;
    missionId: number;
    missionCode: string;
    missionTitle: string;
    missionStatus: string | null;
    priority: string | null;
    sarStatus: SarStatus;
    lkpLatitude: number;
    lkpLongitude: number;
    driftRadiusMeters: number | null;
    searchAreaPolygon: string | null;
    victimCountEstimated: number | null;
    emergencyContact: string | null;
    uavId: number | null;
    uavModel: string | null;
    uavSerialNumber: string | null;
    operatorName: string | null;
    stationName: string | null;
    stationLatitude: number | null;
    stationLongitude: number | null;
    startTime: string | null;
    updatedAt: string | null;
}

/** An AI detection; box values are percentages of the analysed frame. */
export interface AiDetection {
    id: number;
    aiTaskId: number;
    missionId: number;
    label: string;
    confidence: number;
    boxTop: number;
    boxLeft: number;
    boxWidth: number;
    boxHeight: number;
    latitude: number | null;
    longitude: number | null;
    trackingId: string | null;
    verified: boolean;
    verifiedBy: string | null;
    createdAt: string;
}

export type ProcessingNode = 'KV260_EDGE' | 'CLOUD_GPU';
export type AiTaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AiTask {
    id: number;
    missionId: number;
    mediaId: number | null;
    taskType: string;
    status: AiTaskStatus;
    processingNode: ProcessingNode;
    confidenceThreshold: number | null;
    inferenceTimeMs: number | null;
    fps: number | null;
    dpuUtilization: number | null;
    socTemperature: number | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
}

/** QUEUED: at least one webhook subscriber will receive it; UNCONFIGURED: nobody subscribes to the event. */
export interface SarDispatchResult {
    status: 'QUEUED' | 'UNCONFIGURED' | string;
    externalDeliveryConfirmed: boolean;
    eventType: string;
    missionId: number;
    timestamp: string;
    message: string;
}

export interface SarWaypoint {
    index: number;
    lat: number;
    lng: number;
    legDistanceMeters: number;
    bearingDeg: number;
    label: string;
}

export interface SarFlightPlan {
    missionId: number;
    patternType: string;
    sweepWidthMeters: number;
    totalDistanceMeters: number;
    estimatedFlightMinutes: number;
    waypoints: SarWaypoint[];
}
