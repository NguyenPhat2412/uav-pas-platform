'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {useCustomerScope} from '@/lib/query/customer';
import {dashboardService} from '@/lib/api/services';
import {notificationsService} from '@/lib/api/services';

const REFRESH_MS = 60_000;

/**
 * Badge counts for the customer sidebar. Query keys match the dashboard analytics and notification hooks,
 * so the sidebar reuses their cached responses instead of issuing extra requests.
 */
export function useSidebarCounts() {
    const {user} = useAuth();
    const {key, can, permissionsReady} = useCustomerScope();
    const analytics = useQuery({
        queryKey: [...key, 'analytics'],
        queryFn: ({signal}) => dashboardService.getCustomerAnalytics(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
        staleTime: REFRESH_MS,
        refetchInterval: REFRESH_MS,
        retry: false,
    });
    const unread = useQuery({
        queryKey: ['session', user?.id ?? 'anonymous', 'notifications', 'unread'],
        queryFn: ({signal}) => notificationsService.unreadCount(signal),
        enabled: !!user,
        refetchInterval: REFRESH_MS,
        retry: false,
    });
    const pipeline = analytics.data?.pipeline;
    return {
        // Requests the customer is waiting on: awaiting confirmation, scheduled or flying (drafts excluded).
        activeMissions: pipeline ? pipeline.waiting + pipeline.scheduled + pipeline.active : 0,
        pendingInvoices: analytics.data?.pendingInvoices.count ?? 0,
        unreadNotifications: unread.data?.unreadCount ?? 0,
    };
}
