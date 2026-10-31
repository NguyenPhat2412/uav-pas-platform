'use client';

import {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {Copy, Landmark, Printer, X} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {useBankTransferInstructions} from '@/hooks/billing/useCustomerBilling';
import {type BankTransferInstructions} from '@/types/billing/billing.types';
import {formatShortDate} from '@/lib/format';

/** VietQR / NAPAS 247 payment for one invoice. The QR payload and account come from the backend configuration. */
export function BankTransferDialog({invoiceId, onClose}: { invoiceId: number; onClose: () => void }) {
    const {t} = useI18n();
    const query = useBankTransferInstructions(invoiceId);
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <section role="dialog" aria-modal="true" aria-labelledby="bank-transfer-title" onKeyDown={e => e.key === 'Escape' && onClose()}
                 className="flex max-h-[calc(100dvh-32px)] w-full max-w-3xl flex-col overflow-y-auto bg-card text-card-foreground shadow-2xl">
            <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
                <h2 id="bank-transfer-title" className="m-0 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                    <Landmark size={20} className="text-primary" aria-hidden="true"/>{t('payment.title')}</h2>
                <button type="button" onClick={onClose} aria-label={t('payment.close')} autoFocus
                        className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18}/></button>
            </header>
            {query.isPending ? <p role="status" className="m-0 p-8 text-center text-sm text-slate-500">{t('payment.loading')}</p>
                : query.isError ? <p role="alert" className="m-0 border-l-4 border-l-red-600 bg-red-50 p-5 text-sm text-red-800">
                        {query.error instanceof Error ? query.error.message : t('payment.loadError')}</p>
                    : <Body data={query.data}/>}
        </section>
    </div>;
}

function Body({data}: { data: BankTransferInstructions }) {
    const {t, formatCurrency, formatDate} = useI18n();
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

    return <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-3 border-b border-border bg-slate-50 p-6 md:border-b-0 md:border-r">
            {paid ? <p className="m-0 border-l-4 border-l-uav-blue bg-uav-blue-light px-3 py-2 text-sm font-semibold text-uav-blue">{t('payment.alreadyPaid')}</p> :
                // A generated data: URL, so next/image has nothing to optimise.
                // eslint-disable-next-line @next/next/no-img-element
                qr ? <img src={qr} alt={t('payment.qrAlt', {code: data.invoiceCode})} width={240} height={240} className="h-60 w-60 bg-white p-2"/> :
                    <span className="h-60 w-60 animate-pulse bg-slate-200" aria-hidden="true"/>}
            <p className="m-0 text-center text-xs text-slate-500">{t('payment.scanHint')}</p>
            <strong className="text-2xl font-extrabold tabular-nums text-primary">{formatCurrency(data.total)}</strong>
        </div>
        <div className="space-y-5 p-6">
            <dl className="m-0 divide-y divide-slate-100 border border-border text-[13px]">
                <Row label={t('payment.bank')} value={data.bankName || data.bankBin}/>
                <Row label={t('payment.accountName')} value={data.accountName}/>
                <Row label={t('payment.accountNumber')} value={data.accountNumber} mono
                     action={<CopyButton label={t('payment.accountNumber')} onCopy={() => void copy(data.accountNumber, t('payment.accountNumber'))}/>}/>
                <Row label={t('payment.amount')} value={formatCurrency(data.total)} mono
                     action={<CopyButton label={t('payment.amount')} onCopy={() => void copy(String(Math.round(data.total)), t('payment.amount'))}/>}/>
                <Row label={t('payment.content')} value={data.transferContent} mono strong
                     action={<CopyButton label={t('payment.content')} onCopy={() => void copy(data.transferContent, t('payment.content'))}/>}/>
            </dl>
            <p className="m-0 border-l-4 border-l-uav-amber bg-amber-50 px-3 py-2 text-xs text-amber-900">{t('payment.contentWarning')}</p>

            <section aria-labelledby="invoice-breakdown">
                <h3 id="invoice-breakdown" className="mb-2 mt-0 text-xs font-bold text-slate-500">{t('payment.breakdown')}</h3>
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
                <p className="mb-0 mt-2 text-xs text-slate-500">{t('payment.dates', {issued: date(data.issuedAt), due: date(data.dueDate)})}</p>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="m-0 text-xs text-slate-500">{t('payment.confirmation')}</p>
                <button type="button" onClick={() => printInvoice(data, {
                    title: t('payment.printTitle'), bank: t('payment.bank'), accountName: t('payment.accountName'),
                    accountNumber: t('payment.accountNumber'), content: t('payment.content'), item: t('payment.item'),
                    serviceFee: t('payment.serviceFee'), vat: t('payment.vat', {rate: vatPct}), total: t('payment.total'),
                    issued: t('payment.issuedOn'), due: t('payment.dueOn'),
                }, formatCurrency, date)}
                        className="inline-flex h-9 items-center gap-1.5 border border-border bg-card px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">
                    <Printer size={15} aria-hidden="true"/>{t('payment.print')}</button>
            </div>
        </div>
    </div>;
}

function Row({label, value, action, mono, strong}: { label: string; value: string; action?: React.ReactNode; mono?: boolean; strong?: boolean }) {
    return <div className="flex items-center gap-3 px-3 py-2">
        <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
        <dd className={`m-0 min-w-0 flex-1 break-all ${mono ? 'font-mono' : ''} ${strong ? 'font-bold text-primary' : 'text-slate-900'}`}>{value}</dd>
        {action}
    </div>;
}

function CopyButton({label, onCopy}: { label: string; onCopy: () => void }) {
    const {t} = useI18n();
    return <button type="button" onClick={onCopy} aria-label={t('payment.copy', {label})} title={t('payment.copy', {label})}
                   className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"><Copy size={15}/></button>;
}

/** Opens a plain printable invoice; the browser's print dialog can save it as PDF. */
function printInvoice(data: BankTransferInstructions, l: Record<string, string>, money: (n: number) => string, date: (v: string | null) => string) {
    const win = window.open('', '_blank', 'noopener=no,width=760,height=900');
    if (!win) {
        toast.error(l.title);
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
