import { apiClient } from '@/lib/api.client';
import type { AuditLog, DashboardSummary, PageResponse, Permission, RoleTemplate, User, UserPermission, UserRole } from '../types';

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  return search.toString();
};

export const adminService = {
  users: (page = 0, keyword = '', role?: UserRole, signal?: AbortSignal) => apiClient.get<PageResponse<User>>(`/api/v1/users?${query({ page, size: 20, keyword, role, sortBy: 'createdAt', direction: 'desc' })}`, { signal }),
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
  dashboard: (signal?: AbortSignal) => apiClient.get<DashboardSummary>('/api/v1/dashboard/summary', { signal }),
  audit: (page = 0, size = 8, signal?: AbortSignal) => apiClient.get<PageResponse<AuditLog>>(`/api/v1/audit-logs?${query({ page, size })}`, { signal }),
};
