export type UserRole = 'ROLE_PILOT' | 'ROLE_COMMANDER' | 'ROLE_OPERATOR' | 'ROLE_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type PermissionCode = string;

export interface User {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface Permission { code: PermissionCode; description: string; }
export interface UserPermission { code: PermissionCode; granted: boolean; }
export interface RoleTemplate { role: UserRole; name: string; permissions: PermissionCode[]; }
export interface DashboardSummary { totalUsers: number; totalStations: number; totalUavs: number; availableUavs: number; maintenanceUavs: number; totalEquipmentUnits: number; reservedEquipmentUnits: number; totalMediaAssets: number; totalAuditEvents: number; }
export interface AuditLog { id: number; actorUserId: number; actorUsername: string; action: string; entityType: string; entityId: string; details: string; createdAt: string; }

export const roles: UserRole[] = ['ROLE_PILOT', 'ROLE_COMMANDER', 'ROLE_OPERATOR', 'ROLE_ADMIN'];

export interface ServicePlan { id: number; code: string; name: string; price: number; billingCycle: string; maxMonthlyFlightHours: number; maxConcurrentUavs: number; allowSarAi: boolean; description?: string; active: boolean; }
export interface UserQuota { id: number; userId: number; username: string; fullName?: string; planCode: string; planName: string; flightHoursUsed: number; flightHoursLimit: number; flightHoursRemaining: number; concurrentUavsUsed: number; concurrentUavsLimit: number; cycleStart: string; cycleEnd: string; }
