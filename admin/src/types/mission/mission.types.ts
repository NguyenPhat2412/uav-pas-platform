import type {FlightPlan, FlightPlanInput} from '@/types/mission/flight-plan.types';
import type {PageResponse} from '@/types';
import type {Equipment, Operator, Station} from '@/types/resources';

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
export type FlightPermitStatus = 'NOT_REQUIRED' | 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export interface MissionPermit {
    status: FlightPermitStatus;
    permitNumber?: string | null;
    permitAuthority?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    maxAltitudeMeters?: number | null;
    permitMediaId?: number | null;
    verifiedBy?: string | null;
    verifiedAt?: string | null;
    note?: string | null;
}

export interface MissionPermitUpsertInput {
    permitNumber: string;
    permitAuthority: string;
    validFrom: string;
    validUntil: string;
    maxAltitudeMeters?: number | null;
    permitMediaId?: number | null;
    note?: string | null;
}

export interface MissionPermitVerifyInput {
    approved: boolean;
    note?: string | null;
}

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
    permit?: MissionPermit | null;
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

/** Keyed by request field name, as returned by the backend; nested flight-plan keys look like flightPlan.vertices. */
export type MissionFormErrors = Partial<Record<keyof MissionInput, string>> & Record<string, string | undefined>;
export type MissionUpdateInput = Omit<MissionInput, 'missionType' | 'serviceId'>;
export type MissionTab = 'monitoring' | 'weather' | 'delivery' | 'history';
export type PlannerTool = 'takeoff' | 'POLYGON' | 'CIRCLE';

