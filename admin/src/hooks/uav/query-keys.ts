import {queryKeys} from '@/lib/query';

type UserId = number | undefined;

export const telemetryKeys = {
    fleet: (userId: UserId) => queryKeys.of(userId, 'telemetry', 'fleet'),
    mission: (userId: UserId, missionId: number) => queryKeys.of(userId, 'telemetry', 'mission', missionId),
};

export const fleetMapKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'fleet-map'),
};
