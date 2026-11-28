import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

/** Shared by every cockpit widget so a verify in one view refreshes the others. */
export const sarKeys = {
    missions: (userId: UserId) => queryKeys.of(userId, 'sar', 'missions'),
    detections: (userId: UserId, missionId: number) => queryKeys.of(userId, 'sar', 'detections', missionId),
    tasks: (userId: UserId, missionId: number) => queryKeys.of(userId, 'sar', 'tasks', missionId),
};