export interface FlightGeometry {
    center: [number, number] | null;
    areaSquareMeters: number | null;
    perimeterMeters: number | null;
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

export interface MissionRequestDetailsData {
    requestedDate: string;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
    flightPlan?: FlightPlan | null;
}

export type RedispatchKind = 'operator' | 'station' | 'equipment';

export interface RedispatchFormState {
    kind: RedispatchKind;
    version: number;
    reservationId?: number;
    oldEquipmentId?: number;
    oldQuantity?: number;
}

export interface ResourceRedispatchProps {
    snapshot: DispatchResources;
    stations: Station[];
    operators: Operator[];
    equipment: Equipment[];
    allowed: { operator: boolean; station: boolean; equipment: boolean };
    disabled: boolean;
    action: (run: () => Promise<Mission>) => Promise<void>;
}

export type ExifMetadata = Record<string, unknown> & { latitude?: number; longitude?: number };

export type MissionConfirmationKind = 'reject' | 'conflict' | 'complete' | 'cancel' | 'fail' | 'forceFail';
export type MissionNoticeMessage = { key: string; params?: Record<string, string | number> } | { text: string };
export type MissionDetailSection = 'timeline' | 'media' | 'stations' | 'uavs' | 'equipment' | 'operators';

export interface SavedFlightSite {
    id: number;
    name: string;
    locationName: string;
    latitude?: number | null;
    longitude?: number | null;
    defaultMissionType: MissionType;
    flightPlan?: FlightPlan | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface SavedFlightSiteUpsertInput {
    name: string;
    locationName: string;
    latitude?: number | null;
    longitude?: number | null;
    defaultMissionType: MissionType;
    flightPlan?: FlightPlanInput | null;
    notes?: string | null;
}

export interface MissionReview {
    reviewed: boolean;
    id?: number | null;
    missionId: number;
    missionCode?: string | null;
    customerId?: number | null;
    customerUsername?: string | null;
    customerFullName?: string | null;
    overallRating?: number | null;
    dataQualityRating?: number | null;
    timelinessRating?: number | null;
    deliverablesAccepted: boolean;
    comment?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface MissionReviewUpsertInput {
    overallRating: number;
    dataQualityRating: number;
    timelinessRating: number;
    deliverablesAccepted?: boolean;
    comment?: string | null;
}

export interface MissionPreflight {
    recorded: boolean;
    id?: number | null;
    missionId: number;
    signedByUsername?: string | null;
    signedAt?: string | null;
    airframeAndPropellersSafe: boolean;
    batteryHealthy: boolean;
    gnssRtkLocked: boolean;
    weatherWithinLimits: boolean;
    airspaceAndPermitCleared: boolean;
    measuredBatteryPct?: number | null;
    satelliteCount?: number | null;
    measuredWindMs?: number | null;
    clearedForTakeoff: boolean;
    notes?: string | null;
    updatedAt?: string | null;
}

export interface MissionPreflightUpsertInput {
    airframeAndPropellersSafe: boolean;
    batteryHealthy: boolean;
    gnssRtkLocked: boolean;
    weatherWithinLimits: boolean;
    airspaceAndPermitCleared: boolean;
    measuredBatteryPct?: number | null;
    satelliteCount?: number | null;
    measuredWindMs?: number | null;
    notes?: string | null;
}

export interface LoggedFlightEntry {
    missionId: number;
    code: string;
    title: string;
    missionType: MissionType;
    status: MissionStatus;
    locationName?: string | null;
    uavSerialNumber?: string | null;
    startTime?: string | null;
    completedAt?: string | null;
    durationHours: number;
    preflightCleared: boolean;
    customerRating?: number | null;
}

export interface OperatorLogbook {
    operatorUsername: string;
    operatorFullName: string;
    totalAssignedMissions: number;
    completedMissions: number;
    totalFlightHours: number;
    preflightSignedCount: number;
    preflightComplianceRate: number;
    averageCustomerRating?: number | null;
    reviewedMissionsCount: number;
    recentFlights: LoggedFlightEntry[];
}

export interface StationCandidate {
    id: number;
    code: string;
    name: string;
    distanceKm?: number | null;
    availableUavCount: number;
    availableEquipmentCount: number;
    score: number;
    eligible: boolean;
    reason?: string | null;
}

export interface UavCandidate {
    id: number;
    serialNumber: string;
    model: string;
    stationId?: number | null;
    stationName?: string | null;
    distanceKm?: number | null;
    batteryPct?: number | null;
    daysSinceMaintenance?: number | null;
    score: number;
    eligible: boolean;
    conflictReason?: string | null;
}

export interface OperatorCandidate {
    id: number;
    username: string;
    fullName: string;
    sameDayMissionCount: number;
    completedMissionCount: number;
    averageRating?: number | null;
    score: number;
    eligible: boolean;
    conflictReason?: string | null;
}

export interface EquipmentCandidate {
    id: number;
    name: string;
    category: string;
    stationId?: number | null;
    availableQuantity: number;
    score: number;
    eligible: boolean;
    reason?: string | null;
}

export interface MissionDispatchCandidates {
    missionId: number;
    missionCode: string;
    missionStatus: MissionStatus;
    recommendedStationId?: number | null;
    recommendedUavId?: number | null;
    recommendedOperatorId?: number | null;
    recommendedEquipmentId?: number | null;
    canAutoAssign: boolean;
    stations: StationCandidate[];
    uavs: UavCandidate[];
    operators: OperatorCandidate[];
    equipment: EquipmentCandidate[];
}

export interface DeliverableGeoPin {
    mediaId: number;
    fileName: string;
    mediaType: string;
    fileUrl: string;
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    waypointIndex: number;
    phaseLabel: string;
    uploadedAt: string;
}

export interface MissionInspectionReport {
    missionId: number;
    missionCode: string;
    title: string;
    missionType: string;
    status: string;
    priority: string;
    customerName: string | null;
    locationName: string | null;
    latitude: number | null;
    longitude: number | null;
    startTime: string | null;
    expectedEndTime: string | null;
    actualStartTime: string | null;
    actualEndTime: string | null;
    stationName: string | null;
    operatorName: string | null;
    uavSerialNumber: string;
    uavModel: string;
    airframeClass: 'QUADCOPTER_RTK' | 'HEXACOPTER_SAR' | 'VTOL_FIXED_WING';
    permitStatus: string;
    permitReference: string | null;
    preflightPassed: boolean;
    totalDistanceMeters: number;
    maxAltitudeMeters: number;
    waypointCount: number;
    mediaCount: number;
    customerRating: number | null;
    customerReviewComment: string | null;
    certificateCode: string;
    generatedAt: string;
    deliverablePins: DeliverableGeoPin[];
}

