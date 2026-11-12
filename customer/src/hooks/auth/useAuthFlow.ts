'use client';
import {authService} from '@/api/auth/auth.api';

/**
 * The sign-in dialog's account steps (Google, OTP registration, email and 2FA codes, password reset).
 * Each step answers with the next screen to show and nothing is cached, so these are plain requests
 * the dialog awaits with its own submitting and error state, not React Query mutations.
 */
export function useAuthFlow() {
    return AUTH_FLOW;
}

const AUTH_FLOW = {
    loginWithGoogle: authService.loginWithGoogle,
    registerWithOtp: authService.registerWithOtp,
    verifyEmail: authService.verifyEmail,
    verify2fa: authService.verify2fa,
    resendOtp: authService.resendOtp,
    forgotPassword: authService.forgotPassword,
    resetPassword: authService.resetPassword,
};
