'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {queryKeys} from '@/lib/query';
import {fetchCollection} from '@/lib/api/collection';
import {operationsService as service} from '@/lib/api/resources';
import {missionService} from '@/lib/api/missions';
import type {CollectionModels as Models} from '@/types/resources';
import type {MissionStatus} from '@/features/missions/types/mission.types';

const resources = {
    stations: ['/api/v1/stations', 'STATION_READ'],
    uavs: ['/api/v1/uavs', 'UAV_READ'],
    equipment: ['/api/v1/inventory/equipment', 'INVENTORY_READ'],
    movements: ['/api/v1/inventory/equipment/history', 'INVENTORY_READ'],
    media: ['/api/v1/media', 'MEDIA_READ'],
    audit: ['/api/v1/audit-logs', 'AUDIT_READ'],
    users: ['/api/v1/users', 'USER_READ'],
    missions: ['/api/v1/missions', 'MISSION_VIEW'],
} as const;

export function useCollection<K extends keyof Models>(feature: K, enabled = true) {
    const {user, can} = useAuth();
    const [path, permission] = resources[feature];
    return useQuery({
        queryKey: [...queryKeys.feature(user?.id, feature === 'movements' ? 'equipment' : feature), 'collection'],
        queryFn: ({signal}) => fetchCollection<Models[K]>(path, signal),
        enabled: enabled && can(permission),
        staleTime: 30_000,
        retry: false
    });
}

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

export function useMissions(filters?: { status?: MissionStatus; search?: string }) {
    const query = useQuery({
        queryKey: ['missions', 'list', filters ?? {}],
        queryFn: () => missionService.list(filters),
    });
    return {
        missions: query.data?.content ?? [],
        isLoading: query.isLoading,
        error: query.error instanceof Error ? query.error.message : null,
        reload: query.refetch
    };
}

export const useOperationsMissions = useMissions;

export function useMissionMutations() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({queryKey: ['missions']});
    const submit = useMutation({mutationFn: (id: number) => missionService.submit(id), onSuccess: invalidate});
    const cancel = useMutation({mutationFn: (id: number) => missionService.cancel(id), onSuccess: invalidate});
    const confirm = useMutation({mutationFn: (id: number) => missionService.confirm(id), onSuccess: invalidate});
    const reject = useMutation({
        mutationFn: ({id, reason}: {
            id: number;
            reason: string
        }) => missionService.reject(id, reason), onSuccess: invalidate
    });
    const ready = useMutation({mutationFn: (id: number) => missionService.ready(id), onSuccess: invalidate});
    const start = useMutation({mutationFn: (id: number) => missionService.start(id), onSuccess: invalidate});
    const complete = useMutation({
        mutationFn: ({id, note, condition}: {
            id: number;
            note: string;
            condition?: string
        }) => missionService.complete(id, note, condition), onSuccess: invalidate
    });
    const fail = useMutation({
        mutationFn: ({id, reason, notes}: {
            id: number;
            reason: string;
            notes?: string
        }) => missionService.fail(id, reason, notes), onSuccess: invalidate
    });
    return {submit, cancel, confirm, reject, ready, start, complete, fail};
}
