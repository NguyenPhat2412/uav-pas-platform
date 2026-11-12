import type {MissionStatus} from '@/shared/types/mission/mission.types';

/** Filter chips of the mission list; each maps to the statuses it shows (empty = all). */
export const MISSION_FILTERS = {
    all: [],
    draft: ['DRAFT'],
    waiting: ['PENDING_CONFIRMATION'],
    scheduled: ['CONFIRMED', 'RESOURCE_RESERVED', 'READY'],
    active: ['IN_PROGRESS'],
    done: ['COMPLETED'],
    stopped: ['CANCELLED', 'REJECTED', 'FAILED'],
} as const satisfies Record<string, readonly MissionStatus[]>;

export type MissionFilter = keyof typeof MISSION_FILTERS;

export type StatusTone = 'neutral' | 'progress' | 'success' | 'danger' | 'warning';

/** Badge tone per status (slate for progress, red for stopped; the palette has no green). */
export function statusTone(status: MissionStatus): StatusTone {
    switch (status) {
        case 'DRAFT':
            return 'neutral';
        case 'PENDING_CONFIRMATION':
            return 'warning';
        case 'COMPLETED':
            return 'success';
        case 'CANCELLED':
        case 'REJECTED':
        case 'FAILED':
            return 'danger';
        default:
            return 'progress';
    }
}

/** The four-step progress bar of the web detail page: draft, waiting, scheduled/active, done. -1 when stopped. */
export function progressStep(status: MissionStatus): number {
    if (status === 'DRAFT') return 0;
    if (status === 'PENDING_CONFIRMATION') return 1;
    if (status === 'COMPLETED') return 3;
    if (status === 'CANCELLED' || status === 'REJECTED' || status === 'FAILED') return -1;
    return 2;
}

/** Same rule as the web detail page: a request can be withdrawn while it is a draft or waiting for confirmation. */
export const canCancel = (status: MissionStatus) => status === 'DRAFT' || status === 'PENDING_CONFIRMATION';
