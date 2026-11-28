import {apiClient, API_ROUTES} from '@/lib/api';
import type {
    PublicLocaleBundleResponse,
    UiTranslationPage,
    UiTranslationRow,
    UpsertUiTranslationPayload,
} from '@/types/i18n.types';

export async function fetchPublicLocaleBundle(
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

export async function switchPublicLocale(
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

export const adminI18nService = {
    list: (params: {namespace?: string; keyword?: string; page?: number; size?: number}, signal?: AbortSignal) => {
        const qs = new URLSearchParams();
        if (params.namespace) qs.set('namespace', params.namespace);
        if (params.keyword) qs.set('keyword', params.keyword);
        qs.set('page', String(params.page ?? 0));
        qs.set('size', String(params.size ?? 25));
        return apiClient.get<UiTranslationPage>(`${API_ROUTES.admin.i18n}?${qs.toString()}`, {signal});
    },
    namespaces: (signal?: AbortSignal) =>
        apiClient.get<string[]>(API_ROUTES.admin.i18nNamespaces, {signal}),
    upsert: (payload: UpsertUiTranslationPayload) =>
        apiClient.put<UiTranslationRow>(API_ROUTES.admin.i18n, payload),
    deleteById: (id: number) =>
        apiClient.delete<void>(API_ROUTES.admin.i18nById(id)),
};
