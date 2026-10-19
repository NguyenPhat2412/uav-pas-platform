import { API_ROUTES, apiClient } from '@/lib/api.client';
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
  WebhookDeliveryLogItem,
  WebhookEndpointItem,
} from "@/types/admin";

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  return search.toString();
};

export const adminService = {
  users: async (page = 0, keyword = '', role?: UserRole, signal?: AbortSignal) => {
    return apiClient.get<PageResponse<User>>(`/api/v1/users?${query({ page, size: 20, keyword, role, sortBy: 'createdAt', direction: 'desc' })}`, { signal });
  },
  user: (id: number, signal?: AbortSignal) => apiClient.get<User>(`/api/v1/users/${id}`, { signal }),
  lock: (id: number) => apiClient.post<void>(`/api/v1/users/${id}/lock`),
  unlock: (id: number) => apiClient.post<void>(`/api/v1/users/${id}/unlock`),
  updateRole: (id: number, role: UserRole) => apiClient.put<User>(`/api/v1/users/${id}/role`, { role }),
  permissions: (signal?: AbortSignal) => apiClient.get<Permission[]>('/api/v1/permissions', { signal }),
  userPermissions: (id: number, signal?: AbortSignal) => apiClient.get<UserPermission[]>(`/api/v1/permissions/users/${id}`, { signal }),
  setUserPermission: (id: number, code: string, granted: boolean) => apiClient.put<void>(`/api/v1/permissions/users/${id}/${encodeURIComponent(code)}?granted=${granted}`, {}),
  clearUserPermission: (id: number, code: string) => apiClient.delete<void>(`/api/v1/permissions/users/${id}/${encodeURIComponent(code)}`),
  roleTemplates: (signal?: AbortSignal) => apiClient.get<RoleTemplate[]>('/api/v1/role-templates', { signal }),
  setRolePermission: (role: UserRole, code: string, granted: boolean) => apiClient.put<void>(`/api/v1/role-templates/${encodeURIComponent(role)}/permissions/${encodeURIComponent(code)}?granted=${granted}`, {}),
  dashboard: async (signal?: AbortSignal) => {
    return apiClient.get<DashboardSummary>('/api/v1/dashboard/summary', { signal });
  },
  audit: async (page = 0, size = 8, signal?: AbortSignal) => {
    return apiClient.get<PageResponse<AuditLog>>(`/api/v1/audit-logs?${query({ page, size })}`, { signal });
  },
  billingPlans: (signal?: AbortSignal) => apiClient.get<ServicePlan[]>(API_ROUTES.billing.plans, { signal }),
  billingQuotas: (page = 0, signal?: AbortSignal) => apiClient.get<PageResponse<UserQuota>>(`/api/v1/billing/admin/quotas?${query({ page, size: 20 })}`, { signal }),
  updateQuota: (userId: number, data: { planCode: string; flightHoursLimit: number }) => apiClient.put<UserQuota>(`/api/v1/billing/admin/quotas/${userId}`, data),
  operationsReport: (signal?: AbortSignal) => apiClient.get<OperationsReportData>(API_ROUTES.reports.operations, { signal }),
  exportOperationsCsv: (signal?: AbortSignal) => apiClient.get<string>(API_ROUTES.reports.exportOperationsCsv, { signal }),
  settings: (signal?: AbortSignal) => apiClient.get<SystemSettingItem[]>(API_ROUTES.settings.list, { signal }),
  updateSetting: (key: string, value: string) => apiClient.put<void>(API_ROUTES.settings.byKey(key), { configValue: value }),
  webhooks: (signal?: AbortSignal) => apiClient.get<WebhookEndpointItem[]>(API_ROUTES.webhooks.list, { signal }),
  webhookLogs: async (signal?: AbortSignal) => (await apiClient.get<{ content: WebhookDeliveryLogItem[] }>(API_ROUTES.webhooks.logs, { signal })).content,
  webhookStatus: (signal?: AbortSignal) => apiClient.get<{ status: string }>(API_ROUTES.webhooks.status, { signal }),
  triggerWebhookTest: () => apiClient.post<{ status: string; message: string }>(API_ROUTES.webhooks.test, { eventType: 'WEBHOOK_TEST' }),
};


