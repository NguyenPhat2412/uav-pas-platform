// Canonical Admin API endpoints (/api/v1/users, /api/v1/permissions, /api/v1/role-templates, /api/v1/audit-logs, /api/v1/dashboard/summary)
import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    AuditLog,
    DashboardSummary,
    OperationsReportData,
    PageResponse,
    Permission,
    RoleTemplate,
    ServicePlan,
    SystemSettingItem,
    User,
    UserPermission,
    UserQuota,
    UserRole,
    UserStatus,
    AdminAnalytics,
    AdminCreateUser,
    AuditFilters,
    BulkActionResult,
    WebhookDeliveryLogItem,
    WebhookEndpointItem,
} from "@/types/admin";
import type {Mission} from "@/types/customer";

const query = (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') search.set(key, String(value));
    });
    return search.toString();
};

export const adminService = {
    reportMissions: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?size=200`, {signal}),
    pendingMissions: (signal?: AbortSignal) =>
        apiClient.get<PageResponse<Mission>>(`${API_ROUTES.missions.list}?status=PENDING_CONFIRMATION&size=5`, {signal}),
    users: async (page = 0, keyword = '', role?: UserRole, signal?: AbortSignal, status?: UserStatus, size = 20) => {
        return apiClient.get<PageResponse<User>>(`${API_ROUTES.users.list}?${query({
            page,
            size,
            keyword,
            role,
            status,
            sortBy: 'createdAt',
            direction: 'desc'
        })}`, {signal});
    },
    user: (id: number, signal?: AbortSignal) => apiClient.get<User>(API_ROUTES.users.detail(id), {signal}),
    lock: (id: number) => apiClient.post<void>(API_ROUTES.users.lock(id)),
    unlock: (id: number) => apiClient.post<void>(API_ROUTES.users.unlock(id)),
    updateRole: (id: number, role: UserRole) => apiClient.put<User>(API_ROUTES.users.role(id), {role}),
    permissions: (signal?: AbortSignal) => apiClient.get<Permission[]>(API_ROUTES.permissions.list, {signal}),
    userPermissions: (id: number, signal?: AbortSignal) =>
        apiClient.get<UserPermission[]>(API_ROUTES.permissions.byUser(id), {signal}),
    setUserPermission: (id: number, code: string, granted: boolean) =>
        apiClient.put<void>(`${API_ROUTES.permissions.userOverride(id, code)}?granted=${granted}`, {}),
    clearUserPermission: (id: number, code: string) =>
        apiClient.delete<void>(API_ROUTES.permissions.userOverride(id, code)),
    roleTemplates: (signal?: AbortSignal) => apiClient.get<RoleTemplate[]>(API_ROUTES.roleTemplates.list, {signal}),
    setRolePermission: (role: UserRole, code: string, granted: boolean) =>
        apiClient.put<void>(API_ROUTES.roleTemplates.setPermission(role, code, granted), {}),
    dashboard: async (signal?: AbortSignal) => {
        return apiClient.get<DashboardSummary>(API_ROUTES.dashboard.summary, {signal});
    },
    audit: async (page = 0, size = 8, signal?: AbortSignal, filters: AuditFilters = {}) => {
        return apiClient.get<PageResponse<AuditLog>>(`${API_ROUTES.auditLogs.list}?${query({page, size, ...filters})}`, {signal});
    },
    analytics: (days: number, signal?: AbortSignal) =>
        apiClient.get<AdminAnalytics>(API_ROUTES.dashboard.analytics(days), {signal}),
    createUser: (data: AdminCreateUser) => apiClient.post<User>(API_ROUTES.users.list, data),
    resetPassword: (id: number, newPassword: string) =>
        apiClient.post<void>(API_ROUTES.users.resetPassword(id), {newPassword}),
    bulkLock: (ids: number[], locked: boolean) =>
        apiClient.post<BulkActionResult>(API_ROUTES.users.bulkLock, {ids, locked}),
    exportUsers: (filters: { keyword?: string; role?: UserRole; status?: UserStatus }) =>
        apiClient.get<string>(`${API_ROUTES.users.export}?${query(filters)}`),
    billingPlans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, {signal}),
    billingQuotas: (page = 0, signal?: AbortSignal) =>
        apiClient.get<PageResponse<UserQuota>>(`${API_ROUTES.billing.adminQuotas}?${query({page, size: 20})}`, {signal}),
    updateQuota: (userId: number, data: { planCode: string; flightHoursLimit: number }) =>
        apiClient.put<UserQuota>(API_ROUTES.billing.adminQuotaByUser(userId), data),
    operationsReport: (signal?: AbortSignal) =>
        apiClient.get<OperationsReportData>(API_ROUTES.reports.operations, {signal}),
    exportOperationsCsv: (signal?: AbortSignal) =>
        apiClient.get<string>(API_ROUTES.reports.exportOperationsCsv, {signal}),
    settings: (signal?: AbortSignal) => apiClient.get<SystemSettingItem[]>(API_ROUTES.settings.list, {signal}),
    updateSetting: (key: string, value: string) =>
        apiClient.put<void>(API_ROUTES.settings.byKey(key), {configValue: value}),
    webhooks: (signal?: AbortSignal) => apiClient.get<WebhookEndpointItem[]>(API_ROUTES.webhooks.list, {signal}),
    webhookLogs: async (signal?: AbortSignal) =>
        (await apiClient.get<{ content: WebhookDeliveryLogItem[] }>(API_ROUTES.webhooks.logs, {signal})).content,
    webhookStatus: (signal?: AbortSignal) => apiClient.get<{ status: string }>(API_ROUTES.webhooks.status, {signal}),
    triggerWebhookTest: () =>
        apiClient.post<{ status: string; message: string }>(API_ROUTES.webhooks.test, {eventType: 'WEBHOOK_TEST'}),
    createWebhook: (data: { name: string; targetUrl: string; secretKey: string; eventsSubscribed: string }) =>
        apiClient.post<WebhookEndpointItem>(API_ROUTES.webhooks.list, data),
    toggleWebhook: (id: number, active: boolean) =>
        apiClient.put<void>(API_ROUTES.webhooks.toggle(id, active)),
    deleteWebhook: (id: number) => apiClient.delete<void>(API_ROUTES.webhooks.detail(id)),
};
