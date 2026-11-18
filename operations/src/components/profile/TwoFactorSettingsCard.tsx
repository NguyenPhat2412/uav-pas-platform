'use client';

import {type FormEvent, useState} from 'react';
import {Mail, QrCode, ShieldAlert, ShieldCheck, Smartphone} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useDisableTwoFactor, useEnableTwoFactor, useTwoFactorSetup, useTwoFactorStatus} from '@/hooks/profile/useProfile';
import {canSubmitDisableTwoFactor, toEnableTwoFactorPayload} from '@/forms/auth/auth-form';
import type {TwoFactorMethod, TwoFactorSetupResponse} from '@/types/auth/auth.types';
import {Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, FormField, Input} from '@/components/ui';
import {cn} from '@/lib/utils';
import {TwoFactorSetupWizard} from '@/components/profile/TwoFactorSetupWizard';

export function TwoFactorSettingsCard() {
    const {user, refreshUser} = useAuth();
    const {t} = useI18n();
    const statusQuery = useTwoFactorStatus();

    const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('EMAIL');
    const [setupState, setSetupState] = useState<TwoFactorSetupResponse | null>(null);
    const [code, setCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);

    // Follow the account's saved method whenever the server reports a different one.
    const serverMethod = statusQuery.data?.method;
    const [followedMethod, setFollowedMethod] = useState(serverMethod);
    if (serverMethod && serverMethod !== followedMethod) {
        setFollowedMethod(serverMethod);
        setSelectedMethod(serverMethod);
    }

    const setupMutation = useTwoFactorSetup({
        onSuccess: data => {
            setSetupState(data);
            setCode('');
            toast.info(data.message, 'Thiết lập bảo mật 2 lớp');
        },
        onError: err => toast.error(err instanceof Error ? err.message : 'Không thể khởi tạo thiết lập 2FA'),
    });

    const enableMutation = useEnableTwoFactor({
        onSuccess: data => {
            setSetupState(null);
            setCode('');
            void refreshUser();
            toast.success(
                `Đã kích hoạt bảo mật 2 lớp (${data.method === 'TOTP' ? 'Google Authenticator' : 'Email OTP'}).`,
                'Bảo mật 2FA',
            );
        },
        onError: err => toast.error(err instanceof Error ? err.message : 'Mã xác thực 2FA không chính xác'),
    });

    const disableMutation = useDisableTwoFactor({
        onSuccess: () => {
            setShowDisableConfirm(false);
            setDisablePassword('');
            setSetupState(null);
            void refreshUser();
            toast.info('Đã tắt xác thực 2 lớp (2FA) cho tài khoản.', 'Bảo mật 2FA');
        },
        onError: err => toast.error(err instanceof Error ? err.message : 'Không thể tắt 2FA'),
    });

    const handleEnableSubmit = (e: FormEvent) => {
        e.preventDefault();
        enableMutation.mutate(toEnableTwoFactorPayload(setupState?.method ?? selectedMethod, setupState?.challengeToken, code));
    };

    const status = statusQuery.data;
    const methodOptions: Array<{method: TwoFactorMethod; title: string; subtitle: string; icon: typeof Mail; iconClass: string}> = [
        {
            method: 'EMAIL',
            title: 'Email OTP (6 chữ số)',
            subtitle: `Gửi mã tới ${status?.maskedEmail || user?.email || ''}`,
            icon: Mail,
            iconClass: 'text-primary',
        },
        {
            method: 'TOTP',
            title: 'Google Authenticator (TOTP)',
            subtitle: 'Mã đổi mỗi 30 giây trên điện thoại',
            icon: Smartphone,
            iconClass: 'text-uav-blue',
        },
    ];

    return (
        <Card aria-labelledby="two-factor-title">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={17} className="text-primary" aria-hidden="true"/>
                    <CardTitle id="two-factor-title" className="m-0 text-[15px] font-bold text-slate-900">
                        Bảo mật 2 lớp (2FA)
                    </CardTitle>
                </div>
                {status && (
                    <Badge
                        variant={status.enabled ? 'secondary' : 'default'}
                        className={cn('font-mono', status.enabled && 'border border-uav-blue/25 bg-uav-blue-light text-uav-blue')}
                    >
                        {status.enabled ? `ĐANG BẬT · ${status.method}` : 'CHƯA BẬT'}
                    </Badge>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                {statusQuery.isPending ? (
                    <div role="status" aria-label={t('common.loading')} className="animate-pulse space-y-3">
                        <span className="sr-only">{t('common.loading')}</span>
                        <div className="h-3.5 w-56 rounded-badge bg-slate-100"/>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="h-16 rounded-control bg-slate-100"/>
                            <div className="h-16 rounded-control bg-slate-100"/>
                        </div>
                    </div>
                ) : (
                    <>
                        <CardDescription className="m-0 text-xs text-slate-500">
                            Mã 6 chữ số qua email hoặc ứng dụng khi đăng nhập.
                        </CardDescription>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {methodOptions.map(({method, title, subtitle, icon: Icon, iconClass}) => (
                                <Button
                                    key={method}
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setSelectedMethod(method); setSetupState(null); }}
                                    className={cn(
                                        'h-auto w-full items-start justify-start gap-3 p-3.5 text-left font-normal',
                                        selectedMethod === method
                                            ? 'border-primary bg-uav-red-light/50 hover:bg-uav-red-light/60'
                                            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300',
                                    )}
                                >
                                    <Icon size={18} className={cn('mt-0.5 shrink-0', iconClass)}/>
                                    <div>
                                        <div className="text-xs font-bold text-slate-900">{title}</div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>
                                    </div>
                                </Button>
                            ))}
                        </div>

                        {!setupState && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                <Button
                                    type="button"
                                    size="sm"
                                    isLoading={setupMutation.isPending}
                                    loadingText="Đang khởi tạo..."
                                    leftIcon={selectedMethod === 'TOTP' ? <QrCode size={14}/> : <Mail size={14}/>}
                                    onClick={() => setupMutation.mutate(selectedMethod)}
                                    className="text-xs uppercase tracking-wider"
                                >
                                    {status?.enabled && status.method === selectedMethod
                                        ? `Cấu hình lại ${selectedMethod}`
                                        : `Bật 2FA (${selectedMethod})`}
                                </Button>

                                {status?.enabled && !showDisableConfirm && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<ShieldAlert size={14} className="text-warning"/>}
                                        onClick={() => setShowDisableConfirm(true)}
                                        className="text-xs"
                                    >
                                        Tắt 2FA
                                    </Button>
                                )}
                            </div>
                        )}

                        {setupState && (
                            <TwoFactorSetupWizard
                                setupState={setupState}
                                code={code}
                                isSubmitting={enableMutation.isPending}
                                onCodeChange={setCode}
                                onSubmit={handleEnableSubmit}
                                onCancel={() => setSetupState(null)}
                            />
                        )}

                        {showDisableConfirm && (
                            <Alert variant="warning">
                                <form
                                    noValidate
                                    onSubmit={e => {
                                        e.preventDefault();
                                        if (canSubmitDisableTwoFactor(disablePassword) && !disableMutation.isPending) {
                                            disableMutation.mutate(disablePassword);
                                        }
                                    }}
                                    className="space-y-3"
                                >
                                    <FormField id="two-factor-disable-password" label="Nhập mật khẩu hiện tại để tắt 2FA:" required>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="min-w-[200px] flex-1">
                                                <Input
                                                    id="two-factor-disable-password"
                                                    type="password"
                                                    name="password"
                                                    autoComplete="current-password"
                                                    required
                                                    value={disablePassword}
                                                    onChange={e => setDisablePassword(e.target.value)}
                                                    placeholder="Mật khẩu tài khoản"
                                                    className="h-9 bg-white px-3 text-xs"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="bg-white text-xs"
                                                onClick={() => { setShowDisableConfirm(false); setDisablePassword(''); }}
                                            >
                                                Giữ 2FA
                                            </Button>
                                            <Button
                                                type="submit"
                                                size="sm"
                                                isLoading={disableMutation.isPending}
                                                loadingText="Đang xử lý..."
                                                disabled={!canSubmitDisableTwoFactor(disablePassword)}
                                                className="text-xs"
                                            >
                                                Xác nhận tắt
                                            </Button>
                                        </div>
                                    </FormField>
                                </form>
                            </Alert>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
