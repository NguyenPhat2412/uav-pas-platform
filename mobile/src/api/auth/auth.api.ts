import {apiClient, API_ROUTES} from '@/lib/api/client';
import type {AuthResponse, ForgotPasswordRequest, LoginRequest, OtpChallengeResponse, RegisterRequest, ResendOtpRequest, ResetPasswordRequest, TwoFactorStatusResponse, UserResponse, VerifyOtpRequest} from '@/shared/types/auth/auth.types';

export interface AppleLoginPayload {
    credential: string;
    authorizationCode?: string | null;
    fullName?: string | null;
    nonce?: string;
}

function toAppleRequestBody(payload: AppleLoginPayload) {
    return {
        credential: payload.credential,
        ...(payload.authorizationCode ? {authorizationCode: payload.authorizationCode} : {}),
        ...(payload.fullName ? {fullName: payload.fullName} : {}),
        ...(payload.nonce ? {nonce: payload.nonce} : {}),
    };
}

/** Same endpoints as the web authService; tokens come back in the body and are kept in the Keychain. */
export const authService = {
    login: (credentials: LoginRequest) => apiClient.post<AuthResponse>(API_ROUTES.auth.login, credentials),
    /** Exchanges a Google ID token (audience: the web client ID) for this app's own tokens. */
    google: (credential: string) => apiClient.post<AuthResponse>(API_ROUTES.auth.google, {credential}),
    /** Exchanges an Apple identity token (audience: the iOS bundle ID or web Services ID) for this app's own tokens. */
    apple: (payload: AppleLoginPayload) => apiClient.post<AuthResponse>(API_ROUTES.auth.apple, toAppleRequestBody(payload)),
    loginWithApple: (payload: AppleLoginPayload) => apiClient.post<AuthResponse>(API_ROUTES.auth.apple, toAppleRequestBody(payload)),
    registerWithOtp: (data: RegisterRequest) => apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.registerOtp, data),
    verifyEmail: (data: VerifyOtpRequest) => apiClient.post<AuthResponse>(API_ROUTES.auth.verifyEmail, data),
    verify2fa: (data: VerifyOtpRequest) => apiClient.post<AuthResponse>(API_ROUTES.auth.verify2fa, data),
    resendOtp: (data: ResendOtpRequest) => apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.resendOtp, data),
    forgotPassword: (data: ForgotPasswordRequest) => apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.forgotPassword, data),
    resetPassword: (data: ResetPasswordRequest) => apiClient.post<{ message: string }>(API_ROUTES.auth.resetPassword, data),
    twoFactorStatus: (signal?: AbortSignal) => apiClient.get<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorStatus, {signal}),
    /** Revokes this phone's refresh token only; the web session stays signed in. */
    logout: (refreshToken: string) => apiClient.post<{ message: string }>(API_ROUTES.auth.logout, {refreshToken}),
    me: () => apiClient.get<UserResponse>(API_ROUTES.auth.me),
};

export const permissionService = {
    mine: (signal?: AbortSignal) => apiClient.get<string[]>(API_ROUTES.permissions.me, {signal}),
};
