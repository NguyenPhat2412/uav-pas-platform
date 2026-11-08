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

import type {UavTelemetry} from '@/types/uav/telemetry.types';

export interface SarFlightPlan {
    missionId: number;
    patternType: string;
    sweepWidthMeters: number;
    totalDistanceMeters: number;
    estimatedFlightMinutes: number;
    waypoints: SarWaypoint[];
}

export interface LatLng {
    lat: number;
    lng: number;
}

export interface Waypoint extends LatLng {
    id: string;
    order: number;
    altMeters: number;
    speedMps: number;
    legDistanceMeters?: number;
}

export interface GeofenceViolationResult {
    isInside: boolean;
    distanceToBoundaryMeters: number;
    closestPointOnBoundary: LatLng;
}

export interface RthCalculation {
    distanceHomeMeters: number;
    flightTimeRequiredSeconds: number;
    batteryRequiredPercent: number;
    isSafeToContinue: boolean;
    recommendedAction: 'CONTINUE_MISSION' | 'WARNING_PREPARE_RTH' | 'CRITICAL_IMMEDIATE_RTH';
}

export interface AiViewfinderProps {
    missionId: number;
    detections: AiDetection[];
    task: AiTask | null;
    loading: boolean;
    failed: boolean;
    selectedId: number | null;
    onSelect: (id: number) => void;
    canVerify: boolean;
}

export interface SarTacticalMapProps {
    mission: SarCockpitMission;
    detections: AiDetection[];
    telemetry: UavTelemetry | null;
    selectedId: number | null;
    onSelect: (id: number) => void;
}
