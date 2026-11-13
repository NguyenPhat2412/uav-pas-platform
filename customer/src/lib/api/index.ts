import type { ApiError as ApiErrorShape, PresentationLocale, RequestOptions } from "@/types";
export { API_ROUTES, type ApiRoutes } from "@/lib/api/routes";
import {apiMessageCodes, apiMessages, clientText} from "@/lib/api/messages";
export type { PresentationLocale, RequestOptions };

function currentLocale(): PresentationLocale {
    if (typeof document !== 'undefined' && document.documentElement?.lang) {
        const lang = document.documentElement.lang.toLowerCase();
        if (lang.startsWith('en')) return 'en';
        if (lang.startsWith('ja') || lang.startsWith('jp')) return 'ja';
    }
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const saved = window.localStorage.getItem('uav_locale')?.toLowerCase();
            if (saved === 'en') return 'en';
            if (saved === 'ja' || saved === 'jp') return 'ja';
        } catch {
            // ignore
        }
    }
    return 'vi';
}

function dispatchErrorToast(message: string, title: string) {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        const id = 'toast_' + Math.random().toString(36).substring(2, 9);
        window.dispatchEvent(new CustomEvent('uav:toast', { detail: { id, type: 'error', message, title } }));
    }
}

function localizeApiMessage(message: string | undefined): string | undefined {
    return message ? apiMessages[currentLocale()][message] ?? message : message;
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public error: string,
        message: string,
        public path?: string,
        public code?: string,
        /** Field name to message when the backend rejected specific inputs. */
        public fields?: Record<string, string>,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export const SESSION_EVENT = 'uav:session';
export const PERMISSIONS_EVENT = 'uav:permissions';
export const TRANSPORT_EVENT = 'uav:transport';
export type TransportState = 'online' | 'server_unreachable' | 'maintenance';

function emitTransportStatus(state: TransportState, status: number) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent(TRANSPORT_EVENT, {detail: {state, status}}));
    }
}
/** localStorage key other tabs watch: `${userId}:${timestamp}` while signed in, absent once signed out. */
export const SESSION_STORAGE_KEY = 'uav_session';
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
let sessionGeneration = 0;
let refreshFlight: { generation: number; promise: Promise<string> } | undefined;
/** The account this tab is signed in as, so a session restored by another tab can be told apart from a switch. */
let sessionUserId: number | null = null;

type SessionLike = { accessToken?: string; refreshToken?: string; user?: { id?: number } | null };

/** The user id recorded in a `uav_session` value, or null when the value is empty or malformed. */
export function sessionOwnerOf(value: string | null | undefined): string | null {
    const owner = value?.split(':')[0];
    return owner ? owner : null;
}

/**
 * Set once this browser has learned for certain that it has no session (a refused /auth/me or refresh, or a sign-out),
 * cleared by any sign-in. A page load that finds it skips the /auth/me → refresh → /auth/me round-trips, so anonymous
 * visitors cost the API nothing. Absent (first visit, cleared storage) means "unknown": the page asks once.
 */
const SIGNED_OUT_KEY = 'uav_signed_out';
const SESSION_PRESENCE_COOKIE = 'uav_session_present';

function writeSessionMarker(userId: number | null, force: boolean) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        if (userId == null) {
            window.localStorage.removeItem(SESSION_STORAGE_KEY);
            window.localStorage.setItem(SIGNED_OUT_KEY, '1');
        } else {
            window.localStorage.removeItem(SIGNED_OUT_KEY);
            if (force || sessionOwnerOf(window.localStorage.getItem(SESSION_STORAGE_KEY)) !== String(userId))
                window.localStorage.setItem(SESSION_STORAGE_KEY, `${userId}:${Date.now()}`);
        }
    } catch { /* Storage may be unavailable (private mode); cross-tab sync is best effort. */
    }
}

function readStorage(key: string): string | null {
    try {
        return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
    } catch {
        return null;
    }
}

