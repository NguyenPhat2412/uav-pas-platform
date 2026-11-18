import type {Mission} from '@/shared/types/mission/mission.types';
import type {OrderStatusGroup} from '@/shared/types/project/project.types';

export const ORDER_STATUS_GROUPS: readonly OrderStatusGroup[] = [
    'PENDING',
    'SCHEDULED',
    'IN_FLIGHT',
    'DELIVERED',
    'TO_REVIEW',
];

/**
 * Maps a Mission record to one of the 5 Shopee-style customer order status groups
 * per docs/overnight/CONTRACT.md §1 (honoring `mission.statusGroup` when returned by S0).
 */
export function resolveOrderStatusGroup(
    mission: Pick<Mission, 'status'> & { statusGroup?: OrderStatusGroup | null; reviewed?: boolean | null },
): OrderStatusGroup | null {
    if (mission.statusGroup) return mission.statusGroup;
    const raw = String(mission.status);
    if (
        raw === 'PENDING_CONFIRMATION' ||
        raw === 'SUBMITTED' ||
        raw === 'PENDING_DISPATCH' ||
        raw === 'PENDING_PROVIDER'
    ) {
        return 'PENDING';
    }
    if (
        raw === 'CONFIRMED' ||
        raw === 'RESOURCE_RESERVED' ||
        raw === 'READY' ||
        raw === 'ACCEPTED' ||
        raw === 'SCHEDULED'
    ) {
        return 'SCHEDULED';
    }
    if (raw === 'IN_PROGRESS' || raw === 'IN_FLIGHT') {
        return 'IN_FLIGHT';
    }
    if (raw === 'COMPLETED' || raw === 'DELIVERED') {
        return mission.reviewed === false ? 'TO_REVIEW' : 'DELIVERED';
    }
    return null;
}

export function matchesOrderStatusGroup(
    mission: Pick<Mission, 'status'> & { statusGroup?: OrderStatusGroup | null; reviewed?: boolean | null },
    group: OrderStatusGroup | 'ALL',
): boolean {
    if (group === 'ALL') return true;
    const raw = String(mission.status);
    if (group === 'TO_REVIEW') {
        return (
            mission.statusGroup === 'TO_REVIEW' ||
            ((raw === 'COMPLETED' || raw === 'DELIVERED') && mission.reviewed !== true)
        );
    }
    if (group === 'DELIVERED') {
        return mission.statusGroup === 'DELIVERED' || raw === 'COMPLETED' || raw === 'DELIVERED';
    }
    return resolveOrderStatusGroup(mission) === group;
}
