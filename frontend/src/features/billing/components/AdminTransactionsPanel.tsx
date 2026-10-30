'use client';

import {useState, type FormEvent} from 'react';
import {Search, X} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {AdminPaymentTransaction, TransactionFilters} from '@/features/billing/api/billing-admin.api';
import {useBillingTransactions} from '@/features/billing/hooks/useBillingAdmin';

const statuses = ['SUCCESS', 'PENDING', 'FAILED'] as const;
const gateways = ['VIETQR_NAPAS_247', 'BANK_TRANSFER_MANUAL', 'VIETQR_NAPAS'] as const;

const statusTone: Record<string, string> = {
    SUCCESS: 'bg-uav-blue-light text-uav-blue ring-blue-200',
    PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
    FAILED: 'bg-red-50 text-red-700 ring-red-200',
};

const field = 'h-9 w-full border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 focus:border-primary focus:outline-none';

export function AdminTransactionsPanel() {
    const {t, formatDate, formatCurrency} = useI18n();
    const [draft, setDraft] = useState<TransactionFilters>({});
    const [filters, setFilters] = useState<TransactionFilters>({});
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<AdminPaymentTransaction | null>(null);
    const query = useBillingTransactions(page, filters);
    // Unknown provider values are shown verbatim rather than as a missing catalog key.
    const label = (key: string, value: string | null | undefined) => {
        if (!value) return '—';
        const catalogKey = `adminCommerce.${key}.${value}`;
        const text = t(catalogKey);
        return text === catalogKey ? value : text;
    };
    const date = (value: string | null) => (value ? formatDate(value) : '—');
    const apply = (e: FormEvent) => {
        e.preventDefault();
        setFilters(draft);
        setPage(0);
    };
    const reset = () => {
        setDraft({});
        setFilters({});
        setPage(0);
    };
    const set = (key: keyof TransactionFilters) => (value: string) => setDraft(d => ({...d, [key]: value || undefined}));

    return <div className="space-y-4">
        <form onSubmit={apply} className="grid gap-3 border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
              aria-label={t('adminCommerce.tx.filters')}>
            <label className="text-xs font-semibold text-slate-600 lg:col-span-2">{t('adminCommerce.tx.keyword')}
                <input className={cn(field, 'mt-1')} value={draft.q ?? ''} onChange={e => set('q')(e.target.value)}
                       placeholder={t('adminCommerce.tx.keywordPlaceholder')}/></label>
            <label className="text-xs font-semibold text-slate-600">{t('adminCommerce.tx.status')}
                <select className={cn(field, 'mt-1')} value={draft.status ?? ''} onChange={e => set('status')(e.target.value)}>
                    <option value="">{t('adminCommerce.common.all')}</option>
                    {statuses.map(s => <option key={s} value={s}>{t(`adminCommerce.txStatus.${s}`)}</option>)}
                </select></label>
            <label className="text-xs font-semibold text-slate-600">{t('adminCommerce.tx.gateway')}
                <select className={cn(field, 'mt-1')} value={draft.gateway ?? ''} onChange={e => set('gateway')(e.target.value)}>
                    <option value="">{t('adminCommerce.common.all')}</option>
                    {gateways.map(g => <option key={g} value={g}>{t(`adminCommerce.gateway.${g}`)}</option>)}
                </select></label>
            <label className="text-xs font-semibold text-slate-600">{t('adminCommerce.tx.from')}
                <input type="date" className={cn(field, 'mt-1')} value={draft.from ?? ''} max={draft.to}
                       onChange={e => set('from')(e.target.value)}/></label>
            <label className="text-xs font-semibold text-slate-600">{t('adminCommerce.tx.to')}
                <input type="date" className={cn(field, 'mt-1')} value={draft.to ?? ''} min={draft.from}
                       onChange={e => set('to')(e.target.value)}/></label>
            <label className="text-xs font-semibold text-slate-600">{t('adminCommerce.tx.invoiceId')}
                <input inputMode="numeric" pattern="[0-9]*" className={cn(field, 'mt-1')} value={draft.invoiceId ?? ''}
                       onChange={e => set('invoiceId')(e.target.value.replace(/\D/g, ''))}/></label>
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5 lg:justify-end">
                <button type="button" onClick={reset}
                        className="inline-flex h-9 items-center gap-1.5 border border-slate-200 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
                    <X size={14} aria-hidden="true"/>{t('adminCommerce.tx.reset')}</button>
                <button type="submit"
                        className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                    <Search size={14} aria-hidden="true"/>{t('adminCommerce.tx.apply')}</button>
            </div>
        </form>

        <section className="border border-slate-200 bg-white">
            <QueryState query={query}>{query.data && <>
                {query.data.content.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('adminCommerce.tx.table')}>
                    <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                        <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3">{t('adminCommerce.tx.col.time')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.tx.col.code')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.tx.col.invoice')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.tx.col.customer')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.tx.col.gateway')}</th>
                            <th className="px-4 py-3 text-right">{t('adminCommerce.tx.col.amount')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.tx.col.status')}</th>
                        </tr>
                        </thead>
                        <tbody>{query.data.content.map(tx => <tr key={tx.id} tabIndex={0}
                                                                 onClick={() => setSelected(tx)}
                                                                 onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelected(tx)}
                                                                 aria-label={t('adminCommerce.tx.open', {code: tx.transactionCode})}
                                                                 className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date(tx.createdAt)}</td>
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{tx.transactionCode}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">{tx.invoiceCode ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-800">{tx.customerName || (tx.username ? `@${tx.username}` : '—')}
                                {tx.customerName && tx.username && <span className="block text-xs text-slate-500">@{tx.username}</span>}</td>
                            <td className="px-4 py-3 text-slate-600">{label('gateway', tx.gatewayName)}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(tx.amount)}</td>
                            <td className="px-4 py-3"><span className={cn('inline-flex px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                                statusTone[tx.status] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>{label('txStatus', tx.status)}</span></td>
                        </tr>)}</tbody>
                    </table>
                </div> : <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t('adminCommerce.tx.empty')}</p>}
                {query.data.totalPages > 1 && <div className="border-t border-slate-100 px-4 py-2">
                    <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/></div>}
            </>}</QueryState>
        </section>

        {selected && <Drawer title={t('adminCommerce.tx.detail.title', {code: selected.transactionCode})} onClose={() => setSelected(null)}>
            <Metadata items={[
                [t('adminCommerce.tx.detail.transactionCode'), <span key="c" className="font-mono">{selected.transactionCode}</span>],
                [t('adminCommerce.tx.detail.status'), label('txStatus', selected.status)],
                [t('adminCommerce.tx.detail.gateway'), label('gateway', selected.gatewayName)],
                [t('adminCommerce.tx.detail.amount'), formatCurrency(selected.amount)],
                [t('adminCommerce.tx.detail.invoice'), selected.invoiceCode ? `${selected.invoiceCode} (#${selected.invoiceId})` : '—'],
                [t('adminCommerce.tx.detail.invoiceStatus'), selected.invoiceStatus ?? '—'],
                [t('adminCommerce.tx.detail.invoiceAmount'), selected.invoiceAmount != null ? formatCurrency(selected.invoiceAmount) : '—'],
                [t('adminCommerce.tx.detail.customer'), selected.customerName || (selected.username ? `@${selected.username}` : '—')],
                [t('adminCommerce.tx.detail.email'), selected.customerEmail ?? '—'],
                [t('adminCommerce.tx.detail.bank'), selected.bankBin || selected.bankAccountNumber ? `${selected.bankBin ?? '—'} · ${selected.bankAccountNumber ?? '—'}` : '—'],
                [t('adminCommerce.tx.detail.created'), date(selected.createdAt)],
                [t('adminCommerce.tx.detail.completed'), date(selected.completedAt)],
            ]}/>
            {selected.invoiceAmount != null && Number(selected.invoiceAmount) !== Number(selected.amount) &&
                <p role="status" className="border-l-[3px] border-l-amber-500 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
                    {t('adminCommerce.tx.detail.amountMismatch')}</p>}
            <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-700">{t('adminCommerce.tx.detail.raw')}</h3>
                <p className="text-xs text-slate-500">{t('adminCommerce.tx.detail.rawHint')}</p>
                {selected.rawCallback
                    ? <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">{selected.rawCallback}</pre>
                    : <p className="text-[13px] text-slate-500">{t('adminCommerce.tx.detail.noRaw')}</p>}
            </section>
        </Drawer>}
    </div>;
}

export default function AdminTransactionsPage() {
    return <AdminPage title="adminCommerce.pages.transactions" permission="USER_MANAGE" activeResource="/admin/billing/transactions">
        <AdminTransactionsPanel/>
    </AdminPage>;
}
