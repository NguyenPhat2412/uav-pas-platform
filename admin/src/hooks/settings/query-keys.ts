import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const settingsKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'platform-settings'),
    history: (userId: UserId, configKey: string) => queryKeys.of(userId, 'platform-settings', 'history', configKey),
    systemHealth: (userId: UserId) => queryKeys.of(userId, 'system-health'),
};
