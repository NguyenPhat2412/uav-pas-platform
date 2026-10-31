'use client';

import React, {type FormEvent, useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {Copy, Mail, QrCode, ShieldAlert, ShieldCheck, Smartphone} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';
import {useDisableTwoFactor, useEnableTwoFactor, useTwoFactorSetup, useTwoFactorStatus} from '@/hooks/profile/useProfile';
import type {TwoFactorMethod, TwoFactorSetupResponse} from '@/types/auth/auth.types';
import {OtpCodeInput} from '@/components/auth/OtpCodeInput';

export function TwoFactorSettingsCard() {
    const {user, refreshUser} = useAuth();
    const statusQuery = useTwoFactorStatus();

    const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('EMAIL');
    const [setupState, setSetupState] = useState<TwoFactorSetupResponse | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);

    useEffect(() => {
        if (statusQuery.data?.method) {
            setSelectedMethod(statusQuery.data.method);
        }
    }, [statusQuery.data?.method]);

    useEffect(() => {
        let active = true;
        if (setupState?.otpauthUri) {
            void QRCode.toDataURL(setupState.otpauthUri, {
                width: 176,
                margin: 1,
                color: {dark: '#0f172a', light: '#ffffff'},
            }).then((url) => {
                if (active) setQrDataUrl(url);
            });
        } else {
            setQrDataUrl(null);
        }
        return () => {
            active = false;
        };
    }, [setupState?.otpauthUri]);

    const setupMutation = useTwoFactorSetup({
        onSuccess: (data) => {
            setSetupState(data);
            setCode('');
            toast.info(data.message, 'Thiết lập bảo mật 2 lớp');
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Không thể khởi tạo thiết lập 2FA');
        },
    });

    const enableMutation = useEnableTwoFactor({
        onSuccess: (data) => {
            setSetupState(null);
            setCode('');
            void refreshUser();
            toast.success(
                `Đã kích hoạt bảo mật 2 lớp (${data.method === 'TOTP' ? 'Google Authenticator' : 'Email OTP'}).`,
                'Bảo mật 2FA',
            );
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Mã xác thực 2FA không chính xác');
        },
    });

    const disableMutation = useDisableTwoFactor({
        onSuccess: () => {
            setShowDisableConfirm(false);
            setDisablePassword('');
            setSetupState(null);
            void refreshUser();
            toast.info('Đã tắt xác thực 2 lớp (2FA) cho tài khoản.', 'Bảo mật 2FA');
        },
        onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Không thể tắt 2FA');
        },
    });

    const handleEnableSubmit = (e: FormEvent) => {
        e.preventDefault();
        enableMutation.mutate({
            method: setupState?.method ?? selectedMethod,
            challengeToken: setupState?.challengeToken,
            code: code.trim(),
        });
    };

    const status = statusQuery.data;

    return (
        <section className="rounded-panel border border-slate-200 bg-white" aria-labelledby="two-factor-title">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={17} className="text-primary" aria-hidden="true" />
                    <h2 id="two-factor-title" className="m-0 text-[15px] font-bold text-slate-900">
                        Bảo mật 2 lớp (2FA)
                    </h2>
                </div>
                {status && (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-badge px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                            status.enabled
                                ? 'border border-uav-blue/25 bg-uav-blue-light text-uav-blue'
                                : 'border border-slate-200 bg-slate-100 text-slate-600'
                        }`}
                    >
                        {status.enabled ? `ĐANG BẬT · ${status.method}` : 'CHƯA BẬT'}
                    </span>
                )}
            </header>

            <div className="space-y-4 p-5">
                {statusQuery.isPending ? (
                    <p className="m-0 text-xs text-slate-500">Đang tải…</p>
                ) : (
                    <>
                        <p className="m-0 text-xs text-slate-500">Mã 6 chữ số qua email hoặc ứng dụng khi đăng nhập.</p>

                        {/* Method Selector */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMethod('EMAIL');
                                    setSetupState(null);
                                }}
                                className={`flex items-start gap-3 rounded-control border p-3.5 text-left transition-colors ${
                                    selectedMethod === 'EMAIL'
                                        ? 'border-primary bg-uav-red-light/50'
                                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                                }`}
                            >
                                <Mail size={18} className="mt-0.5 shrink-0 text-primary" />
                                <div>
                                    <div className="text-xs font-bold text-slate-900">Email OTP (6 chữ số)</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        Gửi mã tới {status?.maskedEmail || user?.email}
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedMethod('TOTP');
                                    setSetupState(null);
                                }}
                                className={`flex items-start gap-3 rounded-control border p-3.5 text-left transition-colors ${
                                    selectedMethod === 'TOTP'
                                        ? 'border-primary bg-uav-red-light/50'
                                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                                }`}
                            >
                                <Smartphone size={18} className="mt-0.5 shrink-0 text-uav-blue" />
                                <div>
                                    <div className="text-xs font-bold text-slate-900">Google Authenticator (TOTP)</div>
                                    <div className="mt-0.5 text-[11px] text-slate-500">
                                        Mã đổi mỗi 30 giây trên điện thoại
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Setup Action Button */}
                        {!setupState && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    disabled={setupMutation.isPending}
                                    onClick={() => setupMutation.mutate(selectedMethod)}
                                    className="inline-flex h-9 items-center gap-2 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                                >
                                    {selectedMethod === 'TOTP' ? <QrCode size={14} /> : <Mail size={14} />}
                                    {setupMutation.isPending
                                        ? 'Đang khởi tạo...'
                                        : status?.enabled && status.method === selectedMethod
                                            ? `Cấu hình lại ${selectedMethod}`
                                            : `Bật 2FA (${selectedMethod})`}
                                </button>

                                {status?.enabled && !showDisableConfirm && (
                                    <button
                                        type="button"
                                        onClick={() => setShowDisableConfirm(true)}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <ShieldAlert size={14} className="text-warning" />
                                        Tắt 2FA
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Active Setup Verification Step */}
                        {setupState && (
                            <form
                                onSubmit={handleEnableSubmit}
                                className="space-y-4 rounded-control border border-slate-200 bg-slate-50 p-4"
                            >
                                {setupState.method === 'TOTP' && (
                                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                                        {qrDataUrl && (
                                            <img
                                                src={qrDataUrl}
                                                alt="Mã QR Google Authenticator"
                                                width={148}
                                                height={148}
                                                className="rounded-control border border-slate-200 bg-white p-2"
                                            />
                                        )}
                                        <div className="flex-1 space-y-2 text-xs">
                                            <p className="m-0 font-bold text-slate-900">
                                                Quét mã QR bằng ứng dụng xác thực
                                            </p>
                                            <p className="m-0 text-slate-600">
                                                Hoặc nhập khóa Base32:
                                            </p>
                                            {setupState.secret && (
                                                <div className="flex items-center gap-2">
                                                    <code className="rounded-control border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold tracking-wider text-primary">
                                                        {setupState.secret}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void navigator.clipboard.writeText(setupState.secret ?? '');
                                                            toast.info('Đã sao chép khóa bí mật TOTP');
                                                        }}
                                                        className="inline-flex h-8 items-center gap-1 rounded-control border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        <Copy size={12} /> Sao chép
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {setupState.devOtpPreview && (
                                    <div className="flex items-center justify-between border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-xs text-uav-blue">
                                        <span>
                                            Mã OTP (dev):{' '}
                                            <strong className="font-mono text-sm tracking-widest">
                                                {setupState.devOtpPreview}
                                            </strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setCode(setupState.devOtpPreview ?? '')}
                                            className="rounded-control border border-uav-blue/30 bg-white px-2 py-0.5 font-bold text-uav-blue"
                                        >
                                            Điền nhanh
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                        Mã xác thực 6 chữ số
                                    </label>
                                    <OtpCodeInput
                                        value={code}
                                        onChange={setCode}
                                        disabled={enableMutation.isPending}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSetupState(null)}
                                        className="h-9 rounded-control border border-slate-300 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={enableMutation.isPending}
                                        className="h-9 rounded-control bg-primary px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-hover disabled:opacity-50"
                                    >
                                        {enableMutation.isPending ? 'Đang kích hoạt...' : 'Xác nhận bật 2FA'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Disable Confirmation */}
                        {showDisableConfirm && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (disablePassword && !disableMutation.isPending) disableMutation.mutate(disablePassword);
                                }}
                                className="space-y-3 rounded-control border border-amber-200 bg-amber-50/70 p-4"
                            >
                                <label htmlFor="two-factor-disable-password" className="m-0 block text-xs font-semibold text-slate-800">
                                    Nhập mật khẩu hiện tại để tắt 2FA:
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        id="two-factor-disable-password"
                                        type="password"
                                        name="password"
                                        autoComplete="current-password"
                                        required
                                        value={disablePassword}
                                        onChange={(e) => setDisablePassword(e.target.value)}
                                        placeholder="Mật khẩu tài khoản"
                                        className="h-9 flex-1 rounded-control border border-slate-300 bg-white px-3 text-xs focus:border-primary focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowDisableConfirm(false);
                                            setDisablePassword('');
                                        }}
                                        className="h-9 rounded-control border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
                                    >
                                        Giữ 2FA
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={disableMutation.isPending || !disablePassword}
                                        className="h-9 rounded-control bg-primary px-3.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50"
                                    >
                                        {disableMutation.isPending ? 'Đang xử lý...' : 'Xác nhận tắt'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
