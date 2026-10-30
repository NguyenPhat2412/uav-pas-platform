import {apiClient, API_ROUTES} from '@/lib/api';
import {buildQueryString} from '@/lib/format';
import type {
    ForecastQuery,
    StationWeatherSummary,
    WeatherAssessment,
    WeatherProviderSettings,
    WeatherProviderUpdate,
} from '@/features/weather/types/weather.types';

/** Flight-safety weather from the backend (Open-Meteo wind at 10/80/120 m, NOAA Kp), cached server-side. */
export const weatherService = {
    forecast: ({lat, lng, at, serviceId}: ForecastQuery, signal?: AbortSignal) =>
        apiClient.get<WeatherAssessment>(`${API_ROUTES.weather.forecast}?${buildQueryString({lat, lng, at, serviceId})}`, {signal}),
    forMission: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<WeatherAssessment>(API_ROUTES.weather.byMission(missionId), {signal}),
    stations: (signal?: AbortSignal) =>
        apiClient.get<StationWeatherSummary[]>(API_ROUTES.weather.stations, {signal}),
    providerSettings: (signal?: AbortSignal) =>
        apiClient.get<WeatherProviderSettings>(API_ROUTES.weather.adminProvider, {signal}),
    updateProvider: (input: WeatherProviderUpdate) =>
        apiClient.put<WeatherProviderSettings>(API_ROUTES.weather.adminProvider, input),
};
