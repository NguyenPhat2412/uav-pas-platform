'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {queryKeys} from '@/lib/query';
import {operationsService as service} from "@/lib/api/resources";

export function useStations(page = 0, size = 20) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: [...queryKeys.list(user?.id, 'stations', page), size],
        queryFn: ({signal}) => service.listStations(page, size, signal),
        enabled: can('STATION_READ')
    });
}

export function useStation(id?: number) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.detail(user?.id, 'stations', id),
        queryFn: ({signal}) => service.station(id!, signal),
        enabled: !!id && can('STATION_READ')
    });
}

export function useUavs(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'uavs', page),
        queryFn: ({signal}) => service.listUavs(page, 20, signal),
        enabled: can('UAV_READ')
    });
}

export function useUav(id?: number) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.detail(user?.id, 'uavs', id),
        queryFn: ({signal}) => service.uav(id!, signal),
        enabled: !!id && can('UAV_READ')
    });
}

export function useUavHistory(id?: number, page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: [...queryKeys.history(user?.id, 'uavs', id), page],
        queryFn: ({signal}) => service.uavHistory(id!, page, signal),
        enabled: !!id && can('UAV_READ')
    });
}

export function useEquipment(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'equipment', page),
        queryFn: ({signal}) => service.listEquipment(page, 20, signal),
        enabled: can('INVENTORY_READ')
    });
}

export function useInventoryHistory(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: [...queryKeys.history(user?.id, 'equipment'), page],
        queryFn: ({signal}) => service.inventoryHistory(page, signal),
        enabled: can('INVENTORY_READ')
    });
}

export function useMedia(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'media', page),
        queryFn: ({signal}) => service.listMedia(page, signal),
        enabled: can('MEDIA_READ')
    });
}

export function useAudit(page = 0) {
    const {user, can} = useAuth();
    return useQuery({
        queryKey: queryKeys.list(user?.id, 'audit', page),
        queryFn: ({signal}) => service.listAudit(page, signal),
        enabled: can('AUDIT_READ')
    });
}

export function useOperationMutation<TInput, TResult>(action: (input: TInput) => Promise<TResult>, affected: string[]) {
    const client = useQueryClient();
    const {user} = useAuth();
    return useMutation({
        mutationFn: action, onSuccess: async () => {
            await Promise.all(affected.map(feature => client.invalidateQueries({queryKey: queryKeys.feature(user?.id, feature)})));
        }
    });
}
