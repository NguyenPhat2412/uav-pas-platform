import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {PublicLocaleBundleResponse} from '@/shared/types/i18n.types';

/**
 * Mobile API client for PostgreSQL-backed UI translations (`vi`, `en`, `ja`).
 * Fails silently to null so offline or first-frame screens fall back to bundled catalogs.
 */
export async function fetchMobileLocaleBundle(
    locale: string,
    signal?: AbortSignal,
): Promise<PublicLocaleBundleResponse | null> {
    try {
        return await apiClient.get<PublicLocaleBundleResponse>(
            API_ROUTES.public.i18nBundle(locale),
            {signal},
        );
    } catch {
        return null;
    }
}

export async function switchMobileLocale(
    locale: string,
): Promise<PublicLocaleBundleResponse | null> {
    try {
        return await apiClient.post<PublicLocaleBundleResponse>(
            API_ROUTES.public.i18nSwitch,
            {locale},
        );
    } catch {
        return null;
    }
}
