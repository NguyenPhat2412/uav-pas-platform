'use client';

import React, {type FormEvent, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {Button, FormField, Input} from '@/components/ui';
import {toRegisterPayload} from '@/forms/auth/auth-form';
import {useAuthFlow} from '@/hooks/auth/useAuthFlow';
import {toast} from '@/providers/ToastContext';
import type {AuthResponse} from '@/types/auth/auth.types';
import {
    AUTH_INPUT_CLASS,
    AUTH_LABEL_CLASS,
    AuthGoogleEntry,
    type RegisterDraftState,
    type RunAuthAction,
} from '@/components/auth/AuthModalChrome';

export interface AuthRegisterStepProps {
    draft: RegisterDraftState;
    emailSignupOpen: boolean;
    submitting: boolean;
    invalid: (name: string) => true | undefined;
    onDraftChange: (patch: Partial<RegisterDraftState>) => void;
    onOpenEmailSignup: () => void;
    runAuthAction: RunAuthAction;
    onSignInResult: (response: AuthResponse, fallbackEmail: string) => void;
    onRegisteredChallenge: (challenge: {
        token: string;
        email: string;
        maskedEmail: string;
        devOtpPreview: string | null;
    }) => void;
}

export function AuthRegisterStep({
    draft,
    emailSignupOpen,
    submitting,
    invalid,
    onDraftChange,
    onOpenEmailSignup,
    runAuthAction,
    onSignInResult,
    onRegisteredChallenge,
}: AuthRegisterStepProps) {
    const authFlow = useAuthFlow();
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        void runAuthAction('Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.', async () => {
            const challenge = await authFlow.registerWithOtp(toRegisterPayload(draft));
            onRegisteredChallenge({
                token: challenge.challengeToken,
                email: challenge.email,
                maskedEmail: challenge.maskedEmail,
                devOtpPreview: challenge.devOtpPreview ?? null,
            });
            toast.info(challenge.message, 'Đã gửi mã OTP xác thực');
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Subtitle centred under the title so the heading block reads as one balanced unit. */}
            <div className="space-y-1 text-center">
                <h2 id="auth-modal-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                    Đăng ký tài khoản mới
                </h2>
                <p className="m-0 text-xs leading-5 text-slate-500 text-balance">
                    Tạo tài khoản khách hàng để đặt lịch và theo dõi nhiệm vụ bay.<br/>
                    Nhân sự vận hành?{' '}
                    <a href="/contact" className="whitespace-nowrap font-semibold text-primary hover:underline">
                        Liên hệ để được cấp tài khoản
                    </a>
                </p>
            </div>

            <AuthGoogleEntry
                text="signup_with"
                disabled={submitting}
                runAuthAction={runAuthAction}
                onSignInResult={onSignInResult}
            />

            {!emailSignupOpen ? (
                <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={submitting}
                    onClick={onOpenEmailSignup}
                    className="w-full border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                    Đăng ký bằng email
                </Button>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField
                            id="auth-reg-username"
                            label="Tên đăng nhập"
                            required
                            labelClassName={AUTH_LABEL_CLASS}
                        >
                            <Input
                                id="auth-reg-username"
                                name="username"
                                aria-invalid={invalid('username')}
                                type="text"
                                autoComplete="username"
                                aria-required
                                disabled={submitting}
                                value={draft.username}
                                onChange={(e) => onDraftChange({username: e.target.value})}
                                placeholder="khachhang_01"
                                className={AUTH_INPUT_CLASS}
                            />
                        </FormField>
                        <FormField
                            id="auth-reg-phone"
                            label="Số điện thoại"
                            required
                            labelClassName={AUTH_LABEL_CLASS}
                        >
                            <Input
                                id="auth-reg-phone"
                                name="phoneNumber"
                                aria-invalid={invalid('phoneNumber')}
                                type="tel"
                                autoComplete="tel"
                                aria-required
                                disabled={submitting}
                                value={draft.phoneNumber}
                                onChange={(e) => onDraftChange({phoneNumber: e.target.value})}
                                placeholder="0901234567"
                                className={AUTH_INPUT_CLASS}
                            />
                        </FormField>
                    </div>

                    <FormField
                        id="auth-reg-email"
                        label="Địa chỉ Email"
                        required
                        labelClassName={AUTH_LABEL_CLASS}
                    >
                        <Input
                            id="auth-reg-email"
                            name="email"
                            aria-invalid={invalid('email')}
                            type="email"
                            autoComplete="email"
                            aria-required
                            disabled={submitting}
                            value={draft.email}
                            onChange={(e) => onDraftChange({email: e.target.value})}
                            placeholder="ban@example.com"
                            className={AUTH_INPUT_CLASS}
                        />
                    </FormField>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <FormField
                            id="auth-reg-password"
                            label="Mật khẩu (≥ 8 ký tự)"
                            required
                            labelClassName={AUTH_LABEL_CLASS}
                        >
                            <div className="relative">
                                <Input
                                    id="auth-reg-password"
                                    name="password"
                                    aria-invalid={invalid('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    aria-required
                                    disabled={submitting}
                                    value={draft.password}
                                    onChange={(e) => onDraftChange({password: e.target.value})}
                                    placeholder="••••••••"
                                    className={`${AUTH_INPUT_CLASS} pr-9`}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0 text-slate-400 hover:bg-transparent hover:text-slate-700 focus:ring-0 focus:ring-offset-0"
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                                </Button>
                            </div>
                        </FormField>
                        <FormField
                            id="auth-reg-confirm"
                            label="Nhập lại mật khẩu"
                            required
                            labelClassName={AUTH_LABEL_CLASS}
                        >
                            <Input
                                id="auth-reg-confirm"
                                name="confirmPassword"
                                aria-invalid={invalid('confirmPassword')}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                aria-required
                                disabled={submitting}
                                value={draft.confirmPassword}
                                onChange={(e) => onDraftChange({confirmPassword: e.target.value})}
                                placeholder="••••••••"
                                className={AUTH_INPUT_CLASS}
                            />
                        </FormField>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={submitting}
                        loadingText="Đang xử lý..."
                        className="w-full text-xs font-bold uppercase tracking-wider text-white"
                    >
                        Đăng ký tài khoản
                    </Button>
                </>
            )}
        </form>
    );
}
