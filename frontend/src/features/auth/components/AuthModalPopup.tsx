'use client';

import React, {type FormEvent, useCallback, useEffect, useState} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {
    ArrowLeft,
    Eye,
    EyeOff,
    KeyRound,
    Lock,
    Mail,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    UserPlus,
    X,
} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {toast} from '@/contexts/ToastContext';
import {authService} from '@/features/auth/services/auth.service';
import type {AuthResponse, TwoFactorMethod} from '@/features/auth/types/auth.types';
import {canUsePortal, type Portal, portalForRole, portalHome} from '@/features/auth/utils/portal';
import {OtpCodeInput} from '@/features/auth/components/OtpCodeInput';

export type AuthModalView =
    | 'login'
    | 'register'
    | 'verify-email'
    | 'verify-2fa'
    | 'forgot-password'
    | 'reset-password';

export const OPEN_AUTH_MODAL_EVENT = 'uav:open-auth-modal';

export function openAuthModal(view: 'login' | 'register' | 'forgot-password' = 'login', next?: string) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<{ view: AuthModalView; next?: string }>(OPEN_AUTH_MODAL_EVENT, {
            detail: {view, next},
        }),
    );
}

function resolvePostLoginPath(role: string | undefined, nextParam: string | null): string {
    const defaultPortal = portalForRole(role);
    const fallback = defaultPortal === 'operations' ? '/operations/overview' : portalHome(defaultPortal);
    if (!nextParam || !nextParam.startsWith('/') || nextParam.startsWith('//')) {
        return fallback;
    }
    const targetPortal: Portal | null = nextParam.startsWith('/admin')
        ? 'admin'
        : nextParam.startsWith('/operations')
            ? 'operations'
            : nextParam.startsWith('/customer')
                ? 'customer'
                : null;
    if (targetPortal && !canUsePortal(role, targetPortal)) {
        return fallback;
    }
    return nextParam;
}

