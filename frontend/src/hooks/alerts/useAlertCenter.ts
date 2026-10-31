'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {alertsService} from '@/api/alerts/alerts.api';
import {alertKeys} from '@/hooks/alerts/query-keys';

/** Current platform alerts (GET /api/v1/admin/alerts), refreshed every minute for accounts with DASHBOARD_READ. */
export function useAlertCenter() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: alertKeys.center(user?.id),
        queryFn: ({signal}) => alertsService.current(signal),
        enabled: permissionsReady && can('DASHBOARD_READ'),
        refetchInterval: 60_000,
    });
}
