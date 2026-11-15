'use client';

import {useEffect, useState, type FormEvent} from 'react';
import QRCode from 'qrcode';
import {CheckCircle2, Copy, Landmark, QrCode, Save, ShieldAlert, Webhook} from 'lucide-react';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Badge, Button, Input, Select} from '@/components/ui';
import {
    canSubmitPaymentGateway,
    NAPAS_BANK_PRESETS,
    paymentGatewayDraftFromConfig,
    toPaymentGatewayPayload,
    validatePaymentGatewayDraft,
    type PaymentGatewayDraft,
} from '@/forms/billing/payment-gateway-form';
import {usePaymentGatewayConfig, useUpdatePaymentGatewayConfig} from '@/hooks/billing/useBillingAdmin';
import {useAuth} from '@/providers/AuthContext';
import {toast} from '@/providers/ToastContext';
import type {PaymentGatewayConfig} from '@/types/billing/billing-admin.types';

export function PaymentGatewaySettingsSection({onSaved}: { onSaved?: () => void } = {}) {
    const {can, permissionsReady} = useAuth();
    const query = usePaymentGatewayConfig();
    if (!permissionsReady || !can('USER_MANAGE')) return null;

    return (
        <QueryState query={query}>
            {query.data && (
                <GatewayForm
                    key={`${query.data.bankBin}-${query.data.accountNumber}-${query.data.accountName}-${query.data.vatRate}`}
                    config={query.data}
                    onSaved={onSaved}
                />
            )}
        </QueryState>
    );
}

