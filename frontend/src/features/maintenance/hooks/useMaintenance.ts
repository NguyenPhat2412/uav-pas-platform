'use client';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {maintenanceService} from '@/features/maintenance/api/maintenance.api';
import {maintenanceKeys} from '@/features/maintenance/hooks/query-keys';
import {pageAfterRefresh} from '@/features/maintenance/utils/workflows';

interface ListFilters {
    uavId: string;
    dueStatus: string;
    status: string;
    schedulePage: number;
    orderPage: number;
    /** Called after a refresh with the page each list should show (a write can empty the current page). */
    onPages: (pages: { schedulePage?: (current: number) => number; orderPage?: (current: number) => number }) => void;
}

/** Schedule and repair-order pages (UAV_MANAGE), plus `refresh` for after a write; it resolves false when a reload failed. */
export function useMaintenanceLists({uavId, dueStatus, status, schedulePage, orderPage, onPages}: ListFilters) {
    const {user, can} = useAuth();
    const client = useQueryClient();
    const schedules = useQuery({
        queryKey: maintenanceKeys.schedules(user?.id, uavId, dueStatus, schedulePage),
        queryFn: ({signal}) => maintenanceService.schedules(schedulePage, uavId, dueStatus, signal),
        enabled: can('UAV_MANAGE'),
    });
    const orders = useQuery({
        queryKey: maintenanceKeys.orders(user?.id, uavId, status, orderPage),
        queryFn: ({signal}) => maintenanceService.orders(orderPage, uavId, status, signal),
        enabled: can('UAV_MANAGE'),
    });
    const refresh = async () => {
        // A write can remove a row from a filtered page. Mark every cached list page stale
        // before moving to a remaining page, so its count and rows reload too.
        await Promise.all([maintenanceKeys.schedules(user?.id), maintenanceKeys.orders(user?.id)]
            .map(queryKey => client.invalidateQueries({queryKey, refetchType: 'none'})));
        const results = await Promise.all([schedules.refetch(), orders.refetch()]);
        const schedulePages = results[0].data?.totalPages, orderPages = results[1].data?.totalPages;
        onPages({
            schedulePage: !results[0].isError && schedulePages !== undefined ? current => pageAfterRefresh(current, schedulePages) : undefined,
            orderPage: !results[1].isError && orderPages !== undefined ? current => pageAfterRefresh(current, orderPages) : undefined,
        });
        await client.invalidateQueries({predicate: query => Array.isArray(query.queryKey) && (query.queryKey.includes('uavs') || query.queryKey.includes('audit') || query.queryKey.includes('dashboard'))});
        return results.every(result => !result.isError);
    };
    return {schedules, orders, refresh};
}

export function useMaintenanceOrder(id: number) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: maintenanceKeys.order(user?.id, id),
        queryFn: ({signal}) => maintenanceService.order(id, signal),
        enabled: can('UAV_MANAGE'),
        refetchOnWindowFocus: false
    });
}
