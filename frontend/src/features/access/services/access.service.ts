import { apiClient } from '@/lib/api.client';
import { Page, Permission, RoleTemplate, User, UserPermission } from '../types/access.types';
export const accessService = {
  users: (page = 0, keyword = '', signal?: AbortSignal) => apiClient.get<Page<User>>(`/api/v1/users?size=20&page=${page}&keyword=${encodeURIComponent(keyword)}`, { signal }),
  permissions: (signal?: AbortSignal) => apiClient.get<Permission[]>('/api/v1/permissions', { signal }),
  templates: (signal?: AbortSignal) => apiClient.get<RoleTemplate[]>('/api/v1/role-templates', { signal }),
  userPermissions: (userId: number, signal?: AbortSignal) => apiClient.get<UserPermission[]>(`/api/v1/permissions/users/${userId}`, { signal }),
  setUserPermission: (userId: number, code: string, granted: boolean) => apiClient.put<void>(`/api/v1/permissions/users/${userId}/${code}?granted=${granted}`),
  resetUserPermission: (userId: number, code: string) => apiClient.delete<void>(`/api/v1/permissions/users/${userId}/${code}`),
};
