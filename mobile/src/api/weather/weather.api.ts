import {apiClient, API_ROUTES} from '@/lib/api/client';
import {buildQueryString} from '@/shared/lib/format';
import type {ForecastQuery, WeatherAssessment} from '@/shared/types/weather/weather.types';

/** Flight-safety weather from the backend (Open-Meteo wind at 10/80/120 m, NOAA Kp), cached server-side. */
export const weatherService = {
    forecast: ({lat, lng, at, serviceId}: ForecastQuery, signal?: AbortSignal) =>
        apiClient.get<WeatherAssessment>(`${API_ROUTES.weather.forecast}?${buildQueryString({lat, lng, at, serviceId})}`, {signal}),
    forMission: (missionId: number, signal?: AbortSignal) =>
        apiClient.get<WeatherAssessment>(API_ROUTES.weather.byMission(missionId), {signal}),
};
