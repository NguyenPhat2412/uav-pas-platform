'use client';

import React, {type FormEvent, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {Button, FormField, Input} from '@/components/ui';
import {RequiredMark} from '@/components/shared/RequiredMark';
import {toLoginPayload} from '@/forms/auth/auth-form';
import {useAuth} from '@/providers/AuthContext';
import type {AuthResponse} from '@/types/auth/auth.types';
import {
    AUTH_INPUT_CLASS,
    AUTH_LABEL_CLASS,
    AuthGoogleEntry,
    type RunAuthAction,
} from '@/components/auth/AuthModalChrome';

export interface AuthLoginStepProps {
    usernameOrEmail: string;
    password: string;
    passwordLoginOpen: boolean;
    submitting: boolean;
    invalid: (name: string) => true | undefined;
    onUsernameOrEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onOpenPasswordLogin: () => void;
    onForgotPassword: () => void;
    runAuthAction: RunAuthAction;
    onSignInResult: (response: AuthResponse, fallbackEmail: string) => void;
}

export function AuthLoginStep({
    usernameOrEmail,
    password,
    passwordLoginOpen,
    submitting,
    invalid,
    onUsernameOrEmailChange,
    onPasswordChange,
    onOpenPasswordLogin,
    onForgotPassword,
    runAuthAction,
    onSignInResult,
}: AuthLoginStepProps) {
    const {login} = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        void runAuthAction('Thông tin đăng nhập không chính xác.', async () => {
            const payload = toLoginPayload(usernameOrEmail, password);
            const res = await login(payload.usernameOrEmail, payload.password);
            onSignInResult(res, payload.usernameOrEmail);
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="text-center">
                <h2 id="auth-modal-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                    Đăng nhập hệ thống
                </h2>
                <p className="m-0 mt-1 text-xs text-slate-500">
                    Đăng nhập nhanh và an toàn bằng tài khoản Google.
                </p>
            </div>

            <AuthGoogleEntry
                text="signin_with"
                disabled={submitting}
                runAuthAction={runAuthAction}
                onSignInResult={onSignInResult}
            />

            {!passwordLoginOpen ? (
                <Button
                    type="button"
                    variant="outline"
                    size="md"
                    disabled={submitting}
                    onClick={onOpenPasswordLogin}
                    className="w-full border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                    Đăng nhập bằng email &amp; mật khẩu
                </Button>
            ) : (
                <>
                    <FormField
                        id="auth-login-user"
                        label="Email hoặc Tên đăng nhập"
                        required
                        labelClassName={AUTH_LABEL_CLASS}
                    >
                        <Input
                            id="auth-login-user"
                            name="usernameOrEmail"
                            aria-invalid={invalid('usernameOrEmail')}
                            type="text"
                            autoComplete="username"
                            aria-required
                            disabled={submitting}
                            value={usernameOrEmail}
                            onChange={(e) => onUsernameOrEmailChange(e.target.value)}
                            placeholder="ban@gmail.com hoặc username"
                            className={AUTH_INPUT_CLASS}
                        />
                    </FormField>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label htmlFor="auth-login-password" className={AUTH_LABEL_CLASS}>
                                Mật khẩu<RequiredMark/>
                            </label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={onForgotPassword}
                                className="h-auto p-0 text-xs font-semibold text-uav-blue hover:bg-transparent hover:underline focus:ring-offset-0"
                            >
                                Quên mật khẩu?
                            </Button>
                        </div>
                        <div className="relative">
                            <Input
                                id="auth-login-password"
                                name="password"
                                aria-invalid={invalid('password')}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                aria-required
                                disabled={submitting}
                                value={password}
                                onChange={(e) => onPasswordChange(e.target.value)}
                                placeholder="••••••••"
                                className={`${AUTH_INPUT_CLASS} pr-10`}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0 text-slate-400 hover:bg-transparent hover:text-slate-700 focus:ring-0 focus:ring-offset-0"
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            >
                                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </Button>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={submitting}
                        loadingText="Đang xử lý..."
                        className="w-full text-xs font-bold uppercase tracking-wider text-white"
                    >
                        Đăng nhập
                    </Button>
                </>
            )}
        </form>
    );
}
