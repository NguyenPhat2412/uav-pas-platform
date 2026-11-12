/** Take-off verdict; UNAVAILABLE when no weather source answered for that place and hour. */
export type FlightClearanceLevel = 'GO' | 'CAUTION' | 'NO_GO' | 'UNAVAILABLE';
export type WeatherProviderType = 'OPEN_METEO' | 'OPENWEATHERMAP';

/** One suggested daytime take-off hour (local time, yyyy-MM-ddTHH:mm). */
export interface RecommendedWindow {
    startTime: string;
    clearance: FlightClearanceLevel;
    windSpeed80mMs: number | null;
    windGustsMs: number | null;
    precipitationProbabilityPct: number | null;
    safetyScore: number;
}

/** GET /api/v1/weather/forecast and /weather/missions/{id}. Wind in m/s at 10, 80 and 120 m. */
export interface WeatherAssessment {
    clearance: FlightClearanceLevel;
    safetyScore: number;
    reasonCodes: string[];
    effectiveMaxWindMs: number;
    evaluatedTime: string;
    forecast: boolean;
    provider: string;
    fromCache: boolean;
    temperatureC: number | null;
    humidityPct: number | null;
    windSpeed10mMs: number | null;
    windSpeed80mMs: number | null;
    windSpeed120mMs: number | null;
    windGustsMs: number | null;
    windDirectionDeg: number | null;
    visibilityMeters: number | null;
    precipitationMm: number | null;
    precipitationProbabilityPct: number | null;
    cloudCoverPct: number | null;
    weatherCode: number | null;
    kpIndex: number | null;
    batteryDrainMultiplier: number;
    recommendedWindows: RecommendedWindow[];
}

export interface StationWeatherSummary {
    stationId: number;
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    assessment: WeatherAssessment;
}

/** The API key itself is never returned; only whether one is stored. */
export interface WeatherProviderSettings {
    provider: WeatherProviderType;
    apiKeyConfigured: boolean;
    cacheTtlMinutes: number;
    enforcePreflightBlock: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
}

/** apiKey: undefined keeps the stored key, '' removes it, any other value replaces it. */
export interface WeatherProviderUpdate {
    provider: WeatherProviderType;
    apiKey?: string;
    cacheTtlMinutes: number;
    enforcePreflightBlock: boolean;
}

export interface ForecastQuery {
    lat: number;
    lng: number;
    /** Local ISO date-time; now when omitted. */
    at?: string;
    serviceId?: number;
}
