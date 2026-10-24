"use client";
import {useMutation, useQueries, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {adminService} from "@/lib/api/admin";
import type {AdminCreateUser, AuditFilters, UserRole, UserStatus} from "@/types/admin";

export function useAdminUsers(page: number, keyword: string, role?: UserRole, status?: UserStatus) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id, 'admin-users', page, keyword, role, status],
        queryFn: ({signal}) => adminService.users(page, keyword, role, signal, status),
        enabled: permissionsReady && can('USER_READ')
    });
}

export const userStatuses = [undefined, 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

/** Account totals per status; each count is a one-row page so only totalElements is transferred. */
export function useAdminUserCounts(keyword: string, role?: UserRole) {
    const {user, can, permissionsReady} = useAuth();
    const results = useQueries({
        queries: userStatuses.map(status => ({
            queryKey: ['session', user?.id, 'admin-users', 'count', keyword, role, status],
            queryFn: ({signal}: { signal: AbortSignal }) => adminService.users(0, keyword, role, signal, status, 1),
            enabled: permissionsReady && can('USER_READ')
        }))
    });
    return Object.fromEntries(userStatuses.map((status, i) => [status ?? 'ALL', results[i].data?.totalElements])) as Record<UserStatus | 'ALL', number | undefined>;
}

export function useAdminUser(id: number) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id, 'admin-user', id],
        queryFn: ({signal}) => adminService.user(id, signal),
        enabled: permissionsReady && can('USER_READ') && Number.isSafeInteger(id) && id > 0
    });
}

export function useAdminReferenceData() {
    const {user, can, permissionsReady} = useAuth();
    const enabled = permissionsReady && can('PERMISSION_MANAGE');
    const permissions = useQuery({
        queryKey: ['session', user?.id, 'admin-permissions'],
        queryFn: ({signal}) => adminService.permissions(signal),
        enabled
    });
    const templates = useQuery({
        queryKey: ['session', user?.id, 'admin-role-templates'],
        queryFn: ({signal}) => adminService.roleTemplates(signal),
        enabled
    });
    return {permissions, templates};
}

export function useAdminInvalidation() {
    const client = useQueryClient();
    const {user} = useAuth();
    return async (targetId?: number, template = false) => {
        const features = ['admin-users', 'admin-audit', 'admin-dashboard'];
        if (template) features.push('admin-role-templates');
        await client.invalidateQueries({predicate: q => q.queryKey[0] === 'session' && q.queryKey[1] === user?.id && (features.includes(String(q.queryKey[2])) || ((q.queryKey[2] === 'admin-user' || q.queryKey[2] === 'admin-user-permissions') && (template || q.queryKey[3] === targetId)) || (q.queryKey[2] === 'permissions' && (template || targetId === user?.id)))});
    };
}

export function useAdminMutations() {
    const invalidate = useAdminInvalidation();
    const lock = useMutation({mutationFn: adminService.lock, onSettled: (_d, _e, id) => invalidate(id)});
    const unlock = useMutation({mutationFn: adminService.unlock, onSettled: (_d, _e, id) => invalidate(id)});
    const role = useMutation({
        mutationFn: ({id, nextRole}: {
            id: number;
            nextRole: UserRole
        }) => adminService.updateRole(id, nextRole), onSettled: (_d, _e, {id}) => invalidate(id)
    });
    const create = useMutation({mutationFn: (data: AdminCreateUser) => adminService.createUser(data), onSettled: () => invalidate()});
    const resetPassword = useMutation({
        mutationFn: ({id, password}: { id: number; password: string }) => adminService.resetPassword(id, password),
        onSettled: (_d, _e, {id}) => invalidate(id)
    });
    const bulkLock = useMutation({
        mutationFn: ({ids, locked}: { ids: number[]; locked: boolean }) => adminService.bulkLock(ids, locked),
        onSettled: () => invalidate()
    });
    return {lock, unlock, role, create, resetPassword, bulkLock};
}

export function useAdminAnalytics(days: number) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id, 'admin-dashboard', 'analytics', days],
        queryFn: ({signal}) => adminService.analytics(days, signal),
        enabled: permissionsReady && can('DASHBOARD_READ'),
        staleTime: 60_000
    });
}

export function useAdminAudit(page: number, size: number, filters: AuditFilters, enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id, 'admin-audit', page, size, filters],
        queryFn: ({signal}) => adminService.audit(page, size, signal, filters),
        enabled: enabled && permissionsReady && can('AUDIT_READ')
    });
}
