import { apiClient } from '@uav/api-client';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
} from './types';

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/v1/auth/login', credentials);
  },

  async register(data: RegisterRequest): Promise<UserResponse> {
    return apiClient.post<UserResponse>('/api/v1/auth/register', data);
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
