'use client';
import {useMutation, useQueries, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, QUIET, type MutationOptions} from '@/lib/query';
import {weatherService} from '@/api/weather/weather.api';
import {weatherKeys} from '@/hooks/weather/query-keys';
import type {ForecastQuery, WeatherProviderSettings, WeatherProviderUpdate} from '@/types/weather/weather.types';

/** Forecasts change slowly; the backend also caches them per grid cell. */
const WEATHER_STALE_MS = 5 * 60_000;

/**
 * Take-off assessment for a point and hour (e.g. while a mission is being planned); nothing is
 * requested until a location is known. Weather is advisory, so failures show inline, never as a toast.
 */
export function useForecastAssessment(query: ForecastQuery | null) {
    const {user} = useAuth();
    return useQuery({
        queryKey: query ? weatherKeys.forecast(user?.id, query) : weatherKeys.forecast(user?.id, {lat: 0, lng: 0}),
        queryFn: ({signal}) => weatherService.forecast(query!, signal),
        enabled: !!user && query != null,
        staleTime: WEATHER_STALE_MS,
        meta: QUIET,
    });
}

/**
 * Assessments for one point at several hours (undefined = now), e.g. the home-page weather strip.
 * Each hour is its own cached query, so the strip shares cache with the weather page.
 */
export function useForecastTimeline(point: { lat: number; lng: number }, times: readonly (string | undefined)[]) {
    return useForecastMany(times.map(at => ({lat: point.lat, lng: point.lng, at})));
}

/** Assessments for several points and hours at once (map markers, location lists), one cached query each. */
export function useForecastMany(queries: readonly ForecastQuery[]) {
    const {user} = useAuth();
    return useQueries({
        queries: queries.map(query => {
            return {
                queryKey: weatherKeys.forecast(user?.id, query),
                queryFn: ({signal}: { signal: AbortSignal }) => weatherService.forecast(query, signal),
                enabled: !!user,
                staleTime: WEATHER_STALE_MS,
                meta: QUIET,
            };
        }),
    });
}

/** Assessment at a mission's site and start time (now once it is due). */
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

/** Current conditions at every active ground station (STATION_READ), refreshed every 10 minutes. */
export function useStationsWeather(enabled = true) {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: weatherKeys.stations(user?.id),
        queryFn: ({signal}) => weatherService.stations(signal),
        enabled: enabled && permissionsReady && can('STATION_READ'),
        staleTime: WEATHER_STALE_MS,
        refetchInterval: 10 * 60_000,
        meta: QUIET,
    });
}

export function useWeatherProvider() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: weatherKeys.provider(user?.id),
        queryFn: ({signal}) => weatherService.providerSettings(signal),
        enabled: permissionsReady && can('PERMISSION_MANAGE'),
    });
}

/** Saves the provider settings; a new source or cache lifetime makes every cached assessment stale. */
export function useUpdateWeatherProvider(options?: MutationOptions<WeatherProviderSettings, WeatherProviderUpdate>) {
    const {user} = useAuth();
    const client = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (input: WeatherProviderUpdate) => weatherService.updateProvider(input),
        onSuccess: afterSuccess(options, saved => {
            client.setQueryData(weatherKeys.provider(user?.id), saved);
            void client.invalidateQueries({queryKey: weatherKeys.all(user?.id), predicate: q => q.queryKey[3] !== 'provider'});
        }),
    });
}
