'use client';

import {useRef, useState, type FormEvent} from 'react';
import {CheckCircle2, Landmark, X} from 'lucide-react';
import {PaymentGatewaySettingsSection} from '@/components/billing/PaymentGatewaySettingsSection';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {Button, FormField, Input, Select, Textarea} from '@/components/ui';
import {
    canSubmitCreateInvoice,
    emptyCreateInvoiceDraft,
    invoiceFieldErrors,
    toCreateInvoicePayload,
} from '@/forms/billing/billing-form';
import {
    useBillingPlans,
    useConfirmBankTransfer,
    useCreateInvoice,
    useInvoiceCustomerSearch,
} from '@/hooks/billing/useBillingAdmin';
import {useMissions} from '@/hooks/mission/useCustomerMissions';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {planName} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {Invoice} from '@/types';

export function CreateInvoiceDialog({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: (code: string) => void;
}) {
    const {t} = useI18n();
    const dialogRef = useRef<HTMLFormElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const [keyword, setKeyword] = useState('');
    const [draft, setDraft] = useState(emptyCreateInvoiceDraft);
    const users = useInvoiceCustomerSearch(keyword, !draft.customer);
    const plans = useBillingPlans();
    const missions = useMissions();
    const create = useCreateInvoice();
    const fieldErrors = invoiceFieldErrors(create.error);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmitCreateInvoice(draft)) return;
        try {
            const invoice = await create.mutateAsync(toCreateInvoicePayload(draft));
            onCreated(invoice.code);
        } catch {
            // Rendered via ErrorNotice below.
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
             onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <form ref={dialogRef} noValidate role="dialog" aria-modal="true" aria-labelledby="create-invoice-title" onSubmit={e => void submit(e)}
                  className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-panel bg-white p-6 shadow-2xl">
                <header className="flex items-center justify-between">
                    <h2 id="create-invoice-title" className="text-lg font-bold">{t('admin.invoices.createTitle')}</h2>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label={t('admin.invoices.cancel')} className="h-8 w-8 p-0 text-slate-400">
                        <X size={18}/>
                    </Button>
                </header>
                <FormField label={t('admin.invoices.customer')} required error={fieldErrors?.userId}>
                    {draft.customer ? (
                        <div className="flex items-center justify-between rounded-control bg-uav-red-light px-3 py-2 text-sm font-semibold text-primary">
                            <span>{draft.customer.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(f => ({...f, customer: null}))} className="h-7 px-2 text-xs">
                                {t('admin.invoices.change')}
                            </Button>
                        </div>
                    ) : <>
                        <Input autoFocus value={keyword} onChange={e => setKeyword(e.target.value)}
                               placeholder={t('admin.invoices.customerSearch')} aria-label={t('admin.invoices.customer')} className="h-10 text-[13px]"/>
                        {users.data?.content.length ? (
                            <ul className="max-h-48 overflow-y-auto rounded-control border border-slate-200">
                                {users.data.content.map(u => (
                                    <li key={u.id}>
                                        <Button type="button" variant="ghost" size="sm"
                                                onClick={() => setDraft(f => ({...f, customer: {id: u.id, name: u.fullName || u.username}}))}
                                                className="w-full justify-between rounded-none px-3 py-2 font-normal text-slate-800">
                                            <span>{u.fullName || u.username}</span><small className="text-slate-400">@{u.username}</small>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : keyword.trim().length >= 2 && users.isFetched && (
                            <p className="text-xs font-normal text-slate-500">{t('admin.invoices.noCustomer')}</p>
                        )}
                    </>}
                </FormField>
                <Input id="invoice-amount" label={t('admin.invoices.amount')} required error={fieldErrors?.amount} type="number" step="1000" inputMode="numeric"
                       value={draft.amount} onChange={e => setDraft(f => ({...f, amount: e.target.value}))} className="h-10 text-[13px] tabular-nums"/>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Select id="invoice-plan" label={t('admin.invoices.plan')} optional error={fieldErrors?.planId}
                            value={draft.planId} onChange={e => setDraft(f => ({...f, planId: e.target.value}))} className="h-10 text-[13px]">
                        <option value="">{t('admin.invoices.none')}</option>
                        {plans.data?.map(p => <option key={p.id} value={p.id}>{planName(p.name)}</option>)}
                    </Select>
                    <div>
                        <Input id="invoice-mission" label={t('admin.invoices.missionId')} optional error={fieldErrors?.missionId} type="number"
                               list="recent-invoice-missions" placeholder={t('admin.invoices.missionPlaceholder')}
                               value={draft.missionId} onChange={e => setDraft(f => ({...f, missionId: e.target.value}))} className="h-10 text-[13px]"/>
                        <datalist id="recent-invoice-missions">
                            {missions.data?.content.map(m => <option key={m.id} value={m.id}>{`${m.code} — ${m.title}`}</option>)}
                        </datalist>
                    </div>
                </div>
                <Textarea id="invoice-notes" label={t('admin.invoices.notes')} optional error={fieldErrors?.notes} rows={3}
                          value={draft.notes} onChange={e => setDraft(f => ({...f, notes: e.target.value}))}/>
                {create.error && !fieldErrors && <ErrorNotice error={create.error}/>}
                <footer className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>{t('admin.invoices.cancel')}</Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={create.isPending} disabled={!canSubmitCreateInvoice(draft)}>
                        {t('admin.invoices.submit')}
                    </Button>
                </footer>
            </form>
        </div>
    );
}

export function ConfirmBankTransferDialog({
    invoice,
    onClose,
}: {
    invoice: Invoice;
    onClose: () => void;
}) {
    const {t, formatCurrency} = useI18n();
    const dialogRef = useRef<HTMLFormElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    const [reference, setReference] = useState('');
    const confirm = useConfirmBankTransfer({
        onSuccess: settled => {
            toast.success(t('admin.invoices.confirmed', {code: settled.code}));
            onClose();
        },
        onError: error => toast.error(error instanceof Error ? error.message : t('admin.invoices.confirmFailed')),
    });

    const [suggestedRef] = useState(
        () => `FT-${invoice.code.replace(/[^A-Z0-9]/gi, '').slice(-8)}-${String(Date.now()).slice(-4)}`,
    );

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = reference.trim();
        if (!trimmed || confirm.isPending) return;
        confirm.mutate({id: invoice.id, reference: trimmed});
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
             onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <form ref={dialogRef} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="confirm-transfer-title"
                  className="flex w-full max-w-md flex-col gap-4 rounded-panel bg-white p-6 shadow-2xl">
                <header className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h2 id="confirm-transfer-title" className="m-0 flex items-center gap-2 text-base font-bold text-slate-900">
                        <CheckCircle2 size={18} className="text-primary"/> Đối soát & Xác nhận Thanh toán
                    </h2>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Đóng" className="h-8 w-8 p-0 text-slate-400">
                        <X size={18}/>
                    </Button>
                </header>

                <dl className="m-0 space-y-1.5 rounded-control border border-slate-200 bg-slate-50 p-3.5 text-xs">
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Mã hóa đơn</dt>
                        <dd className="m-0 font-mono font-bold text-slate-900">{invoice.code}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Khách hàng</dt>
                        <dd className="m-0 font-semibold text-slate-800">@{invoice.username}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Số tiền đối soát</dt>
                        <dd className="m-0 text-sm font-extrabold tabular-nums text-primary">{formatCurrency(invoice.amount)}</dd>
                    </div>
                </dl>

                <div className="space-y-1.5">
                    <Input autoFocus id="bank-reference-input" label={t('admin.invoices.referenceLabel')} required
                           placeholder={t('admin.invoices.referencePlaceholder')}
                           value={reference} onChange={e => setReference(e.target.value)}
                           className="h-10 font-mono text-xs font-semibold"/>
                    <button type="button" onClick={() => setReference(suggestedRef)}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer">
                        Điền nhanh mã chứng từ nội bộ: {suggestedRef}
                    </button>
                </div>

                <p className="m-0 text-[11.5px] leading-relaxed text-slate-500">
                    Sau khi xác nhận, hóa đơn chuyển sang trạng thái <strong>ĐÃ THANH TOÁN</strong>, cấp hạn mức gói cước và đẩy thông báo WebSocket tức thì tới màn hình khách hàng.
                </p>

                <footer className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>{t('admin.invoices.cancel')}</Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={confirm.isPending} disabled={!reference.trim()}>
                        {t('admin.invoices.confirm')}
                    </Button>
                </footer>
            </form>
        </div>
    );
}

export function PaymentGatewayModal({onClose}: { onClose: () => void }) {
    const dialogRef = useRef<HTMLDivElement>(null);
    useDialogFocusTrap(dialogRef, true, onClose);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
             onMouseDown={e => e.target === e.currentTarget && onClose()}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Cấu hình cổng thanh toán VietQR" tabIndex={-1}
                 className="max-h-[calc(100dvh-32px)] w-full max-w-4xl overflow-y-auto rounded-panel bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                        <Landmark size={17} className="text-primary"/> Thiết lập nhanh Cổng Thanh toán VietQR & Webhook
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Đóng" className="h-8 w-8 p-0 text-slate-400">
                        <X size={18}/>
                    </Button>
                </div>
                <div className="p-4">
                    <PaymentGatewaySettingsSection onSaved={onClose}/>
                </div>
            </div>
        </div>
    );
}
