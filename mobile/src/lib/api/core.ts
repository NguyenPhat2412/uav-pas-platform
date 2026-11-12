// The request pipeline, free of React Native imports so tests run it with a fake fetch and session store.
// Same contract as the web client (frontend/src/lib/api/index.ts): ApiError(status, error, message, path, code,
// fields), backend messages localized, 429 worded plainly. Unlike the web it authenticates with a Bearer token from
// the Keychain, never sends cookies (credentials: 'omit') and so needs no CSRF token.

export class ApiError extends Error {
    status: number;
    error: string;
    path?: string;
    code?: string;
    /** Field name to message when the backend rejected specific inputs. */
    fields?: Record<string, string>;

    constructor(status: number, error: string, message: string, path?: string, code?: string, fields?: Record<string, string>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.error = error;
        this.path = path;
        this.code = code;
        this.fields = fields;
    }
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/** Why a session ended: the server refused it, or the user signed out. */
export type SessionEndReason = 'expired' | 'signed-out';

export interface SessionStore {
    read(): TokenPair | null;
    save(tokens: TokenPair): Promise<void>;
    clear(reason: SessionEndReason): Promise<void>;
}

export interface ClientText {
    sessionExpired: string;
    tooManyRequests: string;
    failed: (status: number) => string;
}

export interface ApiClientOptions {
    baseUrl: string;
    fetch: typeof fetch;
    session: SessionStore;
    refreshPath: string;
    /** Sent with every API request (Accept-Language, X-Client); never with signed storage URLs. */
    headers: () => Record<string, string>;
    text: () => ClientText;
    /** Backend English constants to the current language, and to stable codes forms can switch on. */
    localize: (message: string | undefined) => string | undefined;
    codeOf: (message: string | undefined) => string | undefined;
}

interface ErrorBody {
    error?: string;
    message?: string;
    path?: string;
    code?: string;
    fields?: Record<string, string>;
}

// Sign-in commands answer 401 for wrong credentials; that is not an expired session to refresh.
const AUTH_COMMAND = /\/auth\/(login|google|register|register-otp|verify-email|verify-2fa|refresh|logout|forgot-password|reset-password|resend-otp)$/;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Pure RFC 4648 Base64 encoder safe for Hermes (no Node Buffer, no spread-argument call stack limit). */
export function bytesToBase64(bytes: Uint8Array): string {
    const chunks: string[] = [];
    const len = bytes.length;
    let i = 0;
    for (; i + 2 < len; i += 3) {
        const triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        chunks.push(
            BASE64_ALPHABET[(triplet >> 18) & 63] +
            BASE64_ALPHABET[(triplet >> 12) & 63] +
            BASE64_ALPHABET[(triplet >> 6) & 63] +
            BASE64_ALPHABET[triplet & 63],
        );
    }
    const remaining = len - i;
    if (remaining === 1) {
        const n = bytes[i] << 16;
        chunks.push(BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63] + '==');
    } else if (remaining === 2) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
        chunks.push(
            BASE64_ALPHABET[(n >> 18) & 63] +
            BASE64_ALPHABET[(n >> 12) & 63] +
            BASE64_ALPHABET[(n >> 6) & 63] +
            '=',
        );
    }
    return chunks.join('');
}

