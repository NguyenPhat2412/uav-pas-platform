export type MissionType = 'UAV_RENTAL' | 'AREA_INSPECTION' | 'AERIAL_RECORDING' | 'DATA_COLLECTION' | 'OTHER';
export type MissionStatus = 'DRAFT' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'RESOURCE_RESERVED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'FAILED';
export type MissionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type MediaRole = 'INPUT' | 'FLIGHT_DATA' | 'OUTPUT' | 'DOCUMENT' | 'OTHER';
export type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean; hasNext: boolean; hasPrevious: boolean; }
export interface Mission {
  id: number; code: string; customerId?: number; customerName?: string; serviceId?: number; missionType: MissionType;
  title: string; description?: string; requestedDate: string; startTime: string; expectedEndTime: string; locationName: string;
  latitude?: number; longitude?: number; stationId?: number; uavId?: number; operatorId?: number; priority: MissionPriority;
  status: MissionStatus; notes?: string; operatorAccepted?: boolean; operatorConflictNote?: string; createdAt?: string; updatedAt?: string;
  completionNote?: string; equipmentCondition?: string; failureReason?: string; failureNotes?: string;
}
export interface MissionEvent { id: number; eventType: string; actor?: string; oldStatus?: MissionStatus; newStatus?: MissionStatus; description?: string; metadata?: string; createdAt?: string; }
export interface MissionMedia { id: number; missionId: number; mediaRole: MediaRole; uploadedBy?: string; createdAt?: string; media: { id: number; originalName: string; contentType: string; size: number; type: string; }; }
export interface MissionInput { missionType: MissionType; title: string; description?: string; requestedDate: string; startTime: string; expectedEndTime: string; locationName: string; latitude?: number; longitude?: number; serviceId?: number; priority?: MissionPriority; notes?: string; }
export interface MissionDashboard { totalMissions: number; pendingMissions: number; confirmedMissions: number; readyMissions: number; inProgressMissions: number; completedMissions: number; failedMissions: number; }
export interface UavService { id: number; code: string; name: string; description?: string; active: boolean; defaultDurationMinutes: number; }
export interface SignedMediaUrl { mediaId: number; url: string; operation: string; expiresInSeconds: number; }
export interface MissionAvailability { available: boolean; stationAvailable: boolean; uavAvailable: boolean; operatorAvailable: boolean; message: string; }

export interface DispatchReservation { id: number; equipmentId: number; equipmentName: string; stationId?: number; quantity: number; released: boolean; releasedAt?: string; }
export interface DispatchResources { mission: Mission; version: number; stationId?: number; operatorId?: number; reservations: DispatchReservation[]; }
