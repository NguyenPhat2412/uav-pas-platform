import { apiClient } from '@uav/api-client';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
  ZaloLoginRequest,
  ZaloUrlResponse,
} from './types';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/v1/auth/login', credentials);
  },

  async register(data: RegisterRequest): Promise<UserResponse> {
    return apiClient.post<UserResponse>('/api/v1/auth/register', data);
  },

  async getZaloAuthUrl(): Promise<string> {
    const res = await apiClient.get<ZaloUrlResponse | string>('/api/v1/auth/zalo/url');
    if (typeof res === 'object' && res !== null && 'url' in res) {
      return (res as ZaloUrlResponse).url;
    }
    return String(res);
  },

  async loginWithZalo(data: ZaloLoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/v1/auth/zalo/callback', data);
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken });
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      await apiClient.post<{ message: string }>('/api/v1/auth/logout', { refreshToken });
    } catch (e) {
      console.warn('Backend logout call completed with note:', e);
    }
  },

  async getMe(): Promise<UserResponse> {
    return apiClient.get<UserResponse>('/api/v1/auth/me');
  },
};
