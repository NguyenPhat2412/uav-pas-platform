import type { AuthResponse } from '@/features/auth/types/auth.types';

export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
}

export class ApiError extends Error {
  constructor(public status: number, public error: string, message: string, public path?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
export const SESSION_EVENT = 'uav:session';
export const PERMISSIONS_EVENT = 'uav:permissions';
let sessionGeneration = 0;
let refreshFlight: { generation: number; promise: Promise<string> } | undefined;

function storeSession(session: AuthResponse | null) {
  const values: Record<string, string | undefined> = { token: session?.accessToken, refreshToken: session?.refreshToken };
  for (const [key, value] of Object.entries(values)) {
    if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
  }
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

/** Invalidate in-flight responses before login/account replacement or logout. */
export function setAuthSession(session: AuthResponse | null) {
  sessionGeneration++;
  storeSession(session);
}

function requireCurrent(generation: number) {
  if (generation !== sessionGeneration) throw new DOMException('Session changed', 'AbortError');
}

async function refreshAccess(generation: number): Promise<string> {
  if (refreshFlight?.generation === generation) return refreshFlight.promise;
  const promise = (async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập đã hết hạn.');
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
      });
      requireCurrent(generation);
      if (!response.ok) throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập đã hết hạn.');
      const session: AuthResponse = await response.json();
      requireCurrent(generation);
      if (!session.accessToken) throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập không hợp lệ.');
      storeSession(session);
      return session.accessToken;
    } catch (error) {
      if (generation === sessionGeneration) setAuthSession(null);
      throw error;
    }
  })();
  refreshFlight = { generation, promise };
  try { return await promise; }
  finally { if (refreshFlight?.promise === promise) refreshFlight = undefined; }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const generation = sessionGeneration;
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  // Storage URLs authenticate with their signature, not the API session.
  const isApiOrigin = new URL(url).origin === new URL(BASE_URL).origin;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers as Record<string, string> };
  const browser = typeof window !== 'undefined';
  const token = isApiOrigin && browser ? localStorage.getItem('token') : null;
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try { response = await fetch(url, { ...options, headers }); }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NetworkError', error instanceof Error ? error.message : 'Network error');
  }
  requireCurrent(generation);
  const authCommand = /\/auth\/(login|register|refresh|logout|zalo\/callback)/.test(endpoint);
  if (isApiOrigin && response.status === 401 && browser && !authCommand) {
    // Another request may already have refreshed while this response was in flight.
    const currentToken = localStorage.getItem('token');
    const accessToken = currentToken && currentToken !== token ? currentToken : await refreshAccess(generation);
    requireCurrent(generation);
    response = await fetch(url, { ...options, headers: { ...headers, Authorization: `Bearer ${accessToken}` } });
    requireCurrent(generation);
    if (response.status === 401) setAuthSession(null);
  }
  if (!response.ok) {
    if (isApiOrigin && browser && response.status === 403 && endpoint !== '/api/v1/permissions/me') {
      window.dispatchEvent(new Event(PERMISSIONS_EVENT));
    }
    let error: Partial<ApiErrorResponse> = {};
    try { error = await response.json(); } catch { /* Non-JSON errors still carry HTTP status. */ }
    throw new ApiError(response.status, error.error || response.statusText, error.message || `Request failed with status ${response.status}`, error.path);
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
