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
        enabled: permissionsReady && can('DASHBOARD_VIEW')
    });
}

export function useAdminAnalytics(days: number) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.adminAnalytics(user?.id, days),
        queryFn: ({signal}) => adminDashboardService.analytics(days, signal),
        enabled: permissionsReady && can('DASHBOARD_VIEW'),
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

/** Payment, revenue and spending figures for the inclusive day range (USER_MANAGE). */
export function useAdminPaymentStatistics(from: string, to: string) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.paymentStatistics(user?.id, from, to),
        queryFn: ({signal}) => adminDashboardService.paymentStatistics(from, to, signal),
        enabled: permissionsReady && can('USER_MANAGE'),
        staleTime: 60_000,
    });
}
