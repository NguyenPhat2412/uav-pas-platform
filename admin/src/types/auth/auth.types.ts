export type AuthPermission = string;
export type {AuthPermission as Permission};
export type SessionEvent = 'expired' | 'logout';
export type Can = (permission: AuthPermission) => boolean;

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
    role?: string;
    /** Checked against password by the backend. */
    confirmPassword?: string;
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
    /** PENDING_APPROVAL: email verified, but a staff account still needs an administrator; no tokens are sent. */
    mfaMethod?: 'EMAIL' | 'TOTP' | 'EMAIL_VERIFY' | 'PENDING_APPROVAL';
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
    /** Checked against newPassword by the backend. */
    confirmPassword?: string;
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

export type AuthModalView =
    | 'login'
    | 'register'
    | 'verify-email'
    | 'verify-2fa'
    | 'forgot-password'
    | 'reset-password'
    | 'select-portal';

export type AuthEntryMode = 'login' | 'register';
export type Portal = 'admin' | 'operations' | 'customer';

export interface OtpCodeInputProps {
    value: string;
    onChange: (next: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
}

export interface AuthContextType {
    user: UserResponse | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    permissions: string[];
    permissionsReady: boolean;
    permissionError: Error | null;
    can: (code: string) => boolean;
    refreshPermissions: () => Promise<unknown>;
    /** Re-reads the signed-in user, e.g. after the profile name changed; ignored if the session switched meanwhile. */
    refreshUser: () => Promise<void>;
    login: (usernameOrEmail: string, password: string) => Promise<AuthResponse>;
    register: (data: RegisterRequest) => Promise<UserResponse>;
    completeAuth: (response: AuthResponse) => AuthResponse;
    logout: () => Promise<void>;
}

