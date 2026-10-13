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
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isBrowser) {
    // In real browser environment, sensitive JWT tokens must NEVER reside in localStorage
    // to prevent XSS-based credential theft. HttpOnly cookies handle authentication.
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } catch {}
  } else if (typeof localStorage !== 'undefined') {
    // Fallback for headless / Node test environments
    const values: Record<string, string | undefined> = { token: session?.accessToken, refreshToken: session?.refreshToken };
    for (const [key, value] of Object.entries(values)) {
      if (value) localStorage.setItem(key, value); else localStorage.removeItem(key);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
  }
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
      const browser = typeof window !== 'undefined';
      const refreshToken = browser && typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      // In HttpOnly cookie mode, uav_refresh_token is sent automatically via credentials: 'include'.
      // If refreshToken is explicitly present (legacy/mock), it is also sent in the payload.
      const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: refreshToken ? JSON.stringify({ refreshToken }) : JSON.stringify({}),
      });
      requireCurrent(generation);
      if (!response.ok) throw new ApiError(401, 'Unauthorized', 'Phiên đăng nhập đã hết hạn.');
      const session: AuthResponse = await response.json();
      requireCurrent(generation);
      if (session) storeSession(session);
      return session?.accessToken || '';
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
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers as Record<string, string> };
  const browser = typeof window !== 'undefined';
  const isBrowser = browser && typeof document !== 'undefined';
  // In real browser, never send Authorization Bearer unless explicitly passed in options.headers
  const token = !isBrowser && browser && typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try { response = await fetch(url, { credentials: 'include', ...options, headers }); }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NetworkError', error instanceof Error ? error.message : 'Network error');
  }
  requireCurrent(generation);
  const authCommand = /\/auth\/(login|register|refresh|logout)/.test(endpoint);
  if (response.status === 401 && browser && !authCommand) {
    // Another request may already have refreshed while this response was in flight.
    const currentToken = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const accessToken = currentToken && currentToken !== token ? currentToken : await refreshAccess(generation);
    requireCurrent(generation);
    const retryHeaders: Record<string, string> = { ...headers };
    if (accessToken) retryHeaders.Authorization = `Bearer ${accessToken}`;
    response = await fetch(url, { credentials: 'include', ...options, headers: retryHeaders });
    requireCurrent(generation);
    if (response.status === 401) setAuthSession(null);
  }
  if (!response.ok) {
    if (browser && response.status === 403 && endpoint !== '/api/v1/permissions/me') {
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