export function createApiClient(options: ApiClientOptions) {
    const {baseUrl, session} = options;
    const apiOrigin = new URL(baseUrl).origin;
    let refreshing: Promise<string> | null = null;

    const networkError = (path: string, cause: unknown) =>
        new ApiError(0, 'NetworkError', cause instanceof Error ? cause.message : 'Network error', path, 'NETWORK_ERROR');

    async function send(url: string, init: RequestInit, path: string): Promise<Response> {
        try {
            return await options.fetch(url, {...init, credentials: 'omit'});
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            throw networkError(path, error);
        }
    }

    /** One refresh at a time: the backend rotates the token, so parallel refreshes would race and lose. */
    function refreshAccess(): Promise<string> {
        if (refreshing) return refreshing;
        refreshing = (async () => {
            const current = session.read();
            if (!current) throw new ApiError(401, 'Unauthorized', options.text().sessionExpired, options.refreshPath, 'SESSION_EXPIRED');
            const response = await send(`${baseUrl}${options.refreshPath}`, {
                method: 'POST',
                headers: {...options.headers(), 'content-type': 'application/json'},
                body: JSON.stringify({refreshToken: current.refreshToken}),
            }, options.refreshPath);
            // Rate limited or a server fault says nothing about the session: keep it and let the caller retry.
            if (response.status === 429) throw new ApiError(429, 'Too Many Requests', options.text().tooManyRequests, options.refreshPath, 'RATE_LIMITED');
            if (response.status >= 500) throw new ApiError(response.status, 'Error', options.text().failed(response.status), options.refreshPath);
            const body = response.ok ? await response.json().catch(() => null) as Partial<TokenPair> | null : null;
            if (!body?.accessToken || !body.refreshToken) {
                await session.clear('expired');
                throw new ApiError(401, 'Unauthorized', options.text().sessionExpired, options.refreshPath, 'SESSION_EXPIRED');
            }
            await session.save({accessToken: body.accessToken, refreshToken: body.refreshToken});
            return body.accessToken;
        })();
        const flight = refreshing;
        void flight.then(() => undefined, () => undefined).finally(() => {
            if (refreshing === flight) refreshing = null;
        });
        return flight;
    }

    async function toError(response: Response, path: string): Promise<ApiError> {
        let detail: ErrorBody = {};
        try {
            detail = await response.json() as ErrorBody;
        } catch { /* Keep the status for non-JSON errors. */
        }
        const limited = response.status === 429;
        const text = options.text();
        return new ApiError(
            response.status,
            detail.error || response.statusText || 'Error',
            limited ? text.tooManyRequests : options.localize(detail.message) || text.failed(response.status),
            detail.path || path,
            detail.code ?? options.codeOf(detail.message) ?? (limited ? 'RATE_LIMITED' : undefined),
            // Field messages may be codes (e.g. FLIGHT_POLYGON_TOO_SMALL); translate them like the main message.
            detail.fields && Object.fromEntries(Object.entries(detail.fields).map(([name, value]) => [name, options.localize(value) ?? value])),
        );
    }

    async function sendAuthenticated(endpoint: string, init: RequestInit = {}): Promise<Response> {
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
        // Signed storage URLs authenticate with their signature: no token, no extra headers that could break it.
        const isApi = new URL(url).origin === apiOrigin;
        const headers: Record<string, string> = {...(isApi ? options.headers() : {}), ...(init.headers as Record<string, string> | undefined)};
        const hasType = Object.keys(headers).some(name => name.toLowerCase() === 'content-type');
        if (isApi && typeof init.body === 'string' && !hasType) headers['content-type'] = 'application/json';
        const tokens = isApi ? session.read() : null;
        const withToken = (accessToken: string | undefined) =>
            accessToken ? {...headers, authorization: `Bearer ${accessToken}`} : headers;

        let response = await send(url, {...init, headers: withToken(tokens?.accessToken)}, endpoint);
        if (isApi && response.status === 401 && tokens && !AUTH_COMMAND.test(endpoint.split('?')[0])) {
            // Another request may have refreshed while this one was in flight; reuse its token instead of refreshing twice.
            const latest = session.read();
            const accessToken = latest && latest.accessToken !== tokens.accessToken ? latest.accessToken : await refreshAccess();
            response = await send(url, {...init, headers: withToken(accessToken)}, endpoint);
            if (response.status === 401) await session.clear('expired');
        }
        if (!response.ok) throw await toError(response, endpoint);
        return response;
    }

    async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
        const response = await sendAuthenticated(endpoint, init);
        if (response.status === 204) return undefined as T;
        const type = response.headers.get('content-type') ?? '';
        return (type.includes('application/json') ? await response.json() : await response.text()) as T;
    }

    async function getBytes(endpoint: string, init: RequestInit = {}): Promise<Uint8Array> {
        const response = await sendAuthenticated(endpoint, {...init, method: 'GET'});
        return new Uint8Array(await response.arrayBuffer());
    }

    const json = (method: string) => <T>(endpoint: string, data?: unknown, init?: RequestInit) =>
        request<T>(endpoint, {...init, method, body: data === undefined ? undefined : JSON.stringify(data)});

    return {
        request,
        getBytes,
        get: <T>(endpoint: string, init?: RequestInit) => request<T>(endpoint, {...init, method: 'GET'}),
        post: json('POST'),
        put: json('PUT'),
        patch: json('PATCH'),
        delete: <T>(endpoint: string, init?: RequestInit) => request<T>(endpoint, {...init, method: 'DELETE'}),
    };
}

export type ApiClient = ReturnType<typeof createApiClient>;
