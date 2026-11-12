'use client';

import {useRef, useState, type FormEvent} from 'react';
import {AlertTriangle, Download, FilePlus2, X} from 'lucide-react';
import {Alert, Badge, Button, Card, CardContent, FormField, Input, Select, StatusBadge, Textarea} from '@/components/ui';
import {Pagination} from '@/components/data/Pagination';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {canSubmitCreateInvoice, emptyCreateInvoiceDraft, invoiceFieldErrors, toCreateInvoicePayload} from '@/forms/billing/billing-form';
import {
    useAdminInvoices,
    useBillingPlans,
    useConfirmBankTransfer,
    useCreateInvoice,
    useDownloadAdminInvoiceReceipt,
    useInvoiceCustomerSearch,
} from '@/hooks/billing/useBillingAdmin';
import {useMissions} from '@/hooks/mission/useCustomerMissions';
import {useDialogFocusTrap} from '@/hooks/useDialogFocusTrap';
import {formatShortDate} from '@/lib/format';
import {planName} from '@/lib/presentation';
import {cn} from '@/lib/utils';
import {promptDialog} from '@/providers/ConfirmContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {Invoice} from '@/types';
import type {InvoiceFilterKey, InvoiceFilters} from '@/types/billing/billing.types';

const filters: InvoiceFilterKey[] = ['ALL', 'PENDING', 'OVERDUE', 'PAID', 'FAILED', 'CANCELLED'];

const toFilters = (key: InvoiceFilterKey): InvoiceFilters =>
    key === 'ALL' ? {} : key === 'OVERDUE' ? {overdue: true} : {status: key};

