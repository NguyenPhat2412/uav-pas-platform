'use client';

import React from 'react';
import {Lock, UserPlus, X} from 'lucide-react';
import {Alert, Button} from '@/components/ui';
import {useAuthFlow} from '@/hooks/auth/useAuthFlow';
import {useI18n} from '@/providers/I18nContext';
import type {AppleCredentialPayload, AuthModalView, AuthResponse, TwoFactorMethod} from '@/types/auth/auth.types';
import {AppleSignInButton} from '@/components/auth/AppleSignInButton';
import {GoogleSignInButton} from '@/components/auth/GoogleSignInButton';

export const AUTH_INPUT_CLASS =
    'h-10 rounded-control border-slate-300 bg-white px-3 text-[13px] font-normal text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50 aria-[invalid=true]:border-primary aria-[invalid=true]:bg-uav-red-light/40';

export const AUTH_LABEL_CLASS =
    'text-[11px] font-bold uppercase tracking-wider text-slate-600';

export interface AuthChallengeState {
    token: string;
    email: string;
    maskedEmail: string;
    mfaMethod: TwoFactorMethod;
    devOtpPreview: string | null;
}

export interface RegisterDraftState {
    username: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
}

export const INITIAL_CHALLENGE: AuthChallengeState = {
    token: '',
    email: '',
    maskedEmail: '',
    mfaMethod: 'EMAIL',
    devOtpPreview: null,
};

export const INITIAL_REGISTER_DRAFT: RegisterDraftState = {
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
};

export type RunAuthAction = (fallbackError: string, action: () => Promise<void>) => Promise<void>;

interface AuthModalTopBarProps {
    view: AuthModalView;
    onSwitchMode: (mode: 'login' | 'register') => void;
    onClose: () => void;
}

export function AuthModalTopBar({view, onSwitchMode, onClose}: AuthModalTopBarProps) {
    return (
        <>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-3 text-white">
                <div className="flex items-center gap-2.5">
                    <span className="inline-block h-2 w-2 rounded-badge bg-primary" aria-hidden="true"/>
                    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-200">
                        UAV PAS · CỔNG XÁC THỰC
                    </span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-800 hover:text-white focus:ring-offset-slate-900"
                    aria-label="Đóng cửa sổ đăng nhập"
                >
                    <X size={16}/>
                </Button>
            </div>

            {(view === 'login' || view === 'register') && (
                <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
                    <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        leftIcon={<Lock size={14}/>}
                        onClick={() => onSwitchMode('login')}
                        className={`h-auto rounded-none py-3 text-xs font-bold uppercase tracking-wider focus:ring-offset-0 ${
                            view === 'login'
                                ? 'border-b-2 border-b-primary bg-white text-primary hover:bg-white'
                                : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'
                        }`}
                    >
                        Đăng nhập
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        leftIcon={<UserPlus size={14}/>}
                        onClick={() => onSwitchMode('register')}
                        className={`h-auto rounded-none py-3 text-xs font-bold uppercase tracking-wider focus:ring-offset-0 ${
                            view === 'register'
                                ? 'border-b-2 border-b-primary bg-white text-primary hover:bg-white'
                                : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'
                        }`}
                    >
                        Đăng ký tài khoản
                    </Button>
                </div>
            )}
        </>
    );
}

interface AuthGoogleEntryProps {
    text?: 'signin_with' | 'signup_with';
    disabled: boolean;
    runAuthAction: RunAuthAction;
    onSignInResult: (response: AuthResponse, fallbackEmail: string) => void;
}

export function AuthGoogleEntry({
    text = 'signin_with',
    disabled,
    runAuthAction,
    onSignInResult,
}: AuthGoogleEntryProps) {
    const {t} = useI18n();
    const authFlow = useAuthFlow();

    const handleGoogleCredential = (credential: string) => {
        if (disabled) return;
        void runAuthAction('Không đăng nhập được bằng Google. Vui lòng thử lại.', async () => {
            const res = await authFlow.loginWithGoogle(credential);
            onSignInResult(res, res.user?.email ?? '');
        });
    };

    const handleAppleCredential = ({email, ...payload}: AppleCredentialPayload) => {
        if (disabled) return;
        void runAuthAction('Không đăng nhập được bằng Apple. Vui lòng thử lại.', async () => {
            const res = await authFlow.loginWithApple(payload);
            onSignInResult(res, res.user?.email ?? email ?? '');
        });
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-2.5">
                <GoogleSignInButton text={text} disabled={disabled} onCredential={handleGoogleCredential}/>
                <AppleSignInButton text={text} disabled={disabled} onCredential={handleAppleCredential}/>
            </div>
            <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200"/>
                {t('auth.orDivider')}
                <span className="h-px flex-1 bg-slate-200"/>
            </div>
        </>
    );
}

export const AuthSocialEntry = AuthGoogleEntry;

interface AuthDevOtpBannerProps {
    label: string;
    code: string;
    onQuickFill: (code: string) => void;
}

export function AuthDevOtpBanner({label, code, onQuickFill}: AuthDevOtpBannerProps) {
    return (
        <Alert
            variant="info"
            role="status"
            icon={null}
            className="rounded-control border-uav-blue/20 border-l-uav-blue bg-uav-blue-light px-3 py-2 text-xs text-uav-blue [&>div:first-child]:hidden"
        >
            <div className="flex items-center justify-between gap-2 text-xs text-uav-blue">
                <span>
                    {label}:{' '}
                    <strong className="font-mono text-sm tracking-widest">{code}</strong>
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onQuickFill(code)}
                    className="h-6 border-uav-blue/30 bg-white px-2 py-0.5 text-xs font-bold text-uav-blue hover:bg-slate-50 focus:ring-offset-0"
                >
                    Điền nhanh
                </Button>
            </div>
        </Alert>
    );
}
