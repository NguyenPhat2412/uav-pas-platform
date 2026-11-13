'use client';

import {useState, type FormEvent} from 'react';
import {Search, X} from 'lucide-react';
import {Alert, Button, Card, CardContent, FormField, Input, Select, StatusBadge} from '@/components/ui';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {Pagination} from '@/components/data/Pagination';
import {QueryState} from '@/components/data/WorkspaceState';
import {AdminPage} from '@/components/layout/AdminPage';
import {useAdminBillingRealtime, useBillingTransactions} from '@/hooks/billing/useBillingAdmin';
import {useI18n} from '@/providers/I18nContext';
import type {AdminPaymentTransaction, TransactionFilters} from '@/types/billing/billing-admin.types';

const statuses = ['SUCCESS', 'PENDING', 'MISMATCH', 'UNMATCHED', 'FAILED'] as const;
const gateways = ['VIETQR_SEPAY_AUTO', 'VIETQR_NAPAS_247', 'BANK_TRANSFER_MANUAL', 'VIETQR_NAPAS'] as const;

export function AdminTransactionsPanel() {
    const {t, formatDate, formatCurrency} = useI18n();
    useAdminBillingRealtime(true);
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

    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-4">
                    <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6" aria-label={t('adminCommerce.tx.filters')}>
                        <FormField id="tx-keyword" label={t('adminCommerce.tx.keyword')} optional={false} className="lg:col-span-2">
                            <Input
                                id="tx-keyword"
                                value={draft.q ?? ''}
                                onChange={e => set('q')(e.target.value)}
                                placeholder={t('adminCommerce.tx.keywordPlaceholder')}
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                        <FormField id="tx-status" label={t('adminCommerce.tx.status')} optional={false}>
                            <Select id="tx-status" value={draft.status ?? ''} onChange={e => set('status')(e.target.value)} className="h-9 text-[13px]">
                                <option value="">{t('adminCommerce.common.all')}</option>
                                {statuses.map(s => <option key={s} value={s}>{t(`adminCommerce.txStatus.${s}`)}</option>)}
                            </Select>
                        </FormField>
                        <FormField id="tx-gateway" label={t('adminCommerce.tx.gateway')} optional={false}>
                            <Select id="tx-gateway" value={draft.gateway ?? ''} onChange={e => set('gateway')(e.target.value)} className="h-9 text-[13px]">
                                <option value="">{t('adminCommerce.common.all')}</option>
                                {gateways.map(g => <option key={g} value={g}>{t(`adminCommerce.gateway.${g}`)}</option>)}
                            </Select>
                        </FormField>
                        <FormField id="tx-from" label={t('adminCommerce.tx.from')} optional={false}>
                            <Input id="tx-from" type="date" value={draft.from ?? ''} max={draft.to} onChange={e => set('from')(e.target.value)} className="h-9 text-[13px]"/>
                        </FormField>
                        <FormField id="tx-to" label={t('adminCommerce.tx.to')} optional={false}>
                            <Input id="tx-to" type="date" value={draft.to ?? ''} min={draft.from} onChange={e => set('to')(e.target.value)} className="h-9 text-[13px]"/>
                        </FormField>
                        <FormField id="tx-invoice-id" label={t('adminCommerce.tx.invoiceId')} optional={false}>
                            <Input
                                id="tx-invoice-id"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={draft.invoiceId ?? ''}
                                onChange={e => set('invoiceId')(e.target.value.replace(/\D/g, ''))}
                                className="h-9 text-[13px]"
                            />
                        </FormField>
                        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5 lg:justify-end">
                            <Button type="button" variant="outline" size="sm" leftIcon={<X size={14} aria-hidden="true"/>} onClick={reset}>
                                {t('adminCommerce.tx.reset')}
                            </Button>
                            <Button type="submit" variant="primary" size="sm" leftIcon={<Search size={14} aria-hidden="true"/>}>
                                {t('adminCommerce.tx.apply')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <QueryState query={query}>
                        {query.data && (
                            <>
                                {query.data.content.length ? (
                                    <div className="overflow-x-auto" tabIndex={0} aria-label={t('adminCommerce.tx.table')}>
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
                                            <tbody>
                                            {query.data.content.map(tx => (
                                                <tr
                                                    key={tx.id}
                                                    tabIndex={0}
                                                    onClick={() => setSelected(tx)}
                                                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelected(tx)}
                                                    aria-label={t('adminCommerce.tx.open', {code: tx.transactionCode})}
                                                    className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none"
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{date(tx.createdAt)}</td>
                                                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">{tx.transactionCode}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{tx.invoiceCode ?? '—'}</td>
                                                    <td className="px-4 py-3 text-slate-800">
                                                        {tx.customerName || (tx.username ? `@${tx.username}` : '—')}
                                                        {tx.customerName && tx.username && <span className="block text-xs text-slate-500">@{tx.username}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{label('gateway', tx.gatewayName)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(tx.amount)}</td>
                                                    <td className="px-4 py-3">
                                                        <StatusBadge status={tx.status === 'SUCCESS' ? 'COMPLETED' : tx.status} label={label('txStatus', tx.status)}/>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t('adminCommerce.tx.empty')}</p>
                                )}
                                {query.data.totalPages > 1 && (
                                    <div className="border-t border-slate-100 px-4 py-2">
                                        <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/>
                                    </div>
                                )}
                            </>
                        )}
                    </QueryState>
                </CardContent>
            </Card>

            {selected && (
                <Drawer title={t('adminCommerce.tx.detail.title', {code: selected.transactionCode})} onClose={() => setSelected(null)}>
                    <Metadata
                        items={[
                            [t('adminCommerce.tx.detail.transactionCode'), <span key="c" className="font-mono">{selected.transactionCode}</span>],
                            [t('adminCommerce.tx.detail.status'), <StatusBadge key="s" status={selected.status === 'SUCCESS' ? 'COMPLETED' : selected.status} label={label('txStatus', selected.status)}/>],
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
                        ]}
                    />
                    {selected.invoiceAmount != null && Number(selected.invoiceAmount) !== Number(selected.amount) && (
                        <Alert variant="warning" role="status">{t('adminCommerce.tx.detail.amountMismatch')}</Alert>
                    )}
                    <section className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-slate-700">{t('adminCommerce.tx.detail.raw')}</h3>
                        <p className="text-xs text-slate-500">{t('adminCommerce.tx.detail.rawHint')}</p>
                        {selected.rawCallback ? (
                            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-control border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
                                {selected.rawCallback}
                            </pre>
                        ) : (
                            <p className="text-[13px] text-slate-500">{t('adminCommerce.tx.detail.noRaw')}</p>
                        )}
                    </section>
                </Drawer>
            )}
        </div>
    );
}

export default function AdminTransactionsPage() {
    return (
        <AdminPage title="adminCommerce.pages.transactions" permission="USER_MANAGE" activeResource="/admin/billing/transactions">
            <AdminTransactionsPanel/>
        </AdminPage>
    );
}
