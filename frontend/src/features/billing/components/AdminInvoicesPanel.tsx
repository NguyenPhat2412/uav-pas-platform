'use client';

import {useState, type FormEvent} from 'react';
import {AlertTriangle, FilePlus2, X} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {planName} from '@/components/shared/presentation';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {OptionalMark, RequiredMark} from '@/components/shared/RequiredMark';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {formatShortDate} from '@/lib/format';
import {cn} from '@/lib/utils';
import {useAdminInvoices, useBillingPlans, useConfirmBankTransfer, useCreateInvoice, useInvoiceCustomerSearch} from '@/features/billing/hooks/useBillingAdmin';
import {type InvoiceFilters} from '@/features/billing/types/billing.types';
import type {InvoiceFilterKey} from '@/features/billing/types/billing.types';
import {toast} from '@/providers/ToastContext';
import type {Invoice, InvoiceStatus} from '@/types';

const filters: InvoiceFilterKey[] = ['ALL', 'PENDING', 'OVERDUE', 'PAID', 'FAILED', 'CANCELLED'];

const statusTone: Record<InvoiceStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
    PAID: 'bg-uav-blue-light text-uav-blue ring-blue-200',
    FAILED: 'bg-red-50 text-red-700 ring-red-200',
    CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const toFilters = (key: InvoiceFilterKey): InvoiceFilters =>
    key === 'ALL' ? {} : key === 'OVERDUE' ? {overdue: true} : {status: key};

export function AdminInvoicesPanel() {
    const {t, formatDate, formatCurrency} = useI18n();
    const [filter, setFilter] = useState<InvoiceFilterKey>('ALL');
    const [page, setPage] = useState(0);
    const [creating, setCreating] = useState(false);
    const [notice, setNotice] = useState('');
    const confirm = useConfirmBankTransfer({
        onSuccess: inv => {
            toast.success(t('admin.invoices.confirmed', {code: inv.code}));
        },
        onError: error => toast.error(error instanceof Error ? error.message : t('admin.invoices.confirmFailed')),
    });
    const askConfirm = (inv: Invoice) => {
        const reference = window.prompt(t('admin.invoices.confirmPrompt', {code: inv.code, amount: formatCurrency(inv.amount)}));
        if (reference && reference.trim()) confirm.mutate({id: inv.id, reference: reference.trim()});
    };
    const query = useAdminInvoices(page, toFilters(filter));
    // Captured once per mount so "overdue" stays stable across re-renders.
    const [now] = useState(() => Date.now());
    const isOverdue = (inv: Invoice) => inv.status === 'PENDING' && !!inv.dueDate && new Date(inv.dueDate).getTime() < now;
    const date = (value?: string) => formatShortDate(value, formatDate);

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label={t('admin.invoices.col.status')} value={filter}
                          onChange={key => {
                              setFilter(key);
                              setPage(0);
                          }}
                          options={filters.map(key => ({value: key, label: t(`admin.invoices.filter.${key}`)}))}/>
            <button type="button" onClick={() => setCreating(true)}
                    className="ml-auto inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                <FilePlus2 size={15} aria-hidden="true"/>{t('admin.invoices.create')}
            </button>
        </div>

        {notice && <p role="status" className="border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-[13px] text-uav-blue">{notice}</p>}

        <section className="border border-slate-200 bg-white">
            <QueryState query={query}>{query.data && <>
                {query.data.content.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.invoices.table')}>
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
                            <th className="px-4 py-3 text-right">{t('admin.invoices.col.actions')}</th>
                        </tr>
                        </thead>
                        <tbody>{query.data.content.map(inv => <tr key={inv.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{inv.code}
                                {inv.notes && <span className="mt-0.5 block font-sans text-[11.5px] font-normal text-slate-500">{inv.notes}</span>}</td>
                            <td className="px-4 py-3 text-slate-800">@{inv.username}</td>
                            <td className="px-4 py-3 text-slate-600">{inv.missionTitle || (inv.planName ? planName(inv.planName) : '—')}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(inv.amount)}</td>
                            <td className="px-4 py-3">
                                <span className={cn('inline-flex px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', statusTone[inv.status])}>
                                    {t(`admin.invoices.status.${inv.status}`)}</span>
                                {isOverdue(inv) && <span className="ml-1.5 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                                    <AlertTriangle size={12} aria-hidden="true"/>{t('admin.invoices.overdue')}</span>}
                            </td>
                            <td className={cn('whitespace-nowrap px-4 py-3', isOverdue(inv) ? 'font-semibold text-red-700' : 'text-slate-500')}>{date(inv.dueDate)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date(inv.paidAt)}</td>
                            <td className="px-4 py-3 text-right">{inv.status === 'PENDING' &&
                                <button type="button" disabled={confirm.isPending} onClick={() => askConfirm(inv)}
                                        className="whitespace-nowrap px-2 py-1 text-xs font-semibold text-primary hover:bg-uav-red-light disabled:opacity-50">
                                    {t('admin.invoices.confirm')}</button>}</td>
                        </tr>)}</tbody>
                    </table>
                </div> : <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t(filter === 'ALL' ? 'admin.invoices.empty' : 'admin.invoices.emptyFilter')}</p>}
                {query.data.totalPages > 1 && <div className="border-t border-slate-100 px-4 py-2">
                    <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/></div>}
            </>}</QueryState>
        </section>

        {creating && <CreateInvoiceDialog onClose={() => setCreating(false)} onCreated={code => {
            setCreating(false);
            setNotice(t('admin.invoices.created', {code}));
        }}/>}
    </div>;
}

