/**
 * Public, keyless weather sources used as a reference for customers. They never decide flight clearance;
 * the operations team does. Only the mission coordinates are sent to these services.
 */
import type {SiteWeather, WeatherHourlyKey as HourlyKey} from '@/types';

export type {SiteWeather};

const HOURLY = ['temperature_2m', 'relative_humidity_2m', 'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'visibility', 'precipitation_probability'] as const;

/**
 * Picks the forecast hour closest to `at` (a local "YYYY-MM-DDTHH:mm" time as stored on the mission),
 * falling back to the current hour when `at` is in the past or beyond the 16-day forecast window.
 */
export async function fetchSiteWeather(latitude: number, longitude: number, at: string | undefined, signal?: AbortSignal): Promise<SiteWeather> {
    const params = new URLSearchParams({
        latitude: String(latitude), longitude: String(longitude), hourly: HOURLY.join(','),
        wind_speed_unit: 'ms', timezone: 'auto', forecast_days: '16'
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {signal});
    if (!response.ok) throw new Error(`weather ${response.status}`);
    const data = await response.json() as { hourly: Record<'time' | HourlyKey, (string | number | null)[]>; current_weather?: unknown; utc_offset_seconds: number };
    const times = data.hourly.time as string[];
    // "Now" in the site's own time zone, matching the API's local timestamps.
    const siteNow = new Date(Date.now() + data.utc_offset_seconds * 1000).toISOString().slice(0, 13);
    const wanted = at && at.slice(0, 13) > siteNow ? at.slice(0, 13) : siteNow;
    let index = times.findIndex(time => time.slice(0, 13) === wanted);
    const forecast = index >= 0 && wanted !== siteNow;
    if (index < 0) index = Math.max(0, times.findIndex(time => time.slice(0, 13) === siteNow));
    const value = (key: HourlyKey) => {
        const raw = data.hourly[key]?.[index];
        return typeof raw === 'number' ? raw : undefined;
    };
    return {
        time: times[index],
        forecast,
        temperature: value('temperature_2m'),
        humidity: value('relative_humidity_2m'),
        windSpeed: value('wind_speed_10m'),
        windGusts: value('wind_gusts_10m'),
        windDirection: value('wind_direction_10m'),
        visibility: value('visibility'),
        precipitationProbability: value('precipitation_probability'),
    };
}

/** Latest observed or predicted planetary Kp index (geomagnetic activity, which can disturb UAV compasses). */
export async function fetchKpIndex(signal?: AbortSignal): Promise<{ kp: number; time: string } | null> {
    const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json', {signal});
    if (!response.ok) throw new Error(`kp ${response.status}`);
    const rows = await response.json() as unknown[];
    const now = Date.now();
    // SWPC has served both a header row + [time_tag, kp, ...] arrays and {time_tag, kp} objects; accept either.
    const current = rows
        .map(row => Array.isArray(row)
            ? {time: String(row[0]), kp: Number(row[1])}
            : {time: String((row as { time_tag?: string }).time_tag), kp: Number((row as { kp?: number | string }).kp)})
        .filter(row => Number.isFinite(row.kp) && Date.parse(`${row.time.replace(' ', 'T')}Z`) <= now)
        .pop();
    return current ?? null;
}
