export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
  fullName?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string;
  zaloId?: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  status: string;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  refreshToken?: string;
  user: UserResponse;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface ZaloLoginRequest {
  code: string;
  redirectUri?: string;
}

export interface ZaloUrlResponse {
  url: string;
}