export function AuthModalPopup() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const {login, completeAuth} = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<AuthModalView>('login');
    const [nextPath, setNextPath] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Login state
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Register state
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);

    // OTP & 2FA challenge state
    const [challengeToken, setChallengeToken] = useState('');
    const [challengeEmail, setChallengeEmail] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [mfaMethod, setMfaMethod] = useState<TwoFactorMethod>('EMAIL');
    const [otpCode, setOtpCode] = useState('');
    const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Password reset state
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    useEffect(() => {
        const authQuery = searchParams.get('auth');
        const nextQuery = searchParams.get('next');
        if (nextQuery) setNextPath(nextQuery);
        if (authQuery === 'login' || authQuery === 'register' || authQuery === 'forgot') {
            setError(null);
            setView(authQuery === 'forgot' ? 'forgot-password' : authQuery);
            setIsOpen(true);
        }
    }, [searchParams]);

    useEffect(() => {
        const handleCustomOpen = (event: Event) => {
            const detail = (event as CustomEvent<{ view: AuthModalView; next?: string }>).detail;
            setError(null);
            setView(detail?.view ?? 'login');
            if (detail?.next) setNextPath(detail.next);
            setIsOpen(true);
        };
        window.addEventListener(OPEN_AUTH_MODAL_EVENT, handleCustomOpen);
        return () => window.removeEventListener(OPEN_AUTH_MODAL_EVENT, handleCustomOpen);
    }, []);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setInterval(() => {
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        setError(null);
        if (searchParams.has('auth') || searchParams.has('next')) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('auth');
            params.delete('next');
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
        }
    }, [pathname, router, searchParams]);

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, closeModal]);

    const finishAuthentication = (response: AuthResponse, welcomeMessage: string) => {
        completeAuth(response);
        toast.success(welcomeMessage, 'Xác thực thành công');
        setIsOpen(false);
        const dest = resolvePostLoginPath(response.user?.role, nextPath);
        router.push(dest);
    };

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!usernameOrEmail.trim() || !loginPassword) {
            setError('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await login(usernameOrEmail.trim(), loginPassword);
            if (res.mfaRequired) {
                setChallengeToken(res.challengeToken ?? '');
                setChallengeEmail(res.user?.email ?? usernameOrEmail.trim());
                setMaskedEmail(res.maskedEmail ?? res.user?.email ?? '');
                setDevOtpPreview(res.devOtpPreview ?? null);
                setOtpCode('');
                setResendCooldown(60);
                if (res.mfaMethod === 'EMAIL_VERIFY') {
                    setView('verify-email');
                    toast.info('Vui lòng nhập mã OTP gửi qua email để kích hoạt tài khoản.');
                } else {
                    setMfaMethod(res.mfaMethod === 'TOTP' ? 'TOTP' : 'EMAIL');
                    setView('verify-2fa');
                    toast.info(
                        res.mfaMethod === 'TOTP'
                            ? 'Nhập mã 6 chữ số từ ứng dụng Google Authenticator.'
                            : 'Mã xác thực 2FA gồm 6 chữ số đã được gửi tới email của bạn.',
                    );
                }
                return;
            }
            finishAuthentication(
                res,
                `Xin chào ${res.user?.fullName || res.user?.username || 'bạn'}, đang chuyển vào hệ thống điều hành.`,
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Thông tin đăng nhập không chính xác.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegisterSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        const username = regUsername.trim();
        const email = regEmail.trim();
        const phoneNumber = regPhone.trim();

        if (username.length < 3 || username.length > 50) {
            setError('Tên đăng nhập phải từ 3 đến 50 ký tự.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Địa chỉ email không hợp lệ.');
            return;
        }
        if (!/^[0-9+\-\s()]{9,15}$/.test(phoneNumber)) {
            setError('Số điện thoại phải từ 9 đến 15 ký tự số.');
            return;
        }
        if (regPassword.length < 8) {
            setError('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }
        if (regPassword !== regConfirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setSubmitting(true);
        try {
            const challenge = await authService.registerWithOtp({
                username,
                email,
                phoneNumber,
                password: regPassword,
            });
            setChallengeToken(challenge.challengeToken);
            setChallengeEmail(challenge.email);
            setMaskedEmail(challenge.maskedEmail);
            setDevOtpPreview(challenge.devOtpPreview ?? null);
            setOtpCode('');
            setResendCooldown(60);
            setView('verify-email');
            toast.info(challenge.message, 'Đã gửi mã OTP xác thực');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyEmailSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (otpCode.trim().length !== 6) {
            setError('Vui lòng nhập đủ 6 chữ số OTP.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await authService.verifyEmail({
                challengeToken,
                email: challengeEmail,
                code: otpCode.trim(),
                method: 'EMAIL',
            });
            finishAuthentication(res, 'Xác thực email thành công! Tài khoản của bạn đã sẵn sàng.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mã OTP không chính xác hoặc đã hết hạn.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerify2faSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (otpCode.trim().length !== 6) {
            setError('Vui lòng nhập đủ 6 chữ số xác thực.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await authService.verify2fa({
                challengeToken,
                email: challengeEmail,
                code: otpCode.trim(),
                method: mfaMethod,
            });
            finishAuthentication(res, 'Xác thực bảo mật 2 lớp (2FA) thành công.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mã xác thực 2FA không chính xác.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendOtp = async (purposeOverride?: 'REGISTER_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET') => {
        setError(null);
        setSubmitting(true);
        try {
            const challenge = await authService.resendOtp({
                challengeToken,
                email: challengeEmail || forgotEmail,
                purpose: purposeOverride,
            });
            setChallengeToken(challenge.challengeToken);
            setMaskedEmail(challenge.maskedEmail);
            setDevOtpPreview(challenge.devOtpPreview ?? null);
            setOtpCode('');
            setResendCooldown(60);
            if (view === 'verify-2fa') {
                setMfaMethod('EMAIL');
            }
            toast.info(challenge.message, 'Đã gửi lại mã OTP');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể gửi lại mã OTP lúc này.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleForgotPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!forgotEmail.trim()) {
            setError('Vui lòng nhập địa chỉ email đã đăng ký.');
            return;
        }
        setSubmitting(true);
        try {
            const challenge = await authService.forgotPassword({email: forgotEmail.trim()});
            setChallengeToken(challenge.challengeToken);
            setChallengeEmail(challenge.email);
            setMaskedEmail(challenge.maskedEmail);
            setDevOtpPreview(challenge.devOtpPreview ?? null);
            setOtpCode('');
            setResendCooldown(60);
            setView('reset-password');
            toast.info(challenge.message, 'Khôi phục mật khẩu');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tìm thấy tài khoản với email này.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (otpCode.trim().length !== 6) {
            setError('Vui lòng nhập đủ 6 chữ số OTP.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await authService.resetPassword({
                challengeToken,
                email: challengeEmail || forgotEmail.trim(),
                code: otpCode.trim(),
                newPassword,
            });
            toast.success(res.message, 'Đặt lại mật khẩu thành công');
            setUsernameOrEmail(challengeEmail || forgotEmail.trim());
            setLoginPassword('');
            setView('login');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const inputClass =
        'h-10 w-full rounded-control border border-slate-300 bg-white px-3 text-[13px] font-normal text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50';
    const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeModal();
            }}
        >
            <div className="relative w-full max-w-[440px] overflow-hidden rounded-overlay border border-slate-200 bg-white text-slate-900 shadow-2xl">
                {/* Tactical Command Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-3 text-white">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-block h-2 w-2 rounded-badge bg-primary" aria-hidden="true" />
                        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-slate-200">
                            VJU UAV-PAS · CỔNG XÁC THỰC TẬP TRUNG
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-control text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                        aria-label="Đóng cửa sổ đăng nhập"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Top Mode Switcher for Login / Register */}
                {(view === 'login' || view === 'register') && (
                    <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50">
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setView('login');
                            }}
                            className={`flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                                view === 'login'
                                    ? 'border-b-2 border-b-primary bg-white text-primary'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Lock size={14} />
                            Đăng nhập
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setError(null);
                                setView('register');
                            }}
                            className={`flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                                view === 'register'
                                    ? 'border-b-2 border-b-primary bg-white text-primary'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <UserPlus size={14} />
                            Đăng ký tài khoản
                        </button>
                    </div>
                )}

                <div className="p-6">
                    {error && (
                        <div
                            role="alert"
                            className="mb-4 border-l-[3px] border-l-primary bg-uav-red-light px-3.5 py-2.5 text-xs font-semibold text-primary"
                        >
                            {error}
                        </div>
                    )}

                    {/* VIEW 1: LOGIN */}
                    {view === 'login' && (
                        <form onSubmit={(e) => void handleLoginSubmit(e)} className="space-y-4" noValidate>
                            <div>
                                <h2 id="auth-modal-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                                    Đăng nhập hệ thống
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Tự động nhận diện phân quyền Khách hàng, Vận hành bay hoặc Quản trị viên.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="auth-login-user" className={labelClass}>
                                    Email hoặc Tên đăng nhập
                                </label>
                                <input
                                    id="auth-login-user"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    disabled={submitting}
                                    value={usernameOrEmail}
                                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                                    placeholder="operator@vju.ac.vn hoặc username"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label htmlFor="auth-login-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                        Mật khẩu
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError(null);
                                            setForgotEmail(usernameOrEmail.includes('@') ? usernameOrEmail : '');
                                            setView('forgot-password');
                                        }}
                                        className="text-xs font-semibold text-uav-blue hover:underline"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        id="auth-login-password"
                                        type={showLoginPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        disabled={submitting}
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`${inputClass} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowLoginPassword((s) => !s)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    >
                                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                {submitting ? 'Đang xác thực...' : 'Đăng nhập vào cổng điều hành'}
                            </button>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>Hỗ trợ bảo mật Email OTP &amp; 2FA TOTP</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setView('register');
                                    }}
                                    className="font-bold text-primary hover:underline"
                                >
                                    Tạo tài khoản mới →
                                </button>
                            </div>
                        </form>
                    )}

                    {/* VIEW 2: REGISTER */}
                    {view === 'register' && (
                        <form onSubmit={(e) => void handleRegisterSubmit(e)} className="space-y-3.5" noValidate>
                            <div>
                                <h2 id="auth-modal-title" className="text-lg font-extrabold tracking-tight text-slate-900">
                                    Đăng ký tài khoản mới
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Xác thực qua mã OTP gửi về Email để kích hoạt tài khoản ngay lập tức.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="auth-reg-username" className={labelClass}>
                                        Tên đăng nhập
                                    </label>
                                    <input
                                        id="auth-reg-username"
                                        type="text"
                                        autoComplete="username"
                                        required
                                        disabled={submitting}
                                        value={regUsername}
                                        onChange={(e) => setRegUsername(e.target.value)}
                                        placeholder="pilot_vju"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="auth-reg-phone" className={labelClass}>
                                        Số điện thoại
                                    </label>
                                    <input
                                        id="auth-reg-phone"
                                        type="tel"
                                        autoComplete="tel"
                                        required
                                        disabled={submitting}
                                        value={regPhone}
                                        onChange={(e) => setRegPhone(e.target.value)}
                                        placeholder="0901234567"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="auth-reg-email" className={labelClass}>
                                    Địa chỉ Email (Nhận mã OTP)
                                </label>
                                <input
                                    id="auth-reg-email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    disabled={submitting}
                                    value={regEmail}
                                    onChange={(e) => setRegEmail(e.target.value)}
                                    placeholder="ban@doanhnghiep.vn"
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="auth-reg-password" className={labelClass}>
                                        Mật khẩu (≥ 8 ký tự)
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="auth-reg-password"
                                            type={showRegPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            disabled={submitting}
                                            value={regPassword}
                                            onChange={(e) => setRegPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className={`${inputClass} pr-9`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPassword((s) => !s)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                            aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                        >
                                            {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="auth-reg-confirm" className={labelClass}>
                                        Nhập lại mật khẩu
                                    </label>
                                    <input
                                        id="auth-reg-confirm"
                                        type={showRegPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        disabled={submitting}
                                        value={regConfirmPassword}
                                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                <Mail size={15} />
                                {submitting ? 'Đang gửi mã OTP...' : 'Đăng ký & Nhận mã OTP qua Email'}
                            </button>
                        </form>
                    )}

                    {/* VIEW 3: VERIFY EMAIL OTP */}
                    {view === 'verify-email' && (
                        <form onSubmit={(e) => void handleVerifyEmailSubmit(e)} className="space-y-4" noValidate>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-badge bg-uav-blue-light px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-uav-blue">
                                        <Mail size={12} /> Xác thực Email OTP
                                    </span>
                                    <h2 id="auth-modal-title" className="mt-1.5 text-lg font-extrabold text-slate-900">
                                        Nhập mã OTP 6 chữ số
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Mã xác thực đã được gửi tới <strong className="font-mono text-slate-800">{maskedEmail || challengeEmail}</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setView('register');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                                >
                                    <ArrowLeft size={14} /> Quay lại
                                </button>
                            </div>

                            {devOtpPreview && (
                                <div className="flex items-center justify-between border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-xs text-uav-blue">
                                    <span>
                                        Mã OTP (Chế độ Local Dev):{' '}
                                        <strong className="font-mono text-sm tracking-widest">{devOtpPreview}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setOtpCode(devOtpPreview)}
                                        className="rounded-control border border-uav-blue/30 bg-white px-2 py-0.5 font-bold text-uav-blue hover:bg-slate-50"
                                    >
                                        Điền nhanh
                                    </button>
                                </div>
                            )}

                            <OtpCodeInput value={otpCode} onChange={setOtpCode} disabled={submitting} />

                            <button
                                type="submit"
                                disabled={submitting || otpCode.length !== 6}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                <ShieldCheck size={16} />
                                {submitting ? 'Đang kiểm tra OTP...' : 'Xác nhận & Đăng nhập ngay'}
                            </button>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>Không nhận được email?</span>
                                <button
                                    type="button"
                                    disabled={submitting || resendCooldown > 0}
                                    onClick={() => void handleResendOtp('REGISTER_VERIFY')}
                                    className="inline-flex items-center gap-1 font-bold text-uav-blue hover:underline disabled:text-slate-400 disabled:no-underline"
                                >
                                    <RefreshCw size={12} />
                                    {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* VIEW 4: VERIFY 2FA (EMAIL OTP OR GOOGLE AUTHENTICATOR TOTP) */}
                    {view === 'verify-2fa' && (
                        <form onSubmit={(e) => void handleVerify2faSubmit(e)} className="space-y-4" noValidate>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-badge bg-uav-red-light px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                                        {mfaMethod === 'TOTP' ? <Smartphone size={12} /> : <ShieldCheck size={12} />}
                                        Bảo mật 2 lớp (2FA · {mfaMethod})
                                    </span>
                                    <h2 id="auth-modal-title" className="mt-1.5 text-lg font-extrabold text-slate-900">
                                        {mfaMethod === 'TOTP' ? 'Mã Google Authenticator' : 'Mã OTP bảo mật qua Email'}
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {mfaMethod === 'TOTP'
                                            ? 'Mở ứng dụng xác thực (Google Authenticator / Authy) và nhập 6 chữ số hiện tại.'
                                            : `Nhập mã 6 chữ số đã được gửi tới ${maskedEmail || challengeEmail}.`}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setView('login');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                                >
                                    <ArrowLeft size={14} /> Đổi tài khoản
                                </button>
                            </div>

                            {devOtpPreview && mfaMethod === 'EMAIL' && (
                                <div className="flex items-center justify-between border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-xs text-uav-blue">
                                    <span>
                                        Mã 2FA OTP (Local Dev):{' '}
                                        <strong className="font-mono text-sm tracking-widest">{devOtpPreview}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setOtpCode(devOtpPreview)}
                                        className="rounded-control border border-uav-blue/30 bg-white px-2 py-0.5 font-bold text-uav-blue hover:bg-slate-50"
                                    >
                                        Điền nhanh
                                    </button>
                                </div>
                            )}

                            <OtpCodeInput value={otpCode} onChange={setOtpCode} disabled={submitting} />

                            <button
                                type="submit"
                                disabled={submitting || otpCode.length !== 6}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                <ShieldCheck size={16} />
                                {submitting ? 'Đang xác thực 2FA...' : 'Xác thực 2FA & Truy cập'}
                            </button>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                                {mfaMethod === 'TOTP' ? (
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => void handleResendOtp('LOGIN_2FA')}
                                        className="font-bold text-uav-blue hover:underline"
                                    >
                                        Chuyển sang nhận mã OTP qua Email →
                                    </button>
                                ) : (
                                    <>
                                        <span>Chưa nhận được mã?</span>
                                        <button
                                            type="button"
                                            disabled={submitting || resendCooldown > 0}
                                            onClick={() => void handleResendOtp('LOGIN_2FA')}
                                            className="inline-flex items-center gap-1 font-bold text-uav-blue hover:underline disabled:text-slate-400"
                                        >
                                            <RefreshCw size={12} />
                                            {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã OTP'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    )}

                    {/* VIEW 5: FORGOT PASSWORD */}
                    {view === 'forgot-password' && (
                        <form onSubmit={(e) => void handleForgotPasswordSubmit(e)} className="space-y-4" noValidate>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-badge bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
                                        <KeyRound size={12} /> Khôi phục mật khẩu
                                    </span>
                                    <h2 id="auth-modal-title" className="mt-1.5 text-lg font-extrabold text-slate-900">
                                        Nhận mã OTP đặt lại mật khẩu
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Nhập địa chỉ email tài khoản để nhận mã xác thực OTP 6 chữ số.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setView('login');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                                >
                                    <ArrowLeft size={14} /> Đăng nhập
                                </button>
                            </div>

                            <div>
                                <label htmlFor="auth-forgot-email" className={labelClass}>
                                    Địa chỉ Email đã đăng ký
                                </label>
                                <input
                                    id="auth-forgot-email"
                                    type="email"
                                    required
                                    disabled={submitting}
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder="operator@vju.ac.vn"
                                    className={inputClass}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                <Mail size={15} />
                                {submitting ? 'Đang gửi mã OTP...' : 'Gửi mã OTP khôi phục'}
                            </button>
                        </form>
                    )}

                    {/* VIEW 6: RESET PASSWORD WITH OTP */}
                    {view === 'reset-password' && (
                        <form onSubmit={(e) => void handleResetPasswordSubmit(e)} className="space-y-4" noValidate>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-badge bg-uav-blue-light px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-uav-blue">
                                        <KeyRound size={12} /> Đặt mật khẩu mới
                                    </span>
                                    <h2 id="auth-modal-title" className="mt-1.5 text-lg font-extrabold text-slate-900">
                                        Xác nhận OTP &amp; Mật khẩu mới
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Mã OTP đã gửi tới <strong className="font-mono text-slate-800">{maskedEmail || challengeEmail}</strong>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError(null);
                                        setView('forgot-password');
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
                                >
                                    <ArrowLeft size={14} /> Quay lại
                                </button>
                            </div>

                            {devOtpPreview && (
                                <div className="flex items-center justify-between border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-xs text-uav-blue">
                                    <span>
                                        Mã OTP (Local Dev):{' '}
                                        <strong className="font-mono text-sm tracking-widest">{devOtpPreview}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setOtpCode(devOtpPreview)}
                                        className="rounded-control border border-uav-blue/30 bg-white px-2 py-0.5 font-bold text-uav-blue hover:bg-slate-50"
                                    >
                                        Điền nhanh
                                    </button>
                                </div>
                            )}

                            <OtpCodeInput value={otpCode} onChange={setOtpCode} disabled={submitting} />

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="auth-reset-new" className={labelClass}>
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        id="auth-reset-new"
                                        type="password"
                                        required
                                        disabled={submitting}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="auth-reset-confirm" className={labelClass}>
                                        Xác nhận mật khẩu
                                    </label>
                                    <input
                                        id="auth-reset-confirm"
                                        type="password"
                                        required
                                        disabled={submitting}
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || otpCode.length !== 6}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                            >
                                {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
