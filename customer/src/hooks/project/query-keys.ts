import {queryKeys} from '@/lib/query';
import type {OrderStatusGroup} from '@/types/project/project.types';

export const projectKeys = {
    all: (userId?: number | null) => queryKeys.feature(userId, 'projects'),
    list: (userId: number | null | undefined, page = 0, search = '') =>
        [...queryKeys.feature(userId, 'projects'), 'list', {page, search}] as const,
    detail: (userId: number | null | undefined, projectId: number) =>
        [...queryKeys.feature(userId, 'projects'), 'detail', projectId] as const,
    subscriptions: (userId: number | null | undefined, projectId: number, page = 0) =>
        [...queryKeys.feature(userId, 'projects'), 'subscriptions', projectId, {page}] as const,
    orderSummary: (userId?: number | null) =>
        [...queryKeys.feature(userId, 'orders'), 'summary'] as const,
    orderTracking: (userId: number | null | undefined, missionId: number) =>
        [...queryKeys.feature(userId, 'orders'), 'tracking', missionId] as const,
    orderGroup: (userId: number | null | undefined, group?: OrderStatusGroup | '') =>
        [...queryKeys.feature(userId, 'orders'), 'group', group || 'ALL'] as const,
};
