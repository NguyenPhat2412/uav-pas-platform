'use client';

import React, {useCallback, useRef, useState} from 'react';
import {Alert} from '@/components/ui';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';
import {authErrorMessage, authFieldErrors} from '@/forms/auth/auth-form';
import type {AuthModalView, AuthResponse} from '@/types/auth/auth.types';
import {availablePortalsForRole, canUsePortal, type Portal, portalForRole, portalHome} from '@/utils/auth/portal';
import {navigatePortalPath, safeNextPath} from '@/utils/auth/auth-entry';
import {AuthLoginStep} from '@/components/auth/AuthLoginStep';
import {
    AuthModalTopBar,
    INITIAL_REGISTER_DRAFT,
    type RegisterDraftState,
} from '@/components/auth/AuthModalChrome';
import {AuthPasswordRecoveryStep} from '@/components/auth/AuthPasswordRecoveryStep';
import {AuthPortalSelectStep} from '@/components/auth/AuthPortalSelectStep';
import {AuthRegisterStep} from '@/components/auth/AuthRegisterStep';
import {AuthVerificationStep} from '@/components/auth/AuthVerificationStep';
import {useAuthModalSync} from '@/components/auth/useAuthModalSync';

export type {AuthModalView};

export const OPEN_AUTH_MODAL_EVENT = 'uav:open-auth-modal';

export function openAuthModal(view: 'login' | 'register' | 'forgot-password' = 'login', next?: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<{ view: AuthModalView; next?: string }>(OPEN_AUTH_MODAL_EVENT, {
            detail: {view, next},
        }),
    );
}

function resolvePostLoginPath(role: string | undefined, next: string | null): string {
    const defaultPortal = portalForRole(role);
    const fallback = defaultPortal === 'operations' ? '/operations/overview' : portalHome(defaultPortal);
    const nextParam = safeNextPath(next);
    if (!nextParam) return fallback;
    const targetPortal: Portal | null = nextParam.startsWith('/admin')
        ? 'admin'
        : nextParam.startsWith('/operations')
            ? 'operations'
            : nextParam.startsWith('/customer')
                ? 'customer'
                : null;
    if (targetPortal && !canUsePortal(role, targetPortal)) return fallback;
    return nextParam;
}

function isStaffPortalPath(next: string | null | undefined): boolean {
    const safe = safeNextPath(next);
    return Boolean(safe && (safe.startsWith('/admin') || safe.startsWith('/operations')));
}

