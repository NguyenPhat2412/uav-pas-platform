'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {dashboardService} from '@/features/dashboard/api/dashboard.api';
import {dashboardKeys} from '@/features/dashboard/hooks/query-keys';

export function useCustomerAnalytics() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: dashboardKeys.customerAnalytics(user?.id),
        queryFn: ({signal}) => dashboardService.getCustomerAnalytics(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
        staleTime: 60_000,
    });
}
