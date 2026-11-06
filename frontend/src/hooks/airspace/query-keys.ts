import {queryKeys} from '@/lib/query';
import type {AirspaceCheckInput} from '@/types/airspace/airspace.types';

type UserId = number | undefined;

export const airspaceKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'airspace'),
    zones: (userId: UserId, activeOnly: boolean) => queryKeys.of(userId, 'airspace', 'zones', activeOnly),
    check: (userId: UserId, input: AirspaceCheckInput | null) =>
        queryKeys.of(
            userId,
            'airspace',
            'check',
            input?.areaType ?? 'NONE',
            input?.takeoffLatitude ?? null,
            input?.takeoffLongitude ?? null,
            input?.radiusMeters ?? null,
            input?.altitudeAglMeters ?? null,
            input?.vertices ?? null,
        ),
};
