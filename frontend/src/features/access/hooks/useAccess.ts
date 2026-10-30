'use client';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {queryKeys} from '@/lib/query';
import {accessService} from '@/features/access/api/access.api';
import {saveChanges, type Change} from '@/features/access/utils/permission-model';
import {useAdminInvalidation} from '@/features/users/hooks/useAdminUsers';
import type {RoleTemplate, User} from '@/types/admin';

/** A user's explicit allow/deny overrides; 'admin-user-permissions' is what user administration invalidates. */
export function useUserPermissionOverrides(userId: number) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.of(user?.id, 'admin-user-permissions', userId),
        queryFn: ({signal}) => accessService.userPermissions(userId, signal),
        enabled: can('PERMISSION_MANAGE')
    });
}

/**
 * Writes a batch of permission changes for one user (override or inherit) or one role template, keeping
 * partial outcomes; `reload` refreshes the affected caches after a save or to discard a stale draft.
 */
export function usePermissionChanges({target, template}: { target?: User; template?: RoleTemplate }) {
    const {t} = useI18n();
    const invalidate = useAdminInvalidation();
    const save = useMutation({
        mutationFn: (changes: Change[]) => saveChanges(changes, ({code, value}) => target
            ? (value === null ? accessService.clearUserPermission(target.id, code) : accessService.setUserPermission(target.id, code, value))
            : accessService.setRolePermission(template!.role, code, value === true), t),
    });
    const reload = useMutation({mutationFn: () => invalidate(target?.id, !target)});
    return {save, reload, invalidate: () => invalidate(target?.id, !target)};
}