export function AuthModalPopup() {
    const {completeAuth} = useAuth();
    const dialogRef = useRef<HTMLDivElement>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [emailSignupOpen, setEmailSignupOpen] = useState(false);
    const [regDraft, setRegDraft] = useState<RegisterDraftState>(INITIAL_REGISTER_DRAFT);
    const [forgotEmail, setForgotEmail] = useState('');
    const [authenticatedPortals, setAuthenticatedPortals] = useState<Portal[]>([]);

    const clearFeedback = useCallback(() => {
        setError(null);
        setFieldErrors({});
    }, []);

    const {
        router,
        isOpen,
        setIsOpen,
        view,
        setView,
        nextPath,
        setNextPath,
        passwordLoginOpen,
        setPasswordLoginOpen,
        challenge,
        otpCode,
        setOtpCode,
        resendCooldown,
        closeModal,
        issueChallenge,
        refreshChallenge,
    } = useAuthModalSync({
        eventName: OPEN_AUTH_MODAL_EVENT,
        isStaffPortalPath,
        onClearFeedback: clearFeedback,
    });

    useDialogFocusTrap(dialogRef, isOpen, closeModal);

    const finishAuthentication = (response: AuthResponse, welcomeMessage: string) => {
        completeAuth(response);
        toast.success(welcomeMessage, 'Xác thực thành công');
        const portals = availablePortalsForRole(response.user?.role);
        if (!nextPath && portals.length > 1) {
            setAuthenticatedPortals(portals);
            setView('select-portal');
            return;
        }
        setIsOpen(false);
        const dest = resolvePostLoginPath(response.user?.role, nextPath);
        setNextPath(null);
        navigatePortalPath(dest, (href) => router.push(href));
    };

    const showFailure = (err: unknown, fallback: string) => {
        const onForm = Array.from(document.querySelectorAll<HTMLInputElement>('[role="dialog"] [name]')).map(el => el.name);
        const rejected = authFieldErrors(err, onForm);
        if (rejected) {
            setFieldErrors(rejected.fields);
            setError(rejected.message);
            document.querySelector<HTMLElement>(`[role="dialog"] [name="${rejected.orderedNames[0]}"]`)?.focus();
            return;
        }
        setError(authErrorMessage(err, fallback));
    };

    const runAuthAction = async (fallbackError: string, action: () => Promise<void>) => {
        clearFeedback();
        setSubmitting(true);
        try {
            await action();
        } catch (err) {
            showFailure(err, fallbackError);
        } finally {
            setSubmitting(false);
        }
    };

    const continueSignIn = (res: AuthResponse, fallbackEmail: string) => {
        if (res.mfaRequired) {
            const isEmailVerify = res.mfaMethod === 'EMAIL_VERIFY';
            issueChallenge(isEmailVerify ? 'verify-email' : 'verify-2fa', {
                token: res.challengeToken ?? '',
                email: res.user?.email ?? fallbackEmail,
                maskedEmail: res.maskedEmail ?? res.user?.email ?? '',
                mfaMethod: res.mfaMethod === 'TOTP' ? 'TOTP' : 'EMAIL',
                devOtpPreview: res.devOtpPreview ?? null,
            });
            toast.info(
                isEmailVerify
                    ? 'Vui lòng nhập mã OTP gửi qua email để kích hoạt tài khoản.'
                    : res.mfaMethod === 'TOTP'
                        ? 'Nhập mã 6 chữ số từ ứng dụng Google Authenticator.'
                        : 'Mã xác thực 2FA gồm 6 chữ số đã được gửi tới email của bạn.',
            );
            return;
        }
        finishAuthentication(
            res,
            `Xin chào ${res.user?.fullName || res.user?.username || 'bạn'}, đang chuyển vào hệ thống điều hành.`,
        );
    };

    if (!isOpen) return null;

    const invalid = (name: string) => (fieldErrors[name] ? true : undefined);
    const switchView = (target: AuthModalView) => {
        clearFeedback();
        setView(target);
    };

    return (
        <div
            ref={dialogRef}
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeModal();
            }}
        >
            <div className="relative w-full max-w-[440px] overflow-hidden rounded-overlay border border-slate-200 bg-white text-slate-900 shadow-2xl">
                <AuthModalTopBar view={view} onSwitchMode={switchView} onClose={closeModal}/>

                <div className="p-6">
                    {error && (
                        <Alert
                            variant="error"
                            className="mb-4 rounded-control border-primary/20 border-l-primary bg-uav-red-light px-3.5 py-2.5 text-xs font-semibold text-primary"
                        >
                            <span className="whitespace-pre-line text-xs font-semibold text-primary">{error}</span>
                        </Alert>
                    )}

                    {view === 'login' && (
                        <AuthLoginStep
                            usernameOrEmail={usernameOrEmail}
                            password={loginPassword}
                            passwordLoginOpen={passwordLoginOpen}
                            submitting={submitting}
                            invalid={invalid}
                            onUsernameOrEmailChange={setUsernameOrEmail}
                            onPasswordChange={setLoginPassword}
                            onOpenPasswordLogin={() => setPasswordLoginOpen(true)}
                            onForgotPassword={() => {
                                setForgotEmail(usernameOrEmail.includes('@') ? usernameOrEmail : '');
                                switchView('forgot-password');
                            }}
                            runAuthAction={runAuthAction}
                            onSignInResult={continueSignIn}
                        />
                    )}

                    {view === 'register' && (
                        <AuthRegisterStep
                            draft={regDraft}
                            emailSignupOpen={emailSignupOpen}
                            submitting={submitting}
                            invalid={invalid}
                            onDraftChange={(patch) => setRegDraft((prev) => ({...prev, ...patch}))}
                            onOpenEmailSignup={() => setEmailSignupOpen(true)}
                            runAuthAction={runAuthAction}
                            onSignInResult={continueSignIn}
                            onRegisteredChallenge={(next) => issueChallenge('verify-email', next)}
                        />
                    )}

                    {(view === 'verify-email' || view === 'verify-2fa') && (
                        <AuthVerificationStep
                            mode={view}
                            challenge={challenge}
                            otpCode={otpCode}
                            resendCooldown={resendCooldown}
                            submitting={submitting}
                            onOtpCodeChange={setOtpCode}
                            onBack={switchView}
                            runAuthAction={runAuthAction}
                            onVerified={finishAuthentication}
                            onPendingApproval={() => setView('login')}
                            onChallengeRefreshed={refreshChallenge}
                        />
                    )}

                    {(view === 'forgot-password' || view === 'reset-password') && (
                        <AuthPasswordRecoveryStep
                            mode={view}
                            forgotEmail={forgotEmail}
                            challenge={challenge}
                            otpCode={otpCode}
                            submitting={submitting}
                            invalid={invalid}
                            onForgotEmailChange={setForgotEmail}
                            onOtpCodeChange={setOtpCode}
                            onBack={switchView}
                            runAuthAction={runAuthAction}
                            onResetChallengeIssued={(next) => issueChallenge('reset-password', next)}
                            onPasswordResetComplete={(loginIdentifier) => {
                                setUsernameOrEmail(loginIdentifier);
                                setLoginPassword('');
                                setPasswordLoginOpen(true);
                                setView('login');
                            }}
                        />
                    )}

                    {view === 'select-portal' && (
                        <AuthPortalSelectStep
                            portals={authenticatedPortals}
                            onSelectPortal={(destination) => {
                                setIsOpen(false);
                                setNextPath(null);
                                navigatePortalPath(destination, (href) => router.push(href));
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
