import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const alertKeys = {
    center: (userId: UserId) => queryKeys.of(userId, 'admin-alert-center'),
};
