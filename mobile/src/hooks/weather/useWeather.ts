import {useQueries, useQuery} from '@tanstack/react-query';
import {weatherKeys} from '@/shared/hooks/weather/query-keys';
import {QUIET} from '@/shared/lib/query';
import {weatherService} from '@/api/weather/weather.api';
import {useAuth} from '@/providers/AuthContext';
import type {ForecastQuery} from '@/shared/types/weather/weather.types';

/** Forecasts change slowly; the backend also caches them per grid cell. */
const WEATHER_STALE_MS = 5 * 60_000;

/** Assessments for one point at several hours (undefined = now), one cached query each, as on the web. */
export function useForecastTimeline(point: { lat: number; lng: number } | null, times: readonly (string | undefined)[]) {
    const {user} = useAuth();
    return useQueries({
        queries: times.map(at => {
            const query: ForecastQuery = {lat: point?.lat ?? 0, lng: point?.lng ?? 0, at};
            return {
                queryKey: weatherKeys.forecast(user?.id, query),
                queryFn: ({signal}: { signal: AbortSignal }) => weatherService.forecast(query, signal),
                enabled: !!user && point !== null,
                staleTime: WEATHER_STALE_MS,
                meta: QUIET,
            };
        }),
    });
}

export function usePointForecast(
    point: { lat: number; lng: number } | null,
    at?: string,
    serviceId?: number,
) {
    const {user} = useAuth();
    const query: ForecastQuery = {lat: point?.lat ?? 0, lng: point?.lng ?? 0, at, serviceId};
    return useQuery({
        queryKey: weatherKeys.forecast(user?.id, query),
        queryFn: ({signal}) => weatherService.forecast(query, signal),
        enabled: !!user && point !== null,
        staleTime: WEATHER_STALE_MS,
        meta: QUIET,
    });
}

export function useMissionWeather(missionId: number | undefined, enabled = true) {
    const {user} = useAuth();
    return useQuery({
        queryKey: weatherKeys.mission(user?.id, missionId ?? 0),
        queryFn: ({signal}) => weatherService.forMission(missionId!, signal),
        enabled: enabled && !!user && missionId != null,
        staleTime: WEATHER_STALE_MS,
        meta: QUIET,
    });
}