function CreateInvoiceDialog({onClose, onCreated}: { onClose: () => void; onCreated: (code: string) => void }) {
    const {t} = useI18n();
    const [keyword, setKeyword] = useState('');
    const [customer, setCustomer] = useState<{ id: number; name: string } | null>(null);
    const [amount, setAmount] = useState('');
    const [planId, setPlanId] = useState('');
    const [missionId, setMissionId] = useState('');
    const [notes, setNotes] = useState('');
    const users = useInvoiceCustomerSearch(keyword, !customer);
    const plans = useBillingPlans();
    const create = useCreateInvoice();
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!customer) return;
        try {
            const invoice = await create.mutateAsync({
                userId: customer.id, amount: Number(amount), notes: notes.trim() || undefined,
                planId: planId ? Number(planId) : undefined, missionId: missionId ? Number(missionId) : undefined,
            });
            onCreated(invoice.code);
        } catch {/* Shown below. */
        }
    };
    const field = 'mt-1 w-full border border-slate-200 px-3 py-2 text-[13px] font-normal focus:border-primary focus:outline-none';
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation"
                onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <form role="dialog" aria-modal="true" aria-labelledby="create-invoice-title" onSubmit={e => void submit(e)}
              onKeyDown={e => e.key === 'Escape' && onClose()}
              className="flex max-h-[calc(100dvh-32px)] w-full max-w-lg flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl">
            <header className="flex items-center justify-between">
                <h2 id="create-invoice-title" className="text-lg font-bold">{t('admin.invoices.createTitle')}</h2>
                <button type="button" onClick={onClose} aria-label={t('admin.invoices.cancel')} className="p-1 text-slate-400 hover:bg-slate-100"><X size={18}/></button>
            </header>
            <div className="text-[13px] font-semibold text-slate-600">{t('admin.invoices.customer')}<RequiredMark/>
                {customer ? <div className="mt-1 flex items-center justify-between bg-uav-red-light px-3 py-2 text-primary">
                    <span>{customer.name}</span>
                    <button type="button" onClick={() => setCustomer(null)} className="text-xs font-semibold hover:underline">{t('admin.invoices.change')}</button>
                </div> : <>
                    <input autoFocus value={keyword} onChange={e => setKeyword(e.target.value)} className={field}
                           placeholder={t('admin.invoices.customerSearch')} aria-label={t('admin.invoices.customer')}/>
                    {users.data?.content.length ? <ul className="mt-1 max-h-48 overflow-y-auto border border-slate-200">
                        {users.data.content.map(u => <li key={u.id}>
                            <button type="button" onClick={() => setCustomer({id: u.id, name: u.fullName || u.username})}
                                    className="flex w-full justify-between px-3 py-2 text-left font-normal hover:bg-slate-50">
                                <span>{u.fullName || u.username}</span><small className="text-slate-400">@{u.username}</small>
                            </button>
                        </li>)}
                    </ul> : keyword.trim().length >= 2 && users.isFetched &&
                        <p className="mt-1 text-xs font-normal text-slate-500">{t('admin.invoices.noCustomer')}</p>}
                </>}
            </div>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.invoices.amount')}<RequiredMark/>
                <input aria-required type="number" step="1000" inputMode="numeric" value={amount}
                       onChange={e => setAmount(e.target.value)} className={cn(field, 'tabular-nums')}/></label>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[13px] font-semibold text-slate-600">{t('admin.invoices.plan')}<OptionalMark/>
                    <select value={planId} onChange={e => setPlanId(e.target.value)} className={field}>
                        <option value="">{t('admin.invoices.none')}</option>
                        {plans.data?.map(p => <option key={p.id} value={p.id}>{planName(p.name)}</option>)}
                    </select></label>
                <label className="text-[13px] font-semibold text-slate-600">{t('admin.invoices.missionId')}<OptionalMark/>
                    <input type="number" value={missionId} onChange={e => setMissionId(e.target.value)} className={field}/></label>
            </div>
            <label className="text-[13px] font-semibold text-slate-600">{t('admin.invoices.notes')}<OptionalMark/>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={field}/></label>
            <ErrorNotice error={create.error}/>
            <footer className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="h-9 border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    {t('admin.invoices.cancel')}</button>
                <button type="submit" disabled={!customer || !amount || create.isPending}
                        className="h-9 bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">{t('admin.invoices.submit')}</button>
            </footer>
        </form>
    </div>;
}
