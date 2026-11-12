import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {
    ForecastQuery,
    StationWeatherSummary,
    WeatherAssessment,
    WeatherProviderSettings,
    WeatherProviderUpdate,
} from '@/shared/types/weather/weather.types';

/** Flight-safety weather from the backend (Open-Meteo wind at 10/80/120 m, NOAA Kp), cached server-side. */
export const weatherService = {
    /** Evaluates multi-altitude wind, gusts, visibility, and geomagnetic Kp for a coordinate and time. */
    forecast: ({lat, lng, at, serviceId}: ForecastQuery, signal?: AbortSignal) =>
        apiClient.get<WeatherAssessment>(`${API_ROUTES.weather.forecast}?${buildQueryString({lat, lng, at, serviceId})}`, {signal}),

    /** Evaluates flight-safety weather for a specific mission's takeoff location and window. */
    forMission: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<WeatherAssessment>(API_ROUTES.weather.byMission(missionId), {signal}),

    /** Fetches current weather assessments across all active ground stations. */
    stations: (signal?: AbortSignal) =>
        apiClient.get<StationWeatherSummary[]>(API_ROUTES.weather.stations, {signal}),

    /** Reads the active weather provider configuration and cache policy. */
    providerSettings: (signal?: AbortSignal) =>
        apiClient.get<WeatherProviderSettings>(API_ROUTES.weather.adminProvider, {signal}),

    /** Updates the upstream weather provider, API key, and preflight enforcement settings. */
    updateProvider: (input: WeatherProviderUpdate) =>
        apiClient.put<WeatherProviderSettings>(API_ROUTES.weather.adminProvider, input),
};
