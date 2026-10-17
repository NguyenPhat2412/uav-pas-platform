'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { accessService } from '../services/access.service';

export function useAccessControl(userId?: number, enabled = true, page = 0, keyword = '') {
  const client = useQueryClient();
  const { user } = useAuth();
  const scope = user?.id;
  const users = useQuery({ queryKey: [...queryKeys.feature(scope, 'access'), 'users', page, keyword], queryFn: ({ signal }) => accessService.users(page, keyword, signal), enabled });
  const permissions = useQuery({ queryKey: [...queryKeys.feature(scope, 'access'), 'permissions'], queryFn: ({ signal }) => accessService.permissions(signal), enabled });
  const templates = useQuery({ queryKey: [...queryKeys.feature(scope, 'access'), 'templates'], queryFn: ({ signal }) => accessService.templates(signal), enabled });
  const overrides = useQuery({ queryKey: [...queryKeys.feature(scope, 'access'), 'user-permissions', userId], queryFn: ({ signal }) => accessService.userPermissions(userId!, signal), enabled: enabled && !!userId });
  const invalidate = (_result: void, input: { userId: number }) => Promise.all([
    client.invalidateQueries({ queryKey: [...queryKeys.feature(scope, 'access'), 'user-permissions', input.userId] }),
    client.invalidateQueries({ queryKey: ['session', input.userId, 'permissions'] }),
    client.invalidateQueries({ queryKey: queryKeys.feature(scope, 'audit') }),
    client.invalidateQueries({ queryKey: queryKeys.feature(scope, 'dashboard') }),
  ]);
  const setPermission = useMutation({ mutationFn: ({ userId, code, granted }: { userId: number; code: string; granted: boolean }) => accessService.setUserPermission(userId, code, granted), onSuccess: invalidate });
  const resetPermission = useMutation({ mutationFn: ({ userId, code }: { userId: number; code: string }) => accessService.resetUserPermission(userId, code), onSuccess: invalidate });
  return { users, permissions, templates, overrides, setPermission, resetPermission };
}
