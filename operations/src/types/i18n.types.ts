import type {MessageRecord, PageResponse} from '@/types';

export interface PublicLocaleBundleResponse {
    locale: string;
    supportedLocales: string[];
    totalKeys: number;
    revision: number;
    messages: MessageRecord;
    flat: Record<string, string>;
}

export interface UiTranslationRow {
    id: number | null;
    namespace: string;
    translationKey: string;
    description: string | null;
    vi: string;
    en: string;
    ja: string;
    updatedBy: string;
    updatedAt: string | null;
}

export interface UpsertUiTranslationPayload {
    translationKey: string;
    namespace?: string;
    description?: string;
    translations: {
        vi: string;
        en: string;
        ja: string;
    };
}

export type UiTranslationPage = PageResponse<UiTranslationRow>;
