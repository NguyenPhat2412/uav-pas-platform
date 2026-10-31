'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {uavsService} from '@/api/uav/uavs.api';
import {useOperationMutation} from '@/hooks/useOperationMutation';

export function useUavs(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'uavs', page),
        queryFn: ({signal}) => uavsService.listUavs(page, 20, signal),
        enabled: can('UAV_READ')
    });
}

export function useUav(id?: number) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.detail(user?.id, 'uavs', id),
        queryFn: ({signal}) => uavsService.uav(id!, signal),
        enabled: !!id && can('UAV_READ')
    });
}

export function useUavHistory(id?: number, page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: [...queryKeys.history(user?.id, 'uavs', id), page],
        queryFn: ({signal}) => uavsService.uavHistory(id!, page, signal),
        enabled: !!id && can('UAV_READ')
    });
}

/** Fleet writes refresh the UAV lists, the dashboard counts and the audit trail. */
export function useUavMutations() {
    return {
        create: useOperationMutation(uavsService.createUav, ['uavs', 'dashboard', 'audit']),
        maintenance: useOperationMutation(uavsService.maintenanceUav, ['uavs', 'dashboard', 'audit']),
        recover: useOperationMutation(uavsService.completeUavMaintenance, ['uavs', 'dashboard', 'audit']),
        assign: useOperationMutation(({id, stationId}: { id: number; stationId: number }) => uavsService.assignUav(id, stationId), ['uavs', 'audit']),
    };
}
