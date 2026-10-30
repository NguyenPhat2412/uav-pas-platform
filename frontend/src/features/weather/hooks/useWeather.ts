'use client';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/providers/AuthContext';
import {afterSuccess, QUIET, type MutationOptions} from '@/lib/query';
import {weatherService} from '@/features/weather/api/weather.api';
import {weatherKeys} from '@/features/weather/hooks/query-keys';
import type {ForecastQuery, WeatherProviderSettings, WeatherProviderUpdate} from '@/features/weather/types/weather.types';

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
export function useStationsWeather() {
    const {user, can, permissionsReady} = useAuth();
    return useQuery({
        queryKey: weatherKeys.stations(user?.id),
        queryFn: ({signal}) => weatherService.stations(signal),
        enabled: permissionsReady && can('STATION_READ'),
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
