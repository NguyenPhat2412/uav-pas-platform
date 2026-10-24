import type {FlightPlan, FlightPlanInput} from '@/features/missions/types/flight-plan.types';
import type {PageResponse} from '@/types';

export type {PageResponse};

export type MissionType = 'UAV_RENTAL' | 'AREA_INSPECTION' | 'AERIAL_RECORDING' | 'DATA_COLLECTION' | 'OTHER';
export type MissionStatus =
    | 'DRAFT'
    | 'PENDING_CONFIRMATION'
    | 'CONFIRMED'
    | 'RESOURCE_RESERVED'
    | 'READY'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REJECTED'
    | 'FAILED';
export type MissionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type MediaRole = 'INPUT' | 'FLIGHT_DATA' | 'OUTPUT' | 'DOCUMENT' | 'OTHER';
export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface Mission {
    id: number;
    version: number;
    code: string;
    customerId?: number;
    customerName?: string;
    serviceId?: number;
    missionType: MissionType;
    title: string;
    description?: string;
    requestedDate: string;
    startTime: string;
    expectedEndTime: string;
    locationName: string;
    latitude?: number;
    longitude?: number;
    stationId?: number;
    uavId?: number;
    operatorId?: number;
    priority: MissionPriority;
    status: MissionStatus;
    notes?: string;
    operatorAccepted?: boolean;
    operatorConflictNote?: string;
    createdAt?: string;
    updatedAt?: string;
    billingStatus?: string;
    flightPlan?: FlightPlan | null;
    completionNote?: string;
    equipmentCondition?: string;
    failureReason?: string;
    failureNotes?: string;
}

export interface MissionEvent {
    id: number;
    eventType: string;
    actor?: string;
    oldStatus?: MissionStatus;
    newStatus?: MissionStatus;
    description?: string;
    metadata?: string;
    createdAt?: string;
}

export interface MissionMedia {
    id: number;
    missionId: number;
    mediaRole: MediaRole | string;
    uploadedBy?: string;
    createdAt?: string;
    media: { id: number; originalName: string; contentType: string; size: number; type: string };
}

export interface MissionInput {
    missionType: MissionType;
    title: string;
    description?: string;
    requestedDate: string;
    startTime: string;
    expectedEndTime: string;
    locationName: string;
    latitude?: number;
    longitude?: number;
    serviceId?: number;
    priority?: MissionPriority;
    notes?: string;
    flightPlan?: FlightPlanInput;
}

export interface MissionDashboard {
    totalMissions: number;
    pendingMissions: number;
    confirmedMissions: number;
    readyMissions: number;
    inProgressMissions: number;
    completedMissions: number;
    failedMissions: number;
}

export interface UavService {
    id: number;
    code: string;
    name: string;
    description?: string;
    active: boolean;
    defaultDurationMinutes: number;
    /** Technical sheet; null where operations have not committed to a value. */
    sensors?: string[];
    bestGsdCm?: number | null;
    maxAreaHectares?: number | null;
    maxWindMs?: number | null;
    onSiteHours?: number | null;
    deliveryHours?: number | null;
}

export interface SignedMediaUrl {
    mediaId: number;
    url: string;
    operation: string;
    expiresInSeconds: number;
}

export interface MissionAvailability {
    available: boolean;
    stationAvailable: boolean;
    uavAvailable: boolean;
    operatorAvailable: boolean;
    message: string;
}

export interface DispatchReservation {
    id: number;
    equipmentId: number;
    equipmentName: string;
    stationId?: number;
    quantity: number;
    released: boolean;
    releasedAt?: string;
}

export interface DispatchResources {
    mission: Mission;
    version: number;
    stationId?: number;
    operatorId?: number;
    reservations: DispatchReservation[];
}