export function AdminInvoicesPanel() {
    const {t, formatDate, formatCurrency} = useI18n();
    const [filter, setFilter] = useState<InvoiceFilterKey>('ALL');
    const [page, setPage] = useState(0);
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState('');
    const confirm = useConfirmBankTransfer({
        onSuccess: inv => toast.success(t('admin.invoices.confirmed', {code: inv.code})),
        onError: error => toast.error(error instanceof Error ? error.message : t('admin.invoices.confirmFailed')),
    });
    const downloadReceipt = useDownloadAdminInvoiceReceipt({
        onError: error => toast.error(error instanceof Error ? error.message : t('admin.invoices.downloadPdfFailed')),
    });
    const askConfirm = async (inv: Invoice) => {
        const reference = await promptDialog({
            title: t('admin.invoices.confirm'),
            description: t('admin.invoices.confirmPrompt', {code: inv.code, amount: formatCurrency(inv.amount)}),
            inputLabel: t('admin.invoices.referenceLabel'),
            inputPlaceholder: t('admin.invoices.referencePlaceholder'),
            confirmLabel: t('admin.invoices.confirm'),
            variant: 'primary',
        });
        if (reference && reference.trim()) confirm.mutate({id: inv.id, reference: reference.trim()});
    };
    const query = useAdminInvoices(page, toFilters(filter));
    // Captured once per mount so "overdue" stays stable across re-renders.
    const [now] = useState(() => Date.now());
    const isOverdue = (inv: Invoice) => inv.status === 'PENDING' && !!inv.dueDate && new Date(inv.dueDate).getTime() < now;
    const date = (value?: string) => formatShortDate(value, formatDate);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                    label={t('admin.invoices.col.status')}
                    value={filter}
                    onChange={key => {
                        setFilter(key);
                        setPage(0);
                    }}
                    options={filters.map(key => ({value: key, label: t(`admin.invoices.filter.${key}`)}))}
                />
                <Button type="button" variant="primary" size="sm" leftIcon={<FilePlus2 size={15} aria-hidden="true"/>}
                        onClick={() => setCreating(true)} className="ml-auto">
                    {t('admin.invoices.create')}
                </Button>
            </div>

            {notice && <Alert variant="info" role="status">{notice}</Alert>}

            <Card>
                <CardContent className="p-0">
                    <QueryState query={query}>{query.data && <>
                        {query.data.content.length ? (
                            <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.invoices.table')}>
                                <table className="w-full min-w-[880px] border-collapse text-left text-[13px]">
                                    <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">{t('admin.invoices.col.code')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.customer')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.item')}</th>
                                        <th className="px-4 py-3 text-right">{t('admin.invoices.col.amount')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.status')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.due')}</th>
                                        <th className="px-4 py-3">{t('admin.invoices.col.paid')}</th>
                                        <th className="sticky right-0 bg-slate-50 px-4 py-3 text-right">{t('admin.invoices.col.actions')}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {query.data.content.map(inv => (
                                        <tr key={inv.id} className="group border-t border-slate-100 align-top hover:bg-slate-50/70">
                                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                                                {inv.code}
                                                {inv.notes && <span className="mt-0.5 block font-sans text-[11.5px] font-normal text-slate-500">{inv.notes}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-800">@{inv.username}</td>
                                            <td className="px-4 py-3 text-slate-600">{inv.missionTitle || (inv.planName ? planName(inv.planName) : '—')}</td>
                                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(inv.amount)}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge
                                                    status={inv.status === 'PAID' ? 'COMPLETED' : inv.status}
                                                    label={t(`admin.invoices.status.${inv.status}`)}
                                                    className={inv.status === 'PAID' ? 'border-slate-900 bg-slate-900 text-white [&>span]:bg-white' : undefined}
                                                />
                                                {isOverdue(inv) && (
                                                    <Badge variant="error" size="sm" icon={<AlertTriangle size={12} aria-hidden="true"/>} className="ml-1.5">
                                                        {t('admin.invoices.overdue')}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className={cn('whitespace-nowrap px-4 py-3', isOverdue(inv) ? 'font-semibold text-red-700' : 'text-slate-500')}>{date(inv.dueDate)}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date(inv.paidAt)}</td>
                                            <td className="sticky right-0 bg-white px-4 py-3 text-right group-hover:bg-slate-50">
                                                <div className="inline-flex items-center justify-end gap-1.5">
                                                    {inv.status === 'PENDING' && (
                                                        <Button type="button" variant="ghost" size="sm" disabled={confirm.isPending}
                                                                onClick={() => void askConfirm(inv)} className="h-7 whitespace-nowrap px-2 text-xs">
                                                            {t('admin.invoices.confirm')}
                                                        </Button>
                                                    )}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        isLoading={downloadReceipt.isPending && downloadReceipt.variables?.id === inv.id}
                                                        leftIcon={<Download size={13} aria-hidden="true"/>}
                                                        onClick={() => downloadReceipt.mutate({id: inv.id, code: inv.code})}
                                                        aria-label={t('admin.invoices.downloadPdfAria', {code: inv.code})}
                                                        title={t('admin.invoices.downloadPdfAria', {code: inv.code})}
                                                        className="h-7 whitespace-nowrap px-2 text-xs"
                                                    >
                                                        {t('admin.invoices.downloadPdf')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="px-6 py-12 text-center text-[13px] text-slate-500">
                                {t(filter === 'ALL' ? 'admin.invoices.empty' : 'admin.invoices.emptyFilter')}
                            </p>
                        )}
                        {query.data.totalPages > 1 && (
                            <div className="border-t border-slate-100 px-4 py-2">
                                <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
                            </div>
                        )}
                    </>}</QueryState>
                </CardContent>
            </Card>

            {creating && <CreateInvoiceDialog onClose={() => setCreating(false)} onCreated={code => {
                setCreating(false);
                setNotice(t('admin.invoices.created', {code}));
            }}/>}
        </div>
    );
}

function CreateInvoiceDialog({onClose, onCreated}: { onClose: () => void; onCreated: (code: string) => void }) {
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
        } catch {/* Shown below. */}
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
