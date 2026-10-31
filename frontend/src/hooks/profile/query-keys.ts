import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

/** The signed-in account's own data; the same cache serves every portal. */
export const profileKeys = {
    own: (userId: UserId) => queryKeys.of(userId, 'profile'),
    billing: (userId: UserId) => queryKeys.of(userId, 'profile', 'billing'),
    twoFactor: (userId: UserId) => queryKeys.of(userId, 'profile', '2fa-status'),
};
