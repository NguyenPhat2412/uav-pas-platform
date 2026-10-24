'use client';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/contexts/AuthContext';
import {queryKeys} from '@/lib/query';
import {fetchCollection} from '@/lib/api/collection';
import type {AuditLog, Equipment, InventoryMovement, MediaAsset, Station, Uav} from "@/types/resources";
import type {User} from '@/features/access/types/access.types';
import type {Mission} from '@/features/missions/types/mission.types';

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
type Models = {
    stations: Station;
    uavs: Uav;
    equipment: Equipment;
    movements: InventoryMovement;
    media: MediaAsset;
    audit: AuditLog;
    users: User;
    missions: Mission
};

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
