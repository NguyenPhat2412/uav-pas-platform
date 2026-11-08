'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {queryKeys} from '@/lib/query';
import {fetchCollection} from '@/lib/api/collection';
import {API_ROUTES} from '@/lib/api/routes';
import type {CollectionModels as Models} from '@/types/resources';

const resources = {
    stations: [API_ROUTES.stations.list, 'STATION_VIEW'],
    uavs: [API_ROUTES.uavs.list, 'UAV_VIEW'],
    equipment: [API_ROUTES.inventory.equipment, 'INVENTORY_VIEW'],
    movements: [API_ROUTES.inventory.equipmentHistory, 'INVENTORY_VIEW'],
    media: [API_ROUTES.media.list, 'MEDIA_VIEW'],
    audit: [API_ROUTES.auditLogs.list, 'AUDIT_VIEW'],
    users: [API_ROUTES.users.list, 'USER_VIEW'],
    missions: [API_ROUTES.missions.list, 'MISSION_VIEW'],
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
