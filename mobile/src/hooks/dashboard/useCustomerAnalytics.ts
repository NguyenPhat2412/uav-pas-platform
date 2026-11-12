import {useQuery} from '@tanstack/react-query';
import {dashboardKeys} from '@/shared/hooks/dashboard/query-keys';
import {QUIET} from '@/shared/lib/query';
import {dashboardService} from '@/api/dashboard/dashboard.api';
import {useAuth} from '@/providers/AuthContext';

/**
 * Fetches monthly customer KPIs, quota consumption, spend breakdown, and upcoming missions.
 */
export function useCustomerAnalytics() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.customerAnalytics(user?.id),
        queryFn: ({signal}) => dashboardService.customerAnalytics(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
        staleTime: 60_000,
    });
}

/**
 * Fetches high-level platform resource counters for the operations overview dashboard.
 */
export function useDashboardSummary() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.operationsSummary(user?.id),
        queryFn: ({signal}) => dashboardService.summary(signal),
        enabled: permissionsReady && can('DASHBOARD_VIEW'),
        staleTime: 60_000,
        meta: QUIET,
    });
}
