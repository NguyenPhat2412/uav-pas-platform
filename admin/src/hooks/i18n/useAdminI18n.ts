'use client';

import {keepPreviousData, useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {adminI18nService} from '@/api/i18n/i18n.api';
import {useAuth} from '@/providers/AuthContext';
import {notifyI18nCatalogUpdated} from '@/providers/I18nContext';
import type {UpsertUiTranslationPayload} from '@/types/i18n/i18n.types';

export function useAdminTranslations(params: {namespace?: string; keyword?: string; page?: number; size?: number}) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-i18n', 'list', params],
        queryFn: ({signal}) => adminI18nService.list(params, signal),
        placeholderData: keepPreviousData,
        enabled: permissionsReady && can('USER_MANAGE'),
    });
}

export function useAdminI18nNamespaces() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'admin-i18n', 'namespaces'],
        queryFn: ({signal}) => adminI18nService.namespaces(signal),
        enabled: permissionsReady && can('USER_MANAGE'),
    });
}

export function useAdminI18nMutations() {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const invalidate = async () => {
        notifyI18nCatalogUpdated();
        await queryClient.invalidateQueries({
            queryKey: ['session', user?.id ?? 'anonymous', 'admin-i18n'],
        });
    };

    const upsert = useMutation({
        mutationFn: (payload: UpsertUiTranslationPayload) => adminI18nService.upsert(payload),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: number) => adminI18nService.deleteById(id),
        onSuccess: invalidate,
    });

    return {upsert, remove};
}
