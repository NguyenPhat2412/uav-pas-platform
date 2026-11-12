'use client';

import React, {type FormEvent, useState} from 'react';
import {ArrowLeft, KeyRound, Mail} from 'lucide-react';
import {Badge, Button, FormField, Input, PasswordInput} from '@/components/ui';
import {toForgotPasswordPayload, toResetPasswordPayload} from '@/forms/auth/auth-form';
import {useAuthFlow} from '@/hooks/auth/useAuthFlow';
import {toast} from '@/providers/ToastContext';
import {OtpCodeInput} from '@/components/auth/OtpCodeInput';
import {
    AUTH_INPUT_CLASS,
    AUTH_LABEL_CLASS,
    type AuthChallengeState,
    AuthDevOtpBanner,
    type RunAuthAction,
} from '@/components/auth/AuthModalChrome';

export interface AuthPasswordRecoveryStepProps {
    mode: 'forgot-password' | 'reset-password';
    forgotEmail: string;
    challenge: AuthChallengeState;
    otpCode: string;
    submitting: boolean;
    invalid: (name: string) => true | undefined;
    onForgotEmailChange: (email: string) => void;
    onOtpCodeChange: (code: string) => void;
    onBack: (targetView: 'login' | 'forgot-password') => void;
    runAuthAction: RunAuthAction;
    onResetChallengeIssued: (next: {
        token: string;
        email: string;
        maskedEmail: string;
        devOtpPreview: string | null;
    }) => void;
    onPasswordResetComplete: (loginIdentifier: string) => void;
}

export function AuthPasswordRecoveryStep({
    mode,
    forgotEmail,
    challenge,
    otpCode,
    submitting,
    invalid,
    onForgotEmailChange,
    onOtpCodeChange,
    onBack,
    runAuthAction,
    onResetChallengeIssued,
    onPasswordResetComplete,
}: AuthPasswordRecoveryStepProps) {
    const authFlow = useAuthFlow();
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleForgotSubmit = (e: FormEvent) => {
        e.preventDefault();
        void runAuthAction('Chưa gửi được mã khôi phục. Vui lòng thử lại.', async () => {
            const next = await authFlow.forgotPassword(toForgotPasswordPayload(forgotEmail));
            setNewPassword('');
            setConfirmNewPassword('');
            onResetChallengeIssued({
                token: next.challengeToken,
                email: next.email,
                maskedEmail: next.maskedEmail,
                devOtpPreview: next.devOtpPreview ?? null,
            });
            toast.info(next.message, 'Khôi phục mật khẩu');
        });
    };

    const handleResetSubmit = (e: FormEvent) => {
        e.preventDefault();
        void runAuthAction('Không thể đặt lại mật khẩu.', async () => {
            const email = challenge.email || forgotEmail;
            const res = await authFlow.resetPassword(
                toResetPasswordPayload({
                    challengeToken: challenge.token,
                    email,
                    code: otpCode,
                    newPassword,
                    confirmPassword: confirmNewPassword,
                }),
            );
            toast.success(res.message, 'Đặt lại mật khẩu thành công');
            setNewPassword('');
            setConfirmNewPassword('');
            onPasswordResetComplete(challenge.email || forgotEmail.trim());
        });
    };

    if (mode === 'forgot-password') {
        return (
            <form onSubmit={handleForgotSubmit} className="space-y-4" noValidate>
                <h2 id="auth-modal-title" className="m-0 text-lg font-extrabold text-slate-900">
                    Nhận mã OTP đặt lại mật khẩu
                </h2>

                <FormField
                    id="auth-forgot-email"
                    label="Địa chỉ Email đã đăng ký"
                    required
                    labelClassName={AUTH_LABEL_CLASS}
                >
                    <Input
                        id="auth-forgot-email"
                        name="email"
                        aria-invalid={invalid('email')}
                        type="email"
                        aria-required
                        disabled={submitting}
                        value={forgotEmail}
                        onChange={(e) => onForgotEmailChange(e.target.value)}
                        placeholder="operator@example.com"
                        className={AUTH_INPUT_CLASS}
                    />
                </FormField>

                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={submitting}
                    loadingText="Đang gửi mã OTP..."
                    leftIcon={<Mail size={15}/>}
                    className="w-full text-xs font-bold uppercase tracking-wider text-white"
                >
                    Gửi mã OTP khôi phục
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft size={14}/>}
                    onClick={() => onBack('login')}
                    className="h-auto w-full py-1 text-xs font-semibold text-slate-500 hover:bg-transparent hover:text-slate-900 focus:ring-offset-0"
                >
                    Quay lại đăng nhập
                </Button>
            </form>
        );
    }

    return (
        <form onSubmit={handleResetSubmit} className="space-y-4" noValidate>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <Badge
                        variant="default"
                        size="sm"
                        icon={<KeyRound size={12}/>}
                        className="bg-uav-blue-light px-2 py-0.5 font-mono text-[10px] text-uav-blue"
                    >
                        Đặt mật khẩu mới
                    </Badge>
                    <h2 id="auth-modal-title" className="mt-1.5 text-lg font-extrabold text-slate-900">
                        Xác nhận OTP &amp; Mật khẩu mới
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Mã OTP đã gửi tới{' '}
                        <strong className="font-mono text-slate-800">
                            {challenge.maskedEmail || challenge.email}
                        </strong>
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft size={14}/>}
                    onClick={() => onBack('forgot-password')}
                    className="h-auto shrink-0 p-0 text-xs font-semibold text-slate-500 hover:bg-transparent hover:text-slate-900 focus:ring-offset-0"
                >
                    Quay lại
                </Button>
            </div>

            {challenge.devOtpPreview && (
                <AuthDevOtpBanner
                    label="Mã OTP (Local Dev)"
                    code={challenge.devOtpPreview}
                    onQuickFill={onOtpCodeChange}
                />
            )}

            <OtpCodeInput value={otpCode} onChange={onOtpCodeChange} disabled={submitting}/>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                    id="auth-reset-new"
                    label="Mật khẩu mới"
                    required
                    labelClassName={AUTH_LABEL_CLASS}
                    className="[&_button]:h-10 [&_button]:w-9"
                >
                    <PasswordInput
                        id="auth-reset-new"
                        name="newPassword"
                        aria-invalid={invalid('newPassword')}
                        aria-required
                        disabled={submitting}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${AUTH_INPUT_CLASS} pr-9`}
                    />
                </FormField>
                <FormField
                    id="auth-reset-confirm"
                    label="Xác nhận mật khẩu"
                    required
                    labelClassName={AUTH_LABEL_CLASS}
                    className="[&_button]:h-10 [&_button]:w-9"
                >
                    <PasswordInput
                        id="auth-reset-confirm"
                        name="confirmPassword"
                        aria-invalid={invalid('confirmPassword')}
                        aria-required
                        disabled={submitting}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${AUTH_INPUT_CLASS} pr-9`}
                    />
                </FormField>
            </div>

            <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={submitting}
                loadingText="Đang cập nhật..."
                className="w-full text-xs font-bold uppercase tracking-wider text-white"
            >
                Cập nhật mật khẩu mới
            </Button>
        </form>
    );
}
