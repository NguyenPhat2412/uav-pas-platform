'use client';
/* eslint-disable @next/next/no-img-element -- the QR code is a generated data: URI; there is nothing for next/image to optimise. */

import {type FormEvent, useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {Copy} from 'lucide-react';
import {toast} from '@/providers/ToastContext';
import type {TwoFactorSetupResponse} from '@/types/auth/auth.types';
import {OtpCodeInput} from '@/components/auth/OtpCodeInput';
import {Alert, Button, Card, CardContent, FormField} from '@/components/ui';

export interface TwoFactorSetupWizardProps {
    setupState: TwoFactorSetupResponse;
    code: string;
    isSubmitting: boolean;
    onCodeChange: (nextCode: string) => void;
    onSubmit: (e: FormEvent) => void;
    onCancel: () => void;
}

export function TwoFactorSetupWizard({
    setupState,
    code,
    isSubmitting,
    onCodeChange,
    onSubmit,
    onCancel,
}: TwoFactorSetupWizardProps) {
    const [qr, setQr] = useState<{ uri: string; url: string } | null>(null);
    const otpauthUri = setupState.otpauthUri;
    const qrDataUrl = qr && qr.uri === otpauthUri ? qr.url : null;

    useEffect(() => {
        if (!otpauthUri) return;
        let active = true;
        QRCode.toDataURL(otpauthUri, {
            width: 176,
            margin: 1,
            color: {dark: '#0f172a', light: '#ffffff'},
        })
            .then(url => {
                if (active) setQr({uri: otpauthUri, url});
            })
            .catch(() => {
                /* Manual Base32 secret beside the QR image still sets up the authenticator app. */
            });
        return () => {
            active = false;
        };
    }, [otpauthUri]);

    return (
        <Card variant="surface" className="border-slate-200 bg-slate-50">
            <CardContent className="p-4">
                <form onSubmit={onSubmit} className="space-y-4">
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
                                <p className="m-0 font-bold text-slate-900">Quét mã QR bằng ứng dụng xác thực</p>
                                <p className="m-0 text-slate-600">Hoặc nhập khóa Base32:</p>
                                {setupState.secret && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <code className="rounded-control border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-bold tracking-wider text-primary">
                                            {setupState.secret}
                                        </code>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            leftIcon={<Copy size={12}/>}
                                            className="h-8 bg-white px-2.5 text-xs"
                                            onClick={() => {
                                                void navigator.clipboard.writeText(setupState.secret ?? '');
                                                toast.info('Đã sao chép khóa bí mật TOTP');
                                            }}
                                        >
                                            Sao chép
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {setupState.devOtpPreview && (
                        <Alert variant="info" className="py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span>
                                    Mã OTP (dev):{' '}
                                    <strong className="font-mono text-sm tracking-widest">{setupState.devOtpPreview}</strong>
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 bg-white px-2.5 text-xs font-bold text-uav-blue"
                                    onClick={() => onCodeChange(setupState.devOtpPreview ?? '')}
                                >
                                    Điền nhanh
                                </Button>
                            </div>
                        </Alert>
                    )}

                    <FormField label="Mã xác thực 6 chữ số" required>
                        <OtpCodeInput value={code} onChange={onCodeChange} disabled={isSubmitting}/>
                    </FormField>

                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" className="bg-white" onClick={onCancel}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            isLoading={isSubmitting}
                            loadingText="Đang kích hoạt..."
                        >
                            Xác nhận bật 2FA
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