/** True when this browser last knew it had no session and no tab or sibling portal has signed in since. */
export function knownSignedOut(): boolean {
    if (readCookie(SESSION_PRESENCE_COOKIE) === '1') return false;
    return readStorage(SIGNED_OUT_KEY) === '1' && readStorage(SESSION_STORAGE_KEY) === null;
}

/** True when some tab or sibling portal of this browser holds a session. */
function sessionMarkerPresent(): boolean {
    return readStorage(SESSION_STORAGE_KEY) !== null || readCookie(SESSION_PRESENCE_COOKIE) === '1';
}

/** Records the account restored from cookies on page load, telling other tabs only when it differs from theirs. */
export function rememberSessionUser(userId: number | null) {
    sessionUserId = userId;
    writeSessionMarker(userId, false);
}

function currentToken() {
    if (typeof window === 'undefined' || typeof document !== 'undefined') return null;
    return window.localStorage.getItem('token');
}

function storeSession(session: { accessToken?: string; refreshToken?: string } | null) {
    if (typeof window === 'undefined') return;
    const isBrowser = typeof document !== 'undefined';
    if (isBrowser) {
        try {
            window.localStorage.removeItem('token');
            window.localStorage.removeItem('refreshToken');
        } catch {
        }
    } else {
        const values: Record<string, string | undefined> = {
            token: session?.accessToken,
            refreshToken: session?.refreshToken
        };
        for (const [key, value] of Object.entries(values)) {
            if (value) window.localStorage.setItem(key, value); else window.localStorage.removeItem(key);
        }
    }
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, {detail: session}));
}

/**
 * Starts a new session generation (in-flight requests of the previous one are discarded). By default other tabs are
 * told through `uav_session`; pass `broadcast: false` when this tab is only following a change made elsewhere.
 */
export function setAuthSession(session: SessionLike | null, {broadcast = true}: { broadcast?: boolean } = {}) {
    sessionGeneration += 1;
    sessionUserId = session?.user?.id ?? null;
    if (broadcast && (!session || session.user?.id != null)) writeSessionMarker(session?.user?.id ?? null, true);
    storeSession(session);
}

function requireCurrent(generation: number) {
    if (generation !== sessionGeneration) throw new DOMException('Session changed', 'AbortError');
}

function readCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

/** Runs the refresh exclusively across tabs: the backend keeps one refresh token per user, so parallel refreshes race. */
function acrossTabs<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
    return locks?.request ? locks.request('uav-refresh', task) as Promise<T> : task();
}

/** After a refused refresh: another tab may already have rotated the cookies, so ask once whether the session lives. */
async function sessionStillValid(): Promise<boolean> {
    try {
        const response = await fetch(`${baseUrl}/api/v1/auth/me`, {method: 'GET', credentials: 'include'});
        if (!response.ok) return false;
        const me = await response.json() as { id?: number } | null;
        // A different account means another tab switched users; that tab's storage event reloads this one.
        if (sessionUserId != null && me?.id != null && me.id !== sessionUserId) throw new DOMException('Session changed', 'AbortError');
        return true;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        return false;
    }
}

