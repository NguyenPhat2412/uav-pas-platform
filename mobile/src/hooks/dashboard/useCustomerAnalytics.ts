import {useQuery} from '@tanstack/react-query';
import {dashboardKeys} from '@/shared/hooks/dashboard/query-keys';
import {dashboardService} from '@/api/dashboard/dashboard.api';
import {useAuth} from '@/providers/AuthContext';

export function useCustomerAnalytics() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.customerAnalytics(user?.id),
        queryFn: ({signal}) => dashboardService.customerAnalytics(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
        staleTime: 60_000,
    });
}
