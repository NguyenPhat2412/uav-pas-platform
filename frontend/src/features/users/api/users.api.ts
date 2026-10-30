import {apiClient, API_ROUTES} from '@/lib/api';
import type {PageResponse, User, UserRole, UserStatus, AdminCreateUser, BulkActionResult} from '@/types/admin';
import {buildQueryString as query} from '@/lib/format';

export const usersService = {
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
    createUser: (data: AdminCreateUser) => apiClient.post<User>(API_ROUTES.users.list, data),
    resetPassword: (id: number, newPassword: string) =>
        apiClient.post<void>(API_ROUTES.users.resetPassword(id), {newPassword}),
    bulkLock: (ids: number[], locked: boolean) =>
        apiClient.post<BulkActionResult>(API_ROUTES.users.bulkLock, {ids, locked}),
    exportUsers: (filters: { keyword?: string; role?: UserRole; status?: UserStatus }) =>
        apiClient.get<string>(`${API_ROUTES.users.export}?${query(filters)}`),
};
