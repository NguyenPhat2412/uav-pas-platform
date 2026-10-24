import {QueryClient} from '@tanstack/react-query';

export const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export const sessionKey = (subject: string, ...parts: unknown[]) => ['session', subject, ...parts] as const;

/** Every Phase 1 cache belongs to the authenticated account. */
export const queryKeys = {
    feature: (userId: number | undefined, feature: string) => ['session', userId ?? 'anonymous', feature] as const,
    list: (userId: number | undefined, feature: string, page = 0) => [...queryKeys.feature(userId, feature), 'list', page] as const,
    detail: (userId: number | undefined, feature: string, id: number | undefined) => [...queryKeys.feature(userId, feature), 'detail', id] as const,
    history: (userId: number | undefined, feature: string, id?: number) => [...queryKeys.feature(userId, feature), 'history', id] as const,
};

export const uavQueryKeys = {
    session: (subject?: number | string) => ['session', String(subject ?? 'anonymous')] as const,
    domain: (subject?: number | string, feature?: string) => ['session', String(subject ?? 'anonymous'), String(feature ?? 'default')] as const,
    list: (subject?: number | string, feature?: string, filters?: unknown) => ['session', String(subject ?? 'anonymous'), String(feature ?? 'default'), 'list', filters] as const,
    detail: (subject?: number | string, feature?: string, id?: number | string) => ['session', String(subject ?? 'anonymous'), String(feature ?? 'default'), 'detail', id] as const,
    admin: {
        all: (subject?: number | string) => ['session', String(subject ?? 'anonymous'), 'admin'] as const,
        users: (subject?: number | string, page = 0, keyword = '', role?: string) => ['session', String(subject ?? 'anonymous'), 'admin', 'users', {
            page,
            keyword,
            role
        }] as const,
        user: (subject?: number | string, id?: number) => ['session', String(subject ?? 'anonymous'), 'admin', 'user', id] as const,
        dashboard: (subject?: number | string) => ['session', String(subject ?? 'anonymous'), 'admin', 'dashboard'] as const,
        audit: (subject?: number | string, page = 0) => ['session', String(subject ?? 'anonymous'), 'admin', 'audit', page] as const,
    },
    customer: {
        all: (subject?: number | string) => ['session', String(subject ?? 'anonymous'), 'customer'] as const,
        services: (subject?: number | string) => ['session', String(subject ?? 'anonymous'), 'customer', 'services'] as const,
        missions: (subject?: number | string, filters?: unknown) => ['session', String(subject ?? 'anonymous'), 'customer', 'missions', filters] as const,
        mission: (subject?: number | string, id?: number) => ['session', String(subject ?? 'anonymous'), 'customer', 'mission', id] as const,
    },
};

