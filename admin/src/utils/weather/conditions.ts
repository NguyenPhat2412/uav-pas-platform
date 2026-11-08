/**
 * Plain-language reading of a weather assessment for at-a-glance widgets: the sky as an icon-able
 * condition (from the WMO weather code Open-Meteo returns) and wind, rain and visibility as levels.
 */
export type WeatherCondition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'showers' | 'thunder' | 'snow' | 'unknown';
export type Level = 'good' | 'fair' | 'poor';

export function conditionOf(code: number | null | undefined): WeatherCondition {
    if (code == null) return 'unknown';
    if (code === 0) return 'clear';
    if (code <= 2) return 'partly';
    if (code === 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 57) return 'drizzle';
    if (code >= 61 && code <= 67) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 80 && code <= 82) return 'showers';
    if (code >= 95 && code <= 99) return 'thunder';
    return 'unknown';
}

/** Daylight by the local hour of a yyyy-MM-ddTHH:mm time (06:00 to 17:59). */
export function isDaytime(localTime: string | null | undefined): boolean {
    const hour = Number(localTime?.slice(11, 13));
    return Number.isNaN(hour) || (hour >= 6 && hour < 18);
}

/** Wind at flight level against the service limit: under half is calm, up to 80 % moderate. */
export function windLevel(speedMs: number | null | undefined, limitMs: number): Level | null {
    if (speedMs == null || !limitMs) return null;
    const share = speedMs / limitMs;
    return share < 0.5 ? 'good' : share < 0.8 ? 'fair' : 'poor';
}

export function rainLevel(probabilityPct: number | null | undefined, amountMm?: number | null): Level | null {
    if (probabilityPct == null && amountMm == null) return null;
    if ((amountMm ?? 0) >= 1 || (probabilityPct ?? 0) >= 60) return 'poor';
    return (probabilityPct ?? 0) >= 25 || (amountMm ?? 0) > 0.2 ? 'fair' : 'good';
}

export function visibilityLevel(meters: number | null | undefined): Level | null {
    if (meters == null) return null;
    return meters >= 5000 ? 'good' : meters >= 1500 ? 'fair' : 'poor';
}
