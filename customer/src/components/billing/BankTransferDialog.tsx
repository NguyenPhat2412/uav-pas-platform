'use client';

import React, {useEffect, useRef, useState} from 'react';
import QRCode from 'qrcode';
import {CheckCircle2, Copy, Download, Landmark, Printer, RefreshCw, X} from 'lucide-react';
import {Alert, Badge, Button, Card, CardContent, Spinner} from '@/components/ui';
import {useBankTransferInstructions, useDownloadInvoiceReceipt} from '@/hooks/billing/useCustomerBilling';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {formatShortDate} from '@/lib/format';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {type BankTransferInstructions} from '@/types/billing/billing.types';

/** VietQR / NAPAS 247 payment for one invoice. The QR payload and account come from the backend configuration. */
export function BankTransferDialog({invoiceId, onClose}: { invoiceId: number; onClose: () => void }) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const query = useBankTransferInstructions(invoiceId);
    const prevStatusRef = useRef<{ invoiceId: number; status?: string }>({invoiceId});

    useEffect(() => {
        const status = query.data?.status;
        if (prevStatusRef.current.invoiceId === invoiceId && prevStatusRef.current.status === 'PENDING' && status === 'PAID') {
            toast.success(t('payment.paidSuccess'));
        }
        prevStatusRef.current = {invoiceId, status};
    }, [invoiceId, query.data?.status, t]);

    const handleCheckNow = async () => {
        const result = await query.refetch();
        if (result.data?.status === 'PENDING') {
            toast.info(t('payment.stillPending'));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation"
             onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="bank-transfer-title" tabIndex={-1}
                     className="flex max-h-[calc(100dvh-32px)] w-full max-w-3xl flex-col overflow-y-auto bg-card text-card-foreground shadow-2xl">
                <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
                    <h2 id="bank-transfer-title" className="m-0 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                        <Landmark size={20} className="text-primary" aria-hidden="true"/>{t('payment.title')}
                    </h2>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label={t('payment.close')} data-autofocus="true"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700">
                        <X size={18}/>
                    </Button>
                </header>
                {query.isPending ? (
                    <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
                        <Spinner size="sm" label={t('payment.loading')} className="sr-only"/>
                        <div className="flex flex-col items-center gap-3 border-b border-border bg-slate-50 p-6 md:border-b-0 md:border-r">
                            <div className="h-60 w-60 animate-pulse bg-slate-200"/>
                            <div className="h-3.5 w-44 animate-pulse rounded-control bg-slate-200"/>
                            <div className="h-7 w-32 animate-pulse rounded-control bg-slate-200"/>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="space-y-2">
                                {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-9 animate-pulse rounded-control bg-slate-100"/>)}
                            </div>
                            <div className="h-28 animate-pulse rounded-control bg-slate-100"/>
                        </div>
                    </div>
                ) : query.isError ? (
                    <Alert variant="error" className="rounded-none border-0 border-l-4">
                        {query.error instanceof Error ? query.error.message : t('payment.loadError')}
                    </Alert>
                ) : (
                    <Body data={query.data} isChecking={query.isFetching} onCheckNow={handleCheckNow}/>
                )}
            </section>
        </div>
    );
}

function Body({data, isChecking, onCheckNow}: {
    data: BankTransferInstructions;
    isChecking: boolean;
    onCheckNow: () => Promise<void>;
}) {
    const {t, formatCurrency, formatDate} = useI18n();
    const downloadReceipt = useDownloadInvoiceReceipt({
        onError: error => toast.error(error instanceof Error ? error.message : t('payment.downloadPdfError')),
    });
    const [qr, setQr] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        void QRCode.toDataURL(data.qrPayload, {errorCorrectionLevel: 'M', margin: 1, width: 320})
            .then(url => alive && setQr(url))
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
    const date = (value: string | null) => formatShortDate(value, formatDate);
    const vatPct = Math.round(data.vatRate * 1000) / 10;
    const paid = data.status !== 'PENDING';

    return (
        <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
            <div className="flex flex-col items-center gap-3 border-b border-border bg-slate-50 p-6 md:border-b-0 md:border-r">
                {paid ? (
                    <Card className="w-full border-slate-900 bg-slate-900 text-white shadow-sm">
                        <CardContent className="flex flex-col items-center gap-2.5 px-4 py-6 text-center">
                            <CheckCircle2 size={32} className="text-white" aria-hidden="true"/>
                            <Badge variant="outline" className="border-white/25 text-white">{data.status}</Badge>
                            <p className="m-0 text-sm font-bold leading-snug">{t('payment.alreadyPaid')}</p>
                        </CardContent>
                    </Card>
                ) : qr ? (
                    // A generated data: URL, so next/image has nothing to optimise.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt={t('payment.qrAlt', {code: data.invoiceCode})} width={240} height={240} className="h-60 w-60 bg-white p-2"/>
                ) : (
                    <span className="h-60 w-60 animate-pulse bg-slate-200" aria-hidden="true"/>
                )}
                {!paid && <p className="m-0 text-center text-xs text-slate-500">{t('payment.scanHint')}</p>}
                <strong className="text-2xl font-extrabold tabular-nums text-primary">{formatCurrency(data.total)}</strong>
            </div>

            <div className="space-y-5 p-6">
                {!paid && (
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border border-border bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700"
                         role="status" aria-live="polite">
                        <span className="inline-flex items-center gap-2 font-medium">
                            <RefreshCw size={14} className="shrink-0 animate-spin text-uav-blue" aria-hidden="true"/>
                            <span>{t('payment.pollingLive')}</span>
                        </span>
                        <Button type="button" variant="outline" size="sm" isLoading={isChecking} loadingText={t('payment.checking')}
                                leftIcon={<RefreshCw size={12} aria-hidden="true"/>} onClick={() => void onCheckNow()} className="h-7 bg-white px-2.5 text-xs">
                            {t('payment.checkNow')}
                        </Button>
                    </div>
                )}

                <Card className="rounded-control">
                    <CardContent className="p-0">
                        <dl className="m-0 divide-y divide-slate-100 text-[13px]">
                            <Row label={t('payment.bank')} value={data.bankName || data.bankBin}/>
                            <Row label={t('payment.accountName')} value={data.accountName}/>
                            <Row label={t('payment.accountNumber')} value={data.accountNumber} mono
                                 action={<CopyButton label={t('payment.accountNumber')} onCopy={() => void copy(data.accountNumber, t('payment.accountNumber'))}/>}/>
                            <Row label={t('payment.amount')} value={formatCurrency(data.total)} mono
                                 action={<CopyButton label={t('payment.amount')} onCopy={() => void copy(String(Math.round(data.total)), t('payment.amount'))}/>}/>
                            <Row label={t('payment.content')} value={data.transferContent} mono strong
                                 action={<CopyButton label={t('payment.content')} onCopy={() => void copy(data.transferContent, t('payment.content'))}/>}/>
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
                        <Button type="button" variant="secondary" size="sm" isLoading={downloadReceipt.isPending}
                                leftIcon={<Download size={15} aria-hidden="true"/>}
                                onClick={() => downloadReceipt.mutate({id: data.invoiceId, code: data.invoiceCode})}
                                className="border border-primary/30 bg-uav-red-light text-primary hover:bg-rose-100">
                            {t('payment.downloadPdf')}
                        </Button>
                        <Button type="button" variant="outline" size="sm" leftIcon={<Printer size={15} aria-hidden="true"/>}
                                onClick={() => printInvoice(data, {
                                    title: t('payment.printTitle'), bank: t('payment.bank'), accountName: t('payment.accountName'),
                                    accountNumber: t('payment.accountNumber'), content: t('payment.content'), item: t('payment.item'),
                                    serviceFee: t('payment.serviceFee'), vat: t('payment.vat', {rate: vatPct}), total: t('payment.total'),
                                    issued: t('payment.issuedOn'), due: t('payment.dueOn'), popupBlocked: t('payment.popupBlocked'),
                                }, formatCurrency, date)}>
                            {t('payment.print')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({label, value, action, mono, strong}: { label: string; value: string; action?: React.ReactNode; mono?: boolean; strong?: boolean }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2">
            <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
            <dd className={`m-0 min-w-0 flex-1 break-all ${mono ? 'font-mono' : ''} ${strong ? 'font-bold text-primary' : 'text-slate-900'}`}>{value}</dd>
            {action}
        </div>
    );
}

function CopyButton({label, onCopy}: { label: string; onCopy: () => void }) {
    const {t} = useI18n();
    return (
        <Button type="button" variant="ghost" size="sm" onClick={onCopy} aria-label={t('payment.copy', {label})} title={t('payment.copy', {label})}
                className="h-7 w-7 p-0 text-slate-400 hover:text-primary">
            <Copy size={15}/>
        </Button>
    );
}

/** Opens a plain printable invoice; the browser's print dialog can save it as PDF. */
function printInvoice(data: BankTransferInstructions, l: Record<string, string>, money: (n: number) => string, date: (v: string | null) => string) {
    const win = window.open('', '_blank', 'noopener=no,width=760,height=900');
    if (!win) {
        toast.error(l.popupBlocked);
        return;
    }
    const esc = (v: string) => v.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]!));
    const row = (k: string, v: string) => `<tr><td style="padding:6px 0;color:#555">${esc(k)}</td><td style="padding:6px 0;text-align:right">${esc(v)}</td></tr>`;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.invoiceCode)}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:32px auto;color:#111">
<h1 style="font-size:20px;margin:0 0 4px">${esc(l.title)}</h1><p style="margin:0 0 24px;color:#555">${esc(data.invoiceCode)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row(l.issued, date(data.issuedAt))}${row(l.due, date(data.dueDate))}${row(l.item, data.itemName ?? '—')}
${row(l.serviceFee, money(data.subtotal))}${row(l.vat, money(data.vat))}
<tr><td style="padding:10px 0;font-weight:700;border-top:1px solid #ccc">${esc(l.total)}</td><td style="padding:10px 0;text-align:right;font-weight:700;border-top:1px solid #ccc">${esc(money(data.total))}</td></tr>
</table><h2 style="font-size:15px;margin:28px 0 8px">${esc(l.bank)}</h2>
<table style="width:100%;border-collapse:collapse;font-size:14px">
${row(l.bank, data.bankName || data.bankBin)}${row(l.accountName, data.accountName)}${row(l.accountNumber, data.accountNumber)}${row(l.content, data.transferContent)}
</table><script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
}
