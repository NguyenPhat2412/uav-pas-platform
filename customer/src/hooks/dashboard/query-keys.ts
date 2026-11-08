import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const dashboardKeys = {
    /** 'admin-dashboard' is also what user administration invalidates after account changes. */
    adminSummary: (userId: UserId) => queryKeys.of(userId, 'admin-dashboard'),
    adminAnalytics: (userId: UserId, days: number) => queryKeys.of(userId, 'admin-dashboard', 'analytics', days),
    pendingMissions: (userId: UserId) => queryKeys.of(userId, 'admin-pending-missions'),
    operationsSummary: (userId: UserId) => queryKeys.of(userId, 'dashboard', 'summary'),
    missionBoard: (userId: UserId) => queryKeys.of(userId, 'dashboard', 'missions'),
    customerAnalytics: (userId: UserId) => queryKeys.of(userId, 'customer', 'analytics'),
};
