export type PresentationLocale = 'vi' | 'en' | 'ja';

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
    body?: unknown;
    token?: string;
    headers?: HeadersInit;
};

export interface SessionTokens {
    accessToken?: string;
    refreshToken?: string;
}
