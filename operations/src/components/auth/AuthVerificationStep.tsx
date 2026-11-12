'use client';

import React, {type FormEvent} from 'react';
import {ArrowLeft, Mail, RefreshCw, ShieldCheck, Smartphone} from 'lucide-react';
import {Badge, Button} from '@/components/ui';
import {toVerifyOtpPayload} from '@/forms/auth/auth-form';
import {useAuthFlow} from '@/hooks/auth/useAuthFlow';
import {toast} from '@/providers/ToastContext';
import type {AuthResponse} from '@/types/auth/auth.types';
import {OtpCodeInput} from '@/components/auth/OtpCodeInput';
import {
    type AuthChallengeState,
    AuthDevOtpBanner,
    type RunAuthAction,
} from '@/components/auth/AuthModalChrome';

export interface AuthVerificationStepProps {
    mode: 'verify-email' | 'verify-2fa';
    challenge: AuthChallengeState;
    otpCode: string;
    resendCooldown: number;
    submitting: boolean;
    onOtpCodeChange: (code: string) => void;
    onBack: (targetView: 'login' | 'register') => void;
    runAuthAction: RunAuthAction;
    onVerified: (response: AuthResponse, welcomeMessage: string) => void;
    onPendingApproval: () => void;
    onChallengeRefreshed: (next: {
        token: string;
        maskedEmail: string;
        devOtpPreview: string | null;
        forceEmail2fa: boolean;
    }) => void;
}

export function AuthVerificationStep({
    mode,
    challenge,
    otpCode,
    resendCooldown,
    submitting,
    onOtpCodeChange,
    onBack,
    runAuthAction,
    onVerified,
    onPendingApproval,
    onChallengeRefreshed,
}: AuthVerificationStepProps) {
    const authFlow = useAuthFlow();
    const isEmailVerify = mode === 'verify-email';
    const isTotp = !isEmailVerify && challenge.mfaMethod === 'TOTP';
    const displayEmail = challenge.maskedEmail || challenge.email;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isEmailVerify) {
            void runAuthAction('Mã OTP không chính xác hoặc đã hết hạn.', async () => {
                const res = await authFlow.verifyEmail(
                    toVerifyOtpPayload(challenge.token, challenge.email, otpCode, 'EMAIL'),
                );
                if (res.mfaMethod === 'PENDING_APPROVAL' && !res.accessToken) {
                    toast.success(
                        'Email đã được xác thực. Tài khoản Nhân sự vận hành đang chờ quản trị viên duyệt.',
                        'Đăng ký thành công',
                    );
                    onPendingApproval();
                    return;
                }
                onVerified(res, 'Xác thực email thành công! Tài khoản của bạn đã sẵn sàng.');
            });
            return;
        }

        void runAuthAction('Mã xác thực 2FA không chính xác.', async () => {
            const res = await authFlow.verify2fa(
                toVerifyOtpPayload(challenge.token, challenge.email, otpCode, challenge.mfaMethod),
            );
            onVerified(res, 'Xác thực bảo mật 2 lớp (2FA) thành công.');
        });
    };

    const handleResend = (purpose: 'REGISTER_VERIFY' | 'LOGIN_2FA') => {
        void runAuthAction('Không thể gửi lại mã OTP lúc này.', async () => {
            const next = await authFlow.resendOtp({
                challengeToken: challenge.token,
                email: challenge.email,
                purpose,
            });
            onChallengeRefreshed({
                token: next.challengeToken,
                maskedEmail: next.maskedEmail,
                devOtpPreview: next.devOtpPreview ?? null,
                forceEmail2fa: mode === 'verify-2fa',
            });
            toast.info(next.message, 'Đã gửi lại mã OTP');
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="flex items-start justify-between gap-3">
                <div>
                    {isEmailVerify ? (
                        <Badge
                            variant="default"
                            size="sm"
                            icon={<Mail size={12}/>}
                            className="bg-uav-blue-light px-2 py-0.5 font-mono text-[10px] text-uav-blue"
                        >
                            Xác thực Email OTP
                        </Badge>
                    ) : (
                        <Badge
                            variant="primary"
                            size="sm"
                            icon={isTotp ? <Smartphone size={12}/> : <ShieldCheck size={12}/>}
                            className="border-0 bg-uav-red-light px-2 py-0.5 font-mono text-[10px] text-primary"
                        >
                            Bảo mật 2 lớp (2FA · {challenge.mfaMethod})
                        </Badge>
                    )}

                    <h2 id="auth-modal-title" className="mt-1.5 text-lg font-extrabold text-slate-900">
                        {isEmailVerify
                            ? 'Nhập mã OTP 6 chữ số'
                            : isTotp
                                ? 'Mã Google Authenticator'
                                : 'Mã OTP bảo mật qua Email'}
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                        {isEmailVerify ? (
                            <>
                                Mã xác thực đã được gửi tới{' '}
                                <strong className="font-mono text-slate-800">{displayEmail}</strong>
                            </>
                        ) : isTotp ? (
                            'Mở ứng dụng xác thực (Google Authenticator / Authy) và nhập 6 chữ số hiện tại.'
                        ) : (
                            `Nhập mã 6 chữ số đã được gửi tới ${displayEmail}.`
                        )}
                    </p>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft size={14}/>}
                    onClick={() => onBack(isEmailVerify ? 'register' : 'login')}
                    className="h-auto shrink-0 p-0 text-xs font-semibold text-slate-500 hover:bg-transparent hover:text-slate-900 focus:ring-offset-0"
                >
                    {isEmailVerify ? 'Quay lại' : 'Đổi tài khoản'}
                </Button>
            </div>

            {challenge.devOtpPreview && (isEmailVerify || challenge.mfaMethod === 'EMAIL') && (
                <AuthDevOtpBanner
                    label={isEmailVerify ? 'Mã OTP (Chế độ Local Dev)' : 'Mã 2FA OTP (Local Dev)'}
                    code={challenge.devOtpPreview}
                    onQuickFill={onOtpCodeChange}
                />
            )}

            <OtpCodeInput value={otpCode} onChange={onOtpCodeChange} disabled={submitting}/>

            <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                loadingText={isEmailVerify ? 'Đang kiểm tra OTP...' : 'Đang xác thực 2FA...'}
                leftIcon={<ShieldCheck size={16}/>}
                className="w-full text-xs font-bold uppercase tracking-wider text-white"
            >
                {isEmailVerify ? 'Xác nhận & Đăng nhập ngay' : 'Xác thực 2FA & Truy cập'}
            </Button>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {isTotp ? (
                    <span>Mở ứng dụng xác thực (Google Authenticator) để lấy mã 6 số.</span>
                ) : (
                    <>
                        <span>{isEmailVerify ? 'Không nhận được email?' : 'Chưa nhận được mã?'}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={submitting || resendCooldown > 0}
                            leftIcon={<RefreshCw size={12}/>}
                            onClick={() => handleResend(isEmailVerify ? 'REGISTER_VERIFY' : 'LOGIN_2FA')}
                            className="h-auto p-0 text-xs font-bold text-uav-blue hover:bg-transparent hover:underline disabled:text-slate-400 disabled:no-underline focus:ring-offset-0"
                        >
                            {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
}
