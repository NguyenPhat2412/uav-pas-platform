import {useMutation} from '@tanstack/react-query';
import {authService} from '@/api/auth/auth.api';
import {toForgotPasswordPayload, toRegisterPayload, toResetPasswordPayload, toVerifyOtpPayload, type RegisterFormDraft, type ResetPasswordFormDraft} from '@/shared/forms/auth/auth-form';
import type {OtpPurpose} from '@/shared/types/auth/auth.types';
import type {VerifyParams} from '@/forms/auth/sign-in-flow';

/** Sign-up, code and password-reset requests; screens never call the API directly. */
export function useAuthFlows() {
    const register = useMutation({
        mutationFn: (draft: RegisterFormDraft) => authService.registerWithOtp(toRegisterPayload(draft)),
        retry: false,
    });
    const verify = useMutation({
        mutationFn: ({params, code}: { params: VerifyParams; code: string }) => {
            const payload = toVerifyOtpPayload(params.challengeToken, params.email, code, params.method);
            return params.purpose === 'register' ? authService.verifyEmail(payload) : authService.verify2fa(payload);
        },
        retry: false,
    });
    const resend = useMutation({
        mutationFn: ({params, purpose}: { params: VerifyParams; purpose?: OtpPurpose }) =>
            authService.resendOtp({challengeToken: params.challengeToken, email: params.email, purpose}),
        retry: false,
    });
    const forgotPassword = useMutation({
        mutationFn: (email: string) => authService.forgotPassword(toForgotPasswordPayload(email)),
        retry: false,
    });
    const resetPassword = useMutation({
        mutationFn: (draft: ResetPasswordFormDraft) => authService.resetPassword(toResetPasswordPayload(draft)),
        retry: false,
    });
    return {register, verify, resend, forgotPassword, resetPassword};
}
