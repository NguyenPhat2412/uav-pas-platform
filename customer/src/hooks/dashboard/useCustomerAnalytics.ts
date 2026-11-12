'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {dashboardService} from '@/api/dashboard/dashboard.api';
import {dashboardKeys} from '@/hooks/dashboard/query-keys';

export function useCustomerAnalytics() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.customerAnalytics(user?.id),
        queryFn: ({signal}) => dashboardService.getCustomerAnalytics(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
        staleTime: 60_000,
    });
}
