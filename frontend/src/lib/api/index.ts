import type { ApiError as ApiErrorShape } from "@/types";
export { API_ROUTES, type ApiRoutes } from "@/lib/api/routes";

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public error: string,
    message: string,
    public path?: string,
    public code?: string,
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
    } catch {}
  } else {
    const values: Record<string, string | undefined> = { token: session?.accessToken, refreshToken: session?.refreshToken };
    for (const [key, value] of Object.entries(values)) {
      if (value) window.localStorage.setItem(key, value); else window.localStorage.removeItem(key);
    }
  }
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
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
      headers: { 'content-type': 'application/json' },
      body: refreshToken ? JSON.stringify({ refreshToken }) : JSON.stringify({}),
    });
    requireCurrent(generation);
    if (!response.ok) {
      setAuthSession(null);
      throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập đã hết hạn.', '/api/v1/auth/refresh', 'SESSION_EXPIRED');
    }
    const session = await response.json() as { accessToken?: string; refreshToken?: string };
    storeSession(session);
    return session.accessToken || '';
  })();
  refreshFlight = { generation, promise };
  try { return await promise; } finally { if (refreshFlight?.promise === promise) refreshFlight = undefined; }
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
  try { response = await fetch(url, { ...options, credentials: isApiOrigin ? 'include' : 'omit', headers }); }
  catch (error) {
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
    response = await fetch(url, { credentials: 'include', ...options, headers: retryHeaders });
    requireCurrent(generation);
    if (response.status === 401) setAuthSession(null);
  }
  if (!response.ok) {
    if (isApiOrigin && typeof window !== 'undefined' && response.status === 403 && endpoint !== '/api/v1/permissions/me') window.dispatchEvent(new Event(PERMISSIONS_EVENT));
    let detail: Partial<ApiErrorShape> = {};
    try { detail = await response.json(); } catch { /* Preserve status for non-JSON errors. */ }
    throw new ApiError(
      response.status,
      detail.error || response.statusText,
      detail.message || `Request failed with status ${response.status}`,
      detail.path || endpoint,
      detail.code,
    );
  }
  if (response.status === 204) return undefined as T;
  const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  requireCurrent(generation);
  return result as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiRequest<T>(endpoint, { ...options, method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiRequest<T>(endpoint, { ...options, method: 'PUT', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(endpoint: string, data?: unknown, options?: RequestInit) => apiRequest<T>(endpoint, { ...options, method: 'PATCH', body: data === undefined ? undefined : JSON.stringify(data) }),
  delete: <T>(endpoint: string, options?: RequestInit) => apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

export async function request<T>(urlOrBase: string, pathOrOptions: string | RequestOptions, options: RequestOptions = {}): Promise<T> {
  if (typeof pathOrOptions === 'string') {
    const { token, body, headers, ...init } = options;
    const merged = new Headers(headers);
    if (token) merged.set('authorization', `Bearer ${token}`);
    if (body !== undefined && !merged.has('content-type')) merged.set('content-type', 'application/json');
    return apiRequest<T>(`${urlOrBase}${pathOrOptions}`, { ...init, headers: merged, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  const { token, body, headers, ...init } = pathOrOptions;
  const merged = new Headers(headers);
  if (token) merged.set('authorization', `Bearer ${token}`);
  const requestBody = body === undefined || body instanceof FormData || body instanceof Blob || typeof body === 'string' ? body as BodyInit | undefined : JSON.stringify(body);
  if (requestBody !== undefined && !merged.has('content-type') && typeof requestBody === 'string') merged.set('content-type', 'application/json');
  return apiRequest<T>(urlOrBase, { ...init, headers: merged, body: requestBody });
}