function GatewayForm({config, onSaved}: { config: PaymentGatewayConfig; onSaved?: () => void }) {
    const [draft, setDraft] = useState<PaymentGatewayDraft>(() => paymentGatewayDraftFromConfig(config));
    const [qrState, setQrState] = useState<{ payload: string; url: string } | null>(null);
    const save = useUpdatePaymentGatewayConfig({
        onSuccess: () => {
            toast.success('Đã lưu cấu hình tài khoản nhận VietQR & thuế suất GTGT.');
            onSaved?.();
        },
    });

    const samplePayload = config.sampleQrPayload;
    useEffect(() => {
        if (!samplePayload) return;
        let active = true;
        void QRCode.toDataURL(samplePayload, {errorCorrectionLevel: 'M', margin: 1, width: 200})
            .then(url => active && setQrState({payload: samplePayload, url}))
            .catch(() => active && setQrState(null));
        return () => {
            active = false;
        };
    }, [samplePayload]);

    const qrDataUrl = samplePayload && qrState?.payload === samplePayload ? qrState.url : null;

    const errors = validatePaymentGatewayDraft(draft);
    const canSubmit = canSubmitPaymentGateway(draft);
    const matchedPreset = NAPAS_BANK_PRESETS.find(item => item.bin === draft.bankBin.trim());

    const handlePresetSelect = (bin: string) => {
        if (!bin) return;
        const preset = NAPAS_BANK_PRESETS.find(item => item.bin === bin);
        if (preset) {
            setDraft(prev => ({...prev, bankBin: preset.bin, bankName: preset.shortName}));
        }
    };

    const copyEndpoint = async (path: string, label: string) => {
        const origin = typeof window !== 'undefined'
            ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin).replace(/\/+$/, '')
            : 'http://localhost:8080';
        try {
            await navigator.clipboard.writeText(`${origin}${path}`);
            toast.success(`Đã sao chép URL ${label}.`);
        } catch {
            toast.error('Không thể sao chép vào bộ nhớ tạm.');
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit || save.isPending) return;
        save.mutate(toPaymentGatewayPayload(draft));
    };

    return (
        <form noValidate onSubmit={handleSubmit} aria-labelledby="payment-gateway-title"
              className="space-y-5 rounded-panel border border-border bg-card p-6">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                    <h3 id="payment-gateway-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Landmark size={18} className="text-primary" aria-hidden="true"/>
                        Cổng Thanh toán Chuyển khoản VietQR (NAPAS 247) & Đối soát Webhook
                    </h3>
                    <p className="m-0 text-xs leading-relaxed text-slate-500">
                        Cấu hình tài khoản thụ hưởng sinh mã QR EMVCo tự động trên hóa đơn khách hàng và đường dẫn Webhook đối soát tức thì.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={config.bankTransferConfigured ? 'success' : 'warning'} size="sm"
                           icon={config.bankTransferConfigured ? <CheckCircle2 size={12}/> : <ShieldAlert size={12}/>}>
                        {config.bankTransferConfigured ? 'VietQR đã sẵn sàng' : 'Chưa cấu hình tài khoản nhận'}
                    </Badge>
                    <Badge variant={config.webhookAutoReconcileReady ? 'success' : 'default'} size="sm"
                           icon={<Webhook size={12}/>}>
                        {config.webhookAutoReconcileReady ? 'Webhook SePay tự động' : 'Đối soát thủ công / chờ khóa IPN'}
                    </Badge>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_210px]">
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Select id="gateway-bank-preset" label="Chọn nhanh ngân hàng NAPAS" optional
                                value={matchedPreset?.bin ?? ''}
                                onChange={e => handlePresetSelect(e.target.value)}
                                className="h-10 text-xs font-semibold">
                            <option value="">-- Chọn ngân hàng phổ biến hoặc nhập BIN bên cạnh --</option>
                            {NAPAS_BANK_PRESETS.map(bank => (
                                <option key={bank.bin} value={bank.bin}>{bank.shortName} · BIN {bank.bin}</option>
                            ))}
                        </Select>

                        <Input id="gateway-bank-bin" label="Mã BIN NAPAS (6 chữ số)" required={false}
                               placeholder="Ví dụ: 970436" maxLength={6} inputMode="numeric"
                               value={draft.bankBin} error={errors.bankBin}
                               onChange={e => setDraft(prev => ({...prev, bankBin: e.target.value.replace(/\D/g, '')}))}
                               className="h-10 font-mono text-xs font-semibold"/>

                        <Input id="gateway-bank-name" label="Tên hiển thị ngân hàng" optional
                               placeholder="Ví dụ: Vietcombank" maxLength={120}
                               value={draft.bankName} error={errors.bankName}
                               onChange={e => setDraft(prev => ({...prev, bankName: e.target.value}))}
                               className="h-10 text-xs font-semibold"/>

                        <Input id="gateway-vat-rate" label="Thuế suất GTGT (%)" required
                               type="number" min={0} max={100} step={0.5} inputMode="decimal"
                               value={draft.vatPercent} error={errors.vatPercent}
                               onChange={e => setDraft(prev => ({...prev, vatPercent: e.target.value}))}
                               className="h-10 text-xs font-semibold tabular-nums"/>

                        <Input id="gateway-account-number" label="Số tài khoản thụ hưởng" required={false}
                               placeholder="Ví dụ: 0123456789" maxLength={19}
                               value={draft.accountNumber} error={errors.accountNumber}
                               onChange={e => setDraft(prev => ({...prev, accountNumber: e.target.value.replace(/\s+/g, '')}))}
                               className="h-10 font-mono text-xs font-semibold"/>

                        <Input id="gateway-account-name" label="Chủ tài khoản thụ hưởng (Không dấu)" required={false}
                               placeholder="Ví dụ: CONG TY CO PHAN UAV PAS" maxLength={120}
                               value={draft.accountName} error={errors.accountName}
                               onChange={e => setDraft(prev => ({...prev, accountName: e.target.value.toUpperCase()}))}
                               className="h-10 text-xs font-semibold uppercase"/>
                    </div>

                    <div className="rounded-control border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
                        <p className="m-0 mb-2 font-bold text-slate-800">Đường dẫn Webhook nhận thông báo biến động số dư tự động:</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex items-center justify-between gap-2 rounded-control border border-slate-200 bg-white px-2.5 py-1.5">
                                <div className="min-w-0">
                                    <span className="block text-[10.5px] font-bold text-slate-500">SePay Banking Webhook</span>
                                    <code className="block truncate text-[11.5px] text-slate-800">{config.sepayWebhookPath}</code>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => void copyEndpoint(config.sepayWebhookPath, 'SePay Webhook')}
                                        aria-label="Sao chép URL SePay Webhook" className="h-7 w-7 shrink-0 p-0 text-slate-500 hover:text-primary">
                                    <Copy size={14}/>
                                </Button>
                            </div>
                            <div className="flex items-center justify-between gap-2 rounded-control border border-slate-200 bg-white px-2.5 py-1.5">
                                <div className="min-w-0">
                                    <span className="block text-[10.5px] font-bold text-slate-500">Payment Provider HMAC IPN</span>
                                    <code className="block truncate text-[11.5px] text-slate-800">{config.ipnWebhookPath}</code>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={() => void copyEndpoint(config.ipnWebhookPath, 'HMAC IPN')}
                                        aria-label="Sao chép URL HMAC IPN" className="h-7 w-7 shrink-0 p-0 text-slate-500 hover:text-primary">
                                    <Copy size={14}/>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 rounded-panel border border-slate-200 bg-slate-50 p-4 text-center">
                    {qrDataUrl ? (
                        // Generated EMVCo QR data URL preview.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrDataUrl} alt="Mã VietQR mẫu" width={160} height={160} className="h-40 w-40 rounded-control border border-slate-200 bg-white p-2"/>
                    ) : (
                        <div className="flex h-40 w-40 flex-col items-center justify-center gap-1.5 rounded-control border border-dashed border-slate-300 bg-white p-3 text-slate-400">
                            <QrCode size={28}/>
                            <span className="text-[11px] leading-snug">Lưu BIN + Số TK + Chủ TK để xem trước mã VietQR</span>
                        </div>
                    )}
                    <span className="text-[11px] font-semibold text-slate-600">
                        {config.bankTransferConfigured ? `${config.bankName || config.bankBin} · ${config.accountNumber}` : 'Xem trước QR mẫu 100.000 ₫'}
                    </span>
                </div>
            </div>

            {save.error && <ErrorNotice error={save.error}/>}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="m-0 text-xs text-slate-500">
                    Mọi thay đổi có hiệu lực ngay lập tức trên Cổng Khách hàng mà không cần khởi động lại máy chủ.
                </p>
                <Button type="submit" variant="primary" size="sm" isLoading={save.isPending} disabled={!canSubmit}
                        leftIcon={<Save size={14} aria-hidden="true"/>}>
                    Lưu cấu hình thanh toán
                </Button>
            </div>
        </form>
    );
}
