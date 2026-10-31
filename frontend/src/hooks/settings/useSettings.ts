'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {QUIET} from '@/lib/query';
import {platformSettingsService} from '@/api/settings/platform-settings.api';
import {systemHealthService} from '@/api/settings/system-health.api';
import {settingsKeys} from '@/hooks/settings/query-keys';

/** Every platform setting with the validation rule the server applies on save. */
export function usePlatformSettings() {
    const {user} = useAuth();
    return useQuery({
        queryKey: settingsKeys.all(user?.id),
        queryFn: ({signal}) => platformSettingsService.list(signal),
    });
}

export function useSettingHistory(configKey: string) {
    const {user} = useAuth();
    return useQuery({
        queryKey: settingsKeys.history(user?.id, configKey),
        queryFn: ({signal}) => platformSettingsService.history(configKey, signal),
    });
}

/**
 * Saves one setting per call (the caller orders a batch and reports each failure itself, so no toast);
 * `refresh` reloads the list once the batch is done.
 */
export function useSaveSetting() {
    const client = useQueryClient();
    const {user} = useAuth();
    const save = useMutation({
        mutationFn: ({key, value}: { key: string; value: string }) => platformSettingsService.update(key, value),
        meta: QUIET,
    });
    const refresh = () => client.invalidateQueries({queryKey: settingsKeys.all(user?.id)});
    return {save, refresh};
}

/** Service health, refreshed every 30 s (PERMISSION_MANAGE). */
export function useSystemHealth() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: settingsKeys.systemHealth(user?.id),
        queryFn: ({signal}) => systemHealthService.get(signal),
        enabled: permissionsReady && can('PERMISSION_MANAGE'),
        refetchInterval: 30_000,
    });
}
