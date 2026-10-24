import type {PageResponse, ServicePlan, UserQuota} from '@/types';
import type {DashboardSummary} from '@/features/dashboard/types/dashboard.types';

export type {PageResponse, ServicePlan, UserQuota, DashboardSummary};

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
    locked?: boolean;
}

export interface AdminCreateUser {
    username: string;
    email: string;
    password: string;
    phoneNumber: string;
    fullName?: string;
    role: UserRole;
}

export interface BulkActionResult {
    processed: number[];
    skipped: { id: number; reason: 'NOT_FOUND' | 'SELF' | string }[];
}

export interface AuditFilters {
    actor?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    from?: string;
    to?: string;
}

export interface AnalyticsKpis {
    completedMissions: number;
    failedMissions: number;
    flightHours: number;
    successRate: number;
    revenue: number;
    newUsers: number;
}

export interface AdminAlert {
    level: 'danger' | 'warning' | 'info';
    code: string;
    message: string;
    href: string;
    count: number;
}

export interface AdminAnalytics {
    from: string;
    to: string;
    current: AnalyticsKpis;
    previous: AnalyticsKpis;
    daily: { date: string; completed: number; failed: number }[];
    statusBreakdown: Record<string, number>;
    flightHoursByStation: { name: string; value: number }[];
    fleet: Record<string, number>;
    missionLocations: { code: string; latitude: number; longitude: number; status: string }[];
    revenueByMonth: { month: string; paid: number; outstanding: number }[];
    auditHeatmap: number[][];
    webhooks: { name: string; success: number; failed: number }[];
    quotaWarnings: { userId: number | null; username: string; used: number; limit: number }[];
    alerts: AdminAlert[];
}

export interface Permission {
    code: PermissionCode;
    description: string;
}

export interface UserPermission {
    code: PermissionCode;
    granted: boolean;
}

export interface RoleTemplate {
    role: UserRole;
    name: string;
    permissions: PermissionCode[];
}

export interface AuditLog {
    id: number;
    actorUserId: number;
    actorUsername: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: string;
}

export const roles: UserRole[] = ['ROLE_PILOT', 'ROLE_COMMANDER', 'ROLE_OPERATOR', 'ROLE_ADMIN'];

export interface OperationsReportData {
    totalMissions: number;
    completedMissions: number;
    failedMissions: number;
    totalFlightHours: number;
    activeUavCount: number;
    maintenanceUavCount: number;
    totalStationsCount: number;
    sarOperationsCount: number;
    victimsRescuedCount: number;
    missionSuccessRate: number;
}

export interface SystemSettingItem {
    id?: string;
    configKey: string;
    configValue: string;
    category: string;
    description: string;
}

export interface WebhookEndpointItem {
    id: number;
    name: string;
    targetUrl: string;
    secretKey: string;
    eventsSubscribed: string;
    isActive: boolean;
}

export interface WebhookDeliveryLogItem {
    id: number;
    subscriptionName: string;
    eventType: string;
    eventId: string | null;
    responseStatusCode: number | null;
    deliveryDurationMs: number | null;
    attemptedAt: string;
    deliveryStatus: string;
    isSuccess: boolean;
    retryCount: number;
}
