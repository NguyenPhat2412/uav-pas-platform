'use client';

import React, {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {CheckCircle2, Copy, Download, MessageCircleMore, Printer, RefreshCw} from 'lucide-react';
import {Alert, Badge, Button, Card, CardContent} from '@/components/ui';
import {useDownloadInvoiceReceipt} from '@/hooks/billing/useCustomerBilling';
import {openPublicSupportWidget} from '@/hooks/support/usePublicSupport';
import {formatShortDate} from '@/lib/format';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {BankTransferInstructions} from '@/types/billing/billing.types';
import {buildInvoiceSupportPrompt, printInvoice} from '@/utils/billing/invoice-print';

export interface BankTransferBodyProps {
    data: BankTransferInstructions;
    wsConnected: boolean;
    isChecking: boolean;
    onCheckNow: () => Promise<void>;
    onClose: () => void;
}

export function BankTransferBody({
    data,
    wsConnected,
    isChecking,
    onCheckNow,
    onClose,
}: BankTransferBodyProps) {
    const {t, formatCurrency, formatDate} = useI18n();
    const downloadReceipt = useDownloadInvoiceReceipt({
        onError: (error) => toast.error(error instanceof Error ? error.message : t('payment.downloadPdfError')),
    });
    const [qr, setQr] = useState<string | null>(null);

    useEffect(() => {
        if (!data.qrPayload) return;
        let alive = true;
        void QRCode.toDataURL(data.qrPayload, {errorCorrectionLevel: 'M', margin: 1, width: 320})
            .then((url) => alive && setQr(url))
            .catch(() => alive && toast.error(t('payment.qrError')));
        return () => {
            alive = false;
        };
    }, [data.qrPayload, t]);

    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(t('payment.copied', {label}));
        } catch {
            toast.error(t('payment.copyFailed'));
        }
    };

    const handleContactAdmin = () => {
        const prompt = buildInvoiceSupportPrompt(data.invoiceCode, formatCurrency(data.total), true);
        onClose();
        openPublicSupportWidget({topic: 'PRICING_PLAN', prompt});
    };

    const date = (value: string | null) => formatShortDate(value, formatDate);
    const vatPct = Math.round(data.vatRate * 1000) / 10;
    const paid = data.status !== 'PENDING';

    return (
        <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-3 border-b border-border bg-slate-50 p-6 md:border-b-0 md:border-r">
                {paid ? (
                    <Card className="w-full border-slate-900 bg-slate-900 text-white shadow-sm">
                        <CardContent className="flex flex-col items-center gap-2.5 px-4 py-6 text-center">
                            <CheckCircle2 size={36} className="text-sky-400" aria-hidden="true" />
                            <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                                {t('billingPage.status.PAID')}
                            </Badge>
                            <p className="m-0 text-sm font-bold leading-snug">{t('payment.alreadyPaid')}</p>
                        </CardContent>
                    </Card>
                ) : qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt={t('payment.qrAlt', {code: data.invoiceCode})} width={240} height={240} className="h-60 w-60 bg-white p-2" />
                ) : (
                    <span className="h-60 w-60 animate-pulse bg-slate-200" aria-hidden="true" />
                )}
                {!paid && <p className="m-0 text-center text-xs text-slate-500">{t('payment.scanHint')}</p>}
                <strong className="text-2xl font-extrabold tabular-nums text-primary">{formatCurrency(data.total)}</strong>
            </div>

            <div className="space-y-5 p-6">
                {paid ? (
                    <div
                        role="status"
                        aria-live="polite"
                        className="flex items-center gap-2.5 border border-sky-200 bg-sky-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800"
                    >
                        <CheckCircle2 size={16} className="shrink-0 text-uav-blue" aria-hidden="true" />
                        <span>{t('payment.settledRealtimeBanner')}</span>
                    </div>
                ) : (
                    <div
                        className="flex flex-wrap items-center justify-between gap-2.5 border border-border bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700"
                        role="status"
                        aria-live="polite"
                    >
                        <span className="inline-flex items-center gap-2 font-medium">
                            {wsConnected ? (
                                <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 animate-ping motion-reduce:animate-none" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-uav-blue" />
                                </span>
                            ) : (
                                <RefreshCw size={14} className="shrink-0 animate-spin text-uav-blue" aria-hidden="true" />
                            )}
                            <span>{wsConnected ? t('payment.realtimeListening') : t('payment.pollingLive')}</span>
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isLoading={isChecking}
                            loadingText={t('payment.checking')}
                            leftIcon={<RefreshCw size={12} aria-hidden="true" />}
                            onClick={() => void onCheckNow()}
                            className="h-7 bg-white px-2.5 text-xs"
                        >
                            {t('payment.checkNow')}
                        </Button>
                    </div>
                )}

                <Card className="rounded-control">
                    <CardContent className="p-0">
                        <dl className="m-0 divide-y divide-slate-100 text-[13px]">
                            <Row label={t('payment.bank')} value={data.bankName || data.bankBin} />
                            <Row label={t('payment.accountName')} value={data.accountName} />
                            <Row
                                label={t('payment.accountNumber')}
                                value={data.accountNumber}
                                mono
                                action={<CopyButton label={t('payment.accountNumber')} onCopy={() => void copy(data.accountNumber, t('payment.accountNumber'))} />}
                            />
                            <Row
                                label={t('payment.amount')}
                                value={formatCurrency(data.total)}
                                mono
                                action={<CopyButton label={t('payment.amount')} onCopy={() => void copy(String(Math.round(data.total)), t('payment.amount'))} />}
                            />
                            <Row
                                label={t('payment.content')}
                                value={data.transferContent}
                                mono
                                strong
                                action={<CopyButton label={t('payment.content')} onCopy={() => void copy(data.transferContent, t('payment.content'))} />}
                            />
                        </dl>
                    </CardContent>
                </Card>

                {!paid && <Alert variant="warning" className="py-2.5 text-xs">{t('payment.contentWarning')}</Alert>}

                <section aria-labelledby="invoice-breakdown">
                    <h3 id="invoice-breakdown" className="mt-0 mb-2 text-xs font-bold text-slate-500">{t('payment.breakdown')}</h3>
                    <table className="w-full border-collapse text-[13px]">
                        <tbody>
                        <tr className="border-b border-slate-100"><td className="py-1.5 text-slate-600">{t('payment.invoice')}</td>
                            <td className="py-1.5 text-right font-mono font-semibold">{data.invoiceCode}</td></tr>
                        <tr className="border-b border-slate-100"><td className="py-1.5 text-slate-600">{t('payment.item')}</td>
                            <td className="py-1.5 text-right">{data.itemName ?? '—'}</td></tr>
                        {data.flightHours != null && <tr className="border-b border-slate-100"><td className="py-1.5 text-slate-600">{t('payment.flightHours')}</td>
                            <td className="py-1.5 text-right tabular-nums">{t('payment.hours', {count: Math.round(data.flightHours * 10) / 10})}</td></tr>}
                        <tr className="border-b border-slate-100"><td className="py-1.5 text-slate-600">{t('payment.serviceFee')}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatCurrency(data.subtotal)}</td></tr>
                        <tr className="border-b border-slate-100"><td className="py-1.5 text-slate-600">{t('payment.vat', {rate: vatPct})}</td>
                            <td className="py-1.5 text-right tabular-nums">{formatCurrency(data.vat)}</td></tr>
                        <tr><td className="py-2 font-bold text-slate-900">{t('payment.total')}</td>
                            <td className="py-2 text-right text-base font-extrabold tabular-nums text-primary">{formatCurrency(data.total)}</td></tr>
                        </tbody>
                    </table>
                    <p className="mt-2 mb-0 text-xs text-slate-500">{t('payment.dates', {issued: date(data.issuedAt), due: date(data.dueDate)})}</p>
                </section>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="m-0 min-w-[220px] flex-1 text-xs leading-relaxed text-slate-500">{t('payment.confirmation')}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        {!paid && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                leftIcon={<MessageCircleMore size={15} aria-hidden="true" />}
                                onClick={handleContactAdmin}
                            >
                                {t('payment.contactAdminReconcile')}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            isLoading={downloadReceipt.isPending}
                            leftIcon={<Download size={15} aria-hidden="true" />}
                            onClick={() => downloadReceipt.mutate({id: data.invoiceId, code: data.invoiceCode})}
                            className="border border-primary/30 bg-uav-red-light text-primary hover:bg-rose-100"
                        >
                            {t('payment.downloadPdf')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            leftIcon={<Printer size={15} aria-hidden="true" />}
                            onClick={() =>
                                printInvoice(
                                    data,
                                    {
                                        title: t('payment.printTitle'),
                                        bank: t('payment.bank'),
                                        accountName: t('payment.accountName'),
                                        accountNumber: t('payment.accountNumber'),
                                        content: t('payment.content'),
                                        item: t('payment.item'),
                                        serviceFee: t('payment.serviceFee'),
                                        vat: t('payment.vat', {rate: vatPct}),
                                        total: t('payment.total'),
                                        issued: t('payment.issuedOn'),
                                        due: t('payment.dueOn'),
                                    },
                                    formatCurrency,
                                    date,
                                    () => toast.error(t('payment.popupBlocked')),
                                )
                            }
                        >
                            {t('payment.print')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({label, value, action, mono, strong}: {label: string; value: string; action?: React.ReactNode; mono?: boolean; strong?: boolean}) {
    return (
        <div className="flex items-center gap-3 px-3 py-2">
            <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
            <dd className={`m-0 min-w-0 flex-1 break-all ${mono ? 'font-mono' : ''} ${strong ? 'font-bold text-primary' : 'text-slate-900'}`}>{value}</dd>
            {action}
        </div>
    );
}

function CopyButton({label, onCopy}: {label: string; onCopy: () => void}) {
    const {t} = useI18n();
    return (
        <Button type="button" variant="ghost" size="sm" onClick={onCopy} aria-label={t('payment.copy', {label})} title={t('payment.copy', {label})}
                className="h-7 w-7 p-0 text-slate-400 hover:text-primary">
            <Copy size={15} />
        </Button>
    );
}
