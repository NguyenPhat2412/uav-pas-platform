import {queryKeys} from '@/lib/query';
import type {ForecastQuery} from '@/features/weather/types/weather.types';

type UserId = number | undefined;

/** Coordinates are rounded to ~100 m and the time to the hour, matching the backend cache cell. */
export const weatherKeys = {
    all: (userId: UserId) => queryKeys.of(userId, 'weather'),
    forecast: (userId: UserId, {lat, lng, at, serviceId}: ForecastQuery) =>
        queryKeys.of(userId, 'weather', 'forecast', Math.round(lat * 1000) / 1000, Math.round(lng * 1000) / 1000, at?.slice(0, 13) ?? 'now', serviceId ?? null),
    mission: (userId: UserId, missionId: number) => queryKeys.of(userId, 'weather', 'mission', missionId),
    stations: (userId: UserId) => queryKeys.of(userId, 'weather', 'stations'),
    provider: (userId: UserId) => queryKeys.of(userId, 'weather', 'provider'),
};
