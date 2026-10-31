'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {adminDashboardService} from '@/api/dashboard/admin-dashboard.api';
import {dashboardKeys} from '@/hooks/dashboard/query-keys';

export function useAdminDashboardSummary() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.adminSummary(user?.id),
        queryFn: ({signal}) => adminDashboardService.dashboard(signal),
        enabled: permissionsReady && can('DASHBOARD_READ')
    });
}

export function useAdminAnalytics(days: number) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.adminAnalytics(user?.id, days),
        queryFn: ({signal}) => adminDashboardService.analytics(days, signal),
        enabled: permissionsReady && can('DASHBOARD_READ'),
        staleTime: 60_000
    });
}

/** Missions waiting for a dispatcher's confirmation (MISSION_VIEW_ALL). */
export function useAdminPendingMissions() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.pendingMissions(user?.id),
        queryFn: ({signal}) => adminDashboardService.pendingMissions(signal),
        enabled: permissionsReady && can('MISSION_VIEW_ALL'),
    });
}