async function refreshAccess(generation: number) {
    if (refreshFlight?.generation === generation) return refreshFlight.promise;
    const promise = acrossTabs(async () => {
        requireCurrent(generation);
        const refreshToken = typeof window === 'undefined' ? null : window.localStorage.getItem('refreshToken');
        let response: Response;
        try {
            response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: {'content-type': 'application/json'},
                body: refreshToken ? JSON.stringify({refreshToken}) : JSON.stringify({}),
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') throw error;
            // Offline is not a signed-out session; keep it and let the caller retry later.
            throw new ApiError(0, 'NetworkError', error instanceof Error ? error.message : 'Network error', '/api/v1/auth/refresh', 'NETWORK_ERROR');
        }
        requireCurrent(generation);
        if (response.status === 429) {
            throw new ApiError(429, 'Too Many Requests', clientText[currentLocale()].tooManyRequests, '/api/v1/auth/refresh', 'RATE_LIMITED');
        }
        if (!response.ok) {
            // Only a browser with a session somewhere can have had its cookies rotated by another tab; without one,
            // asking /auth/me again would just be a second refused request.
            if (response.status < 500 && sessionMarkerPresent() && await sessionStillValid()) {
                requireCurrent(generation);
                // Another tab refreshed first; its new cookies authenticate this tab too.
                return currentToken() || '';
            }
            requireCurrent(generation);
            if (response.status >= 500) {
                throw new ApiError(response.status, response.statusText || 'Error', clientText[currentLocale()].failed(response.status), '/api/v1/auth/refresh');
            }
            setAuthSession(null);
            throw new ApiError(401, 'Unauthorized', clientText[currentLocale()].sessionExpired, '/api/v1/auth/refresh', 'SESSION_EXPIRED');
        }
        const session = await response.json() as SessionLike;
        requireCurrent(generation);
        storeSession(session);
        return session.accessToken || '';
    });
    refreshFlight = {generation, promise};
    try {
        return await promise;
    } finally {
        if (refreshFlight?.promise === promise) refreshFlight = undefined;
    }
}

async function sendRequest(endpoint: string, options: RequestInit = {}): Promise<{ response: Response; generation: number }> {
    const generation = sessionGeneration;
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    // Storage URLs authenticate with their signature, not the API session.
    const isApiOrigin = new URL(url).origin === new URL(baseUrl).origin;
    const headers = new Headers(options.headers);
    if (!headers.has('content-type') && options.body !== undefined) headers.set('content-type', 'application/json');
    const token = isApiOrigin ? currentToken() : null;
    if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
    const method = (options.method ?? 'GET').toUpperCase();
    if (isApiOrigin && typeof document !== 'undefined' && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !headers.has('x-xsrf-token')) {
        const csrf = readCookie('XSRF-TOKEN');
        if (csrf) headers.set('x-xsrf-token', csrf);
    }
    let response: Response;
    try {
        response = await fetch(url, {...options, credentials: isApiOrigin ? 'include' : 'omit', headers});
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        if (isApiOrigin && !options.signal?.aborted) emitTransportStatus('server_unreachable', 0);
        throw new ApiError(0, 'NetworkError', error instanceof Error ? error.message : 'Network error', endpoint, 'NETWORK_ERROR');
    }
    if (isApiOrigin) {
        if (response.status === 502 || response.status === 503 || response.status === 504) {
            emitTransportStatus('maintenance', response.status);
        } else {
            emitTransportStatus('online', response.status);
        }
    }
    requireCurrent(generation);
    const authCommand = /\/auth\/(login|register|refresh|logout)/.test(endpoint);
    if (isApiOrigin && response.status === 401 && typeof window !== 'undefined' && !authCommand) {
        const latest = currentToken();
        const accessToken = latest && latest !== token ? latest : await refreshAccess(generation);
        requireCurrent(generation);
        const retryHeaders = new Headers(headers);
        if (accessToken) retryHeaders.set('authorization', `Bearer ${accessToken}`);
        response = await fetch(url, {credentials: 'include', ...options, headers: retryHeaders});
        requireCurrent(generation);
        if (response.status === 401) setAuthSession(null);
    }
    if (!response.ok) {
        if (isApiOrigin && typeof window !== 'undefined' && response.status === 403 && endpoint !== '/api/v1/permissions/me') {
            window.dispatchEvent(new Event(PERMISSIONS_EVENT));
            const locale = currentLocale();
            dispatchErrorToast(clientText[locale].forbidden, clientText[locale].forbiddenTitle);
        }
        let detail: Partial<ApiErrorShape> = {};
        try {
            detail = await response.json();
        } catch { /* Preserve status for non-JSON errors. */
        }
        // Rate limiting (auth endpoints): the backend's own wording is not localized, so always say it plainly.
        const limited = response.status === 429;
        throw new ApiError(
            response.status,
            detail.error || response.statusText,
            limited ? clientText[currentLocale()].tooManyRequests : localizeApiMessage(detail.message) || clientText[currentLocale()].failed(response.status),
            detail.path || endpoint,
            detail.code ?? (detail.message ? apiMessageCodes[detail.message] : undefined) ?? (limited ? 'RATE_LIMITED' : undefined),
            // Field messages may be codes (e.g. FLIGHT_POLYGON_TOO_SMALL); translate them like the main message.
            detail.fields && Object.fromEntries(Object.entries(detail.fields).map(([name, text]) => [name, localizeApiMessage(text) ?? text])),
        );
    }
    return {response, generation};
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const {response, generation} = await sendRequest(endpoint, options);
    if (response.status === 204) return undefined as T;
    const contentType = response.headers.get('content-type') ?? '';
    const result = contentType.includes('application/json')
        ? await response.json()
        : contentType.includes('application/pdf')
            ? await response.blob()
            : await response.text();
    requireCurrent(generation);
    return result as T;
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) => apiRequest<T>(endpoint, {...options, method: 'GET'}),
    getBlob: async (endpoint: string, options?: RequestInit): Promise<Blob> => {
        const headers = new Headers(options?.headers);
        if (!headers.has('accept')) headers.set('accept', 'application/pdf, application/octet-stream, */*');
        const {response, generation} = await sendRequest(endpoint, {...options, method: 'GET', headers});
        const blob = await response.blob();
        requireCurrent(generation);
        return blob;
    },
    post: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiRequest<T>(endpoint, {
        ...options,
        method: 'POST',
        body: data === undefined ? undefined : JSON.stringify(data)
    }),
    put: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiRequest<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: data === undefined ? undefined : JSON.stringify(data)
    }),
    patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiRequest<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: data === undefined ? undefined : JSON.stringify(data)
    }),
    delete: <T>(endpoint: string, options?: RequestInit) => apiRequest<T>(endpoint, {...options, method: 'DELETE'}),
};

