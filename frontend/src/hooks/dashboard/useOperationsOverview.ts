'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {QUIET} from '@/lib/query';
import {dashboardService} from '@/api/dashboard/dashboard.api';
import {missionService} from '@/api/mission/missions.api';
import {dashboardKeys} from '@/hooks/dashboard/query-keys';

/**
 * Resource summary (DASHBOARD_READ) and mission board (DASHBOARD_MISSION) for the operations overview.
 * Either may fail alone; the page shows a partial-data notice instead of an error toast.
 */
export function useOperationsOverview() {
    const {user, can, permissionsReady} = useAuth();
    const summary = useQuery({
        queryKey: dashboardKeys.operationsSummary(user?.id),
        queryFn: () => dashboardService.getSummary(),
        enabled: permissionsReady && can('DASHBOARD_READ'),
        meta: QUIET,
    });
    const missions = useQuery({
        queryKey: dashboardKeys.missionBoard(user?.id),
        queryFn: () => missionService.dashboard(),
        enabled: permissionsReady && can('DASHBOARD_MISSION'),
        meta: QUIET,
    });
    return {
        summary: summary.data ?? null,
        missions: missions.data ?? null,
        error: summary.isError || missions.isError,
    };
}
