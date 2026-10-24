export type Permission = string;
export type SessionEvent = 'expired' | 'logout';
export type Can = (permission: Permission) => boolean;

export type TwoFactorMethod = 'EMAIL' | 'TOTP';
export type OtpPurpose = 'REGISTER_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET' | 'ENABLE_2FA_EMAIL';

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
    fullName?: string;
    avatarUrl?: string;
    role?: string;
    status: string;
    createdAt?: string;
    locked?: boolean;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    twoFactorMethod?: TwoFactorMethod;
}

export interface AuthResponse {
    accessToken?: string;
    tokenType: string;
    refreshToken?: string;
    user: UserResponse;
    mfaRequired?: boolean;
    mfaMethod?: 'EMAIL' | 'TOTP' | 'EMAIL_VERIFY';
    challengeToken?: string;
    maskedEmail?: string;
    devOtpPreview?: string;
}

export interface OtpChallengeResponse {
    challengeToken: string;
    email: string;
    maskedEmail: string;
    purpose: OtpPurpose;
    method: TwoFactorMethod;
    expiresInSeconds: number;
    message: string;
    devOtpPreview?: string;
}

export interface VerifyOtpRequest {
    challengeToken?: string;
    email?: string;
    code: string;
    method?: TwoFactorMethod;
}

export interface ResendOtpRequest {
    challengeToken?: string;
    email?: string;
    purpose?: OtpPurpose;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    challengeToken?: string;
    email?: string;
    code: string;
    newPassword: string;
}

export interface TwoFactorStatusResponse {
    enabled: boolean;
    method: TwoFactorMethod;
    emailVerified: boolean;
    totpConfigured: boolean;
    email: string;
    maskedEmail: string;
}

export interface TwoFactorSetupRequest {
    method: TwoFactorMethod;
}

export interface TwoFactorSetupResponse {
    method: TwoFactorMethod;
    secret?: string;
    otpauthUri?: string;
    issuer?: string;
    accountName?: string;
    challengeToken?: string;
    maskedEmail?: string;
    devOtpPreview?: string;
    message: string;
}

export interface TwoFactorVerifyRequest {
    method: TwoFactorMethod;
    challengeToken?: string;
    code: string;
}

export interface TwoFactorDisableRequest {
    password?: string;
    code?: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface LogoutRequest {
    refreshToken?: string;
}
