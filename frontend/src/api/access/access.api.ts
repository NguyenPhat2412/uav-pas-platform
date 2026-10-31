import {apiClient, API_ROUTES} from '@/lib/api';
import type {Permission, RoleTemplate, UserPermission, UserRole} from '@/types/admin';

export const accessService = {
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
};
