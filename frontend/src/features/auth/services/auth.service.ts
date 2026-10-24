import {apiClient} from "@/lib/api";
import {API_ROUTES} from "@/lib/api/routes";
import type {
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    OtpChallengeResponse,
    RegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
    TwoFactorDisableRequest,
    TwoFactorSetupRequest,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
    TwoFactorVerifyRequest,
    UserResponse,
    VerifyOtpRequest,
} from "@/features/auth/types/auth.types";

export const authService = {
    async login(credentials: LoginRequest): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.login, credentials);
    },

    async register(data: RegisterRequest): Promise<UserResponse> {
        return apiClient.post<UserResponse>(API_ROUTES.auth.register, data);
    },

    async registerWithOtp(data: RegisterRequest): Promise<OtpChallengeResponse> {
        return apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.registerOtp, data);
    },

    async verifyEmail(data: VerifyOtpRequest): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.verifyEmail, data);
    },

    async verify2fa(data: VerifyOtpRequest): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.verify2fa, data);
    },

    async resendOtp(data: ResendOtpRequest): Promise<OtpChallengeResponse> {
        return apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.resendOtp, data);
    },

    async forgotPassword(data: ForgotPasswordRequest): Promise<OtpChallengeResponse> {
        return apiClient.post<OtpChallengeResponse>(API_ROUTES.auth.forgotPassword, data);
    },

    async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
        return apiClient.post<{ message: string }>(API_ROUTES.auth.resetPassword, data);
    },

    async get2faStatus(signal?: AbortSignal): Promise<TwoFactorStatusResponse> {
        return apiClient.get<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorStatus, {signal});
    },

    async setup2fa(data: TwoFactorSetupRequest): Promise<TwoFactorSetupResponse> {
        return apiClient.post<TwoFactorSetupResponse>(API_ROUTES.auth.twoFactorSetup, data);
    },

    async enable2fa(data: TwoFactorVerifyRequest): Promise<TwoFactorStatusResponse> {
        return apiClient.post<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorEnable, data);
    },

    async disable2fa(data: TwoFactorDisableRequest = {}): Promise<TwoFactorStatusResponse> {
        return apiClient.post<TwoFactorStatusResponse>(API_ROUTES.auth.twoFactorDisable, data);
    },

    async refreshToken(refreshToken: string): Promise<AuthResponse> {
        return apiClient.post<AuthResponse>(API_ROUTES.auth.refresh, {refreshToken});
    },

    async logout(refreshToken?: string): Promise<void> {
        try {
            await apiClient.post<{ message: string }>(API_ROUTES.auth.logout, {refreshToken});
        } catch (e) {
            console.warn('Backend logout call completed with note:', e);
        }
    },

    async getMe(): Promise<UserResponse> {
        return apiClient.get<UserResponse>(API_ROUTES.auth.me);
    },
};