export async function request<T>(urlOrBase: string, pathOrOptions: string | RequestOptions, options: RequestOptions = {}): Promise<T> {
    if (typeof pathOrOptions === 'string') {
        const {token, body, headers, ...init} = options;
        const merged = new Headers(headers);
        if (token) merged.set('authorization', `Bearer ${token}`);
        if (body !== undefined && !merged.has('content-type')) merged.set('content-type', 'application/json');
        return apiRequest<T>(`${urlOrBase}${pathOrOptions}`, {
            ...init,
            headers: merged,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    }
    const {token, body, headers, ...init} = pathOrOptions;
    const merged = new Headers(headers);
    if (token) merged.set('authorization', `Bearer ${token}`);
    const requestBody = body === undefined || body instanceof FormData || body instanceof Blob || typeof body === 'string' ? body as BodyInit | undefined : JSON.stringify(body);
    if (requestBody !== undefined && !merged.has('content-type') && typeof requestBody === 'string') merged.set('content-type', 'application/json');
    return apiRequest<T>(urlOrBase, {...init, headers: merged, body: requestBody});
}

/** Lightweight transport probe used by connection/maintenance recovery banners without touching session state. */
export async function probeApiHealth(): Promise<TransportState> {
    try {
        const response = await fetch(`${baseUrl}/api/v1/public/site-info`, {method: 'GET', cache: 'no-store'});
        if (response.status === 502 || response.status === 503 || response.status === 504) {
            emitTransportStatus('maintenance', response.status);
            return 'maintenance';
        }
        emitTransportStatus('online', response.status);
        return 'online';
    } catch {
        emitTransportStatus('server_unreachable', 0);
        return 'server_unreachable';
    }
}
