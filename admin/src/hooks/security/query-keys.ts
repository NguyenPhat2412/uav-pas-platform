import {queryKeys} from '@/lib/query';
import type {SessionFilter} from '@/types/security/security.types';

type UserId = number | undefined;

export const securityKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'admin-security'),
    sessions: (userId: UserId, filter: SessionFilter) => queryKeys.of(userId, 'admin-security', 'sessions', filter),
    policy: (userId: UserId) => queryKeys.of(userId, 'admin-security', 'policy'),
    secrets: (userId: UserId) => queryKeys.of(userId, 'admin-security', 'secrets'),
};
