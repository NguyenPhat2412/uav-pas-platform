import type {WeatherProviderSettings, WeatherProviderType, WeatherProviderUpdate} from '@/types/weather/weather.types';

export type {WeatherProviderSettings, WeatherProviderType, WeatherProviderUpdate};

export interface WeatherProviderFormDraft {
    provider: WeatherProviderType;
    apiKey: string;
    cacheTtlMinutes: string;
    enforcePreflightBlock: boolean;
}

export type WeatherProviderFieldErrors = Partial<Record<'provider' | 'apiKey' | 'cacheTtlMinutes', string>>;

export const WEATHER_PROVIDERS: WeatherProviderType[] = ['OPEN_METEO', 'OPENWEATHERMAP'];

export function weatherProviderDraftFromSettings(settings: WeatherProviderSettings): WeatherProviderFormDraft {
    return {
        provider: settings.provider,
        apiKey: '',
        cacheTtlMinutes: String(settings.cacheTtlMinutes),
        enforcePreflightBlock: settings.enforcePreflightBlock,
    };
}

/** Minimal required check; range 1..120 and integer bounds are validated by the backend. */
export function canSubmitWeatherProvider(draft: WeatherProviderFormDraft): boolean {
    return draft.cacheTtlMinutes.trim().length > 0 && Number.isFinite(Number(draft.cacheTtlMinutes.trim()));
}

export function toWeatherProviderPayload(
    draft: WeatherProviderFormDraft,
    options?: { removeKey?: boolean; fallbackTtl?: number },
): WeatherProviderUpdate {
    const rawTtl = draft.cacheTtlMinutes.trim();
    const parsedTtl = rawTtl.length > 0 && Number.isFinite(Number(rawTtl))
        ? Math.trunc(Number(rawTtl))
        : (options?.fallbackTtl ?? 15);
    return {
        provider: draft.provider,
        apiKey: options?.removeKey ? '' : draft.apiKey.trim() ? draft.apiKey.trim() : undefined,
        cacheTtlMinutes: parsedTtl,
        enforcePreflightBlock: draft.enforcePreflightBlock,
    };
}

export function weatherProviderFieldErrors(error: unknown): WeatherProviderFieldErrors | null {
    const fields = (error as { fields?: Record<string, string> } | null)?.fields;
    return fields && Object.keys(fields).length ? (fields as WeatherProviderFieldErrors) : null;
}

