import type { ApiError as ApiErrorShape } from '@uav/types';

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  token?: string;
  headers?: HeadersInit;
};

export class ApiError extends Error {
  constructor(public status: number, public error: string, message: string, public path?: string) {
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
  return typeof window === 'undefined' ? null : window.localStorage.getItem('token');
}

function storeSession(session: { accessToken?: string; refreshToken?: string } | null) {
  if (typeof window === 'undefined') return;
  const values: Record<string, string | undefined> = { token: session?.accessToken, refreshToken: session?.refreshToken };
  for (const [key, value] of Object.entries(values)) {
    if (value) window.localStorage.setItem(key, value); else window.localStorage.removeItem(key);
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

async function refreshAccess(generation: number) {
  if (refreshFlight?.generation === generation) return refreshFlight.promise;
  const promise = (async () => {
    const refreshToken = typeof window === 'undefined' ? null : window.localStorage.getItem('refreshToken');
    if (!refreshToken) throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập đã hết hạn.');
    const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
    requireCurrent(generation);
    if (!response.ok) {
      setAuthSession(null);
      throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập đã hết hạn.');
    }
    const session = await response.json() as { accessToken?: string; refreshToken?: string };
    if (!session.accessToken) throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập không hợp lệ.');
    storeSession(session);
    return session.accessToken;
  })();
  refreshFlight = { generation, promise };
  try { return await promise; } finally { if (refreshFlight?.promise === promise) refreshFlight = undefined; }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const generation = sessionGeneration;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const headers = new Headers(options.headers);
  if (!headers.has('content-type') && options.body !== undefined) headers.set('content-type', 'application/json');
  const token = currentToken();
  if (token && !headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(url, { ...options, headers }); }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NetworkError', error instanceof Error ? error.message : 'Network error');
  }
  requireCurrent(generation);
  const authCommand = /\/auth\/(login|register|refresh|logout)/.test(endpoint);
  if (response.status === 401 && typeof window !== 'undefined' && !authCommand) {
    const latest = currentToken();
    const accessToken = latest && latest !== token ? latest : await refreshAccess(generation);
    requireCurrent(generation);
    const retryHeaders = new Headers(headers);
    retryHeaders.set('authorization', `Bearer ${accessToken}`);
    response = await fetch(url, { ...options, headers: retryHeaders });
    requireCurrent(generation);
    if (response.status === 401) setAuthSession(null);
  }
  if (!response.ok) {
    if (typeof window !== 'undefined' && response.status === 403 && endpoint !== '/api/v1/permissions/me') window.dispatchEvent(new Event(PERMISSIONS_EVENT));
    let detail: Partial<ApiErrorShape> = {};
    try { detail = await response.json(); } catch { /* Preserve status for non-JSON errors. */ }
    throw new ApiError(response.status, detail.error || response.statusText, detail.message || `Request failed with status ${response.status}`, detail.path);
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
