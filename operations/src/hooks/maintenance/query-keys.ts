import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const maintenanceKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'maintenance'),
    schedules: (userId: UserId, ...filters: unknown[]) => queryKeys.of(userId, 'maintenance', 'schedules', ...filters),
    orders: (userId: UserId, ...filters: unknown[]) => queryKeys.of(userId, 'maintenance', 'orders', ...filters),
    order: (userId: UserId, id: number) => queryKeys.of(userId, 'maintenance', 'order', id),
};
