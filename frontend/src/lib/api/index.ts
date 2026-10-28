import type { ApiError as ApiErrorShape, PresentationLocale, RequestOptions } from "@/types";
export { API_ROUTES, type ApiRoutes } from "@/lib/api/routes";
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

// Backend auth and account errors are English constants; show them in the portal language.
const apiMessages: Record<PresentationLocale, Record<string, string>> = {
    vi: {
        'Service plan code already exists': "Mã gói cước này đã tồn tại.",
        'The default BASIC plan cannot be deactivated': "Không thể tắt gói mặc định BASIC.",
        'Service plan not found': "Không tìm thấy gói cước.",
        'Current password is incorrect': 'Mật khẩu hiện tại không đúng.',
        'New password must differ from the current password': 'Mật khẩu mới phải khác mật khẩu hiện tại.',
        'Service code already exists': 'Mã dịch vụ này đã tồn tại.',
        'Service not found': 'Không tìm thấy dịch vụ.',
        'Invalid username/email or password': 'Tên đăng nhập, email hoặc mật khẩu không đúng.',
        'Account is not active': 'Tài khoản chưa được kích hoạt hoặc đã bị khóa.',
        'User not found': 'Không tìm thấy tài khoản.',
        'Email already exists in the system': 'Email này đã được sử dụng.',
        'Username already exists in the system': 'Tên đăng nhập này đã được sử dụng.',
        'Phone number already exists in the system': 'Số điện thoại này đã được sử dụng.',
    },
    en: {
        'Service plan code already exists': "This plan code already exists.",
        'The default BASIC plan cannot be deactivated': "The default BASIC plan can't be deactivated.",
        'Service plan not found': "Plan not found.",
        'Current password is incorrect': 'Your current password is incorrect.',
        'New password must differ from the current password': 'Choose a new password that differs from the current one.',
        'Service code already exists': 'This service code already exists.',
        'Service not found': 'Service not found.',
        'Invalid username/email or password': 'Incorrect username, email or password.',
        'Account is not active': 'The account is not active or has been locked.',
        'User not found': 'Account not found.',
        'Email already exists in the system': 'This email is already in use.',
        'Username already exists in the system': 'This username is already taken.',
        'Phone number already exists in the system': 'This phone number is already in use.',
    },
    ja: {
        'Service plan code already exists': "このプランコードは既に存在します。",
        'The default BASIC plan cannot be deactivated': "既定のBASICプランは無効にできません。",
        'Service plan not found': "プランが見つかりません。",
        'Current password is incorrect': '現在のパスワードが正しくありません。',
        'New password must differ from the current password': '新しいパスワードは現在のものと異なる必要があります。',
        'Service code already exists': 'このサービスコードは既に存在します。',
        'Service not found': 'サービスが見つかりません。',
        'Invalid username/email or password': 'ユーザー名、メールアドレス、またはパスワードが正しくありません。',
        'Account is not active': 'アカウントが有効化されていないか、ロックされています。',
        'User not found': 'アカウントが見つかりません。',
        'Email already exists in the system': 'このメールアドレスは既に使用されています。',
        'Username already exists in the system': 'このユーザー名は既に使用されています。',
        'Phone number already exists in the system': 'この電話番号は既に使用されています。',
    },
};

const clientText: Record<PresentationLocale, { sessionExpired: string; forbidden: string; forbiddenTitle: string; failed: (status: number) => string }> = {
    vi: {sessionExpired: 'Phiên đăng nhập đã hết hạn.', forbidden: 'Bạn không có quyền thực hiện thao tác này.', forbiddenTitle: 'Truy cập bị từ chối (403)', failed: status => `Yêu cầu thất bại (mã ${status}).`},
    en: {sessionExpired: 'Your session has expired.', forbidden: 'You do not have permission to do this.', forbiddenTitle: 'Access denied (403)', failed: status => `Request failed (code ${status}).`},
    ja: {sessionExpired: 'セッションの有効期限が切れました。', forbidden: 'この操作を行う権限がありません。', forbiddenTitle: 'アクセス拒否（403）', failed: status => `リクエストに失敗しました（コード ${status}）。`},
};

// Stable codes for those messages, so forms can translate them into the portal language.
const apiMessageCodes: Record<string, string> = {
    'Invalid username/email or password': 'INVALID_CREDENTIALS',
    'Account is not active': 'ACCOUNT_INACTIVE',
    'User not found': 'USER_NOT_FOUND',
    'Email already exists in the system': 'EMAIL_EXISTS',
    'Username already exists in the system': 'USERNAME_EXISTS',
    'Phone number already exists in the system': 'PHONE_EXISTS',
};

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
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
let sessionGeneration = 0;
let refreshFlight: { generation: number; promise: Promise<string> } | undefined;

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

export function setAuthSession(session: { accessToken?: string; refreshToken?: string } | null) {
    sessionGeneration += 1;
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

async function refreshAccess(generation: number) {
    if (refreshFlight?.generation === generation) return refreshFlight.promise;
    const promise = (async () => {
        const refreshToken = typeof window === 'undefined' ? null : window.localStorage.getItem('refreshToken');
        const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {'content-type': 'application/json'},
            body: refreshToken ? JSON.stringify({refreshToken}) : JSON.stringify({}),
        });
        requireCurrent(generation);
        if (!response.ok) {
            setAuthSession(null);
            throw new ApiError(401, 'Unauthorized', clientText[currentLocale()].sessionExpired, '/api/v1/auth/refresh', 'SESSION_EXPIRED');
        }
        const session = await response.json() as { accessToken?: string; refreshToken?: string };
        storeSession(session);
        return session.accessToken || '';
    })();
    refreshFlight = {generation, promise};
    try {
        return await promise;
    } finally {
        if (refreshFlight?.promise === promise) refreshFlight = undefined;
    }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
        throw new ApiError(0, 'NetworkError', error instanceof Error ? error.message : 'Network error', endpoint, 'NETWORK_ERROR');
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
        throw new ApiError(
            response.status,
            detail.error || response.statusText,
            localizeApiMessage(detail.message) || clientText[currentLocale()].failed(response.status),
            detail.path || endpoint,
            detail.code ?? (detail.message ? apiMessageCodes[detail.message] : undefined),
            // Field messages may be codes (e.g. FLIGHT_POLYGON_TOO_SMALL); translate them like the main message.
            detail.fields && Object.fromEntries(Object.entries(detail.fields).map(([name, text]) => [name, localizeApiMessage(text) ?? text])),
        );
    }
    if (response.status === 204) return undefined as T;
    const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
    requireCurrent(generation);
    return result as T;
}

export const apiClient = {
    get: <T>(endpoint: string, options?: RequestInit) => apiRequest<T>(endpoint, {...options, method: 'GET'}),
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
