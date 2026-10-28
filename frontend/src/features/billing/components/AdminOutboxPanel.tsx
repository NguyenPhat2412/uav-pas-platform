'use client';

import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {RotateCw} from 'lucide-react';
import {AdminPage} from '@/components/layout/AdminPage';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {ErrorNotice, QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {cn} from '@/lib/utils';
import {commerceAdminApi, type FinancialOutboxEvent} from '@/features/billing/admin-api';

const filters = ['ALL', 'PENDING', 'WAITING_SUBSCRIBERS', 'FAILED', 'LOCAL_COMPLETED'] as const;

const statusTone: Record<string, string> = {
    LOCAL_COMPLETED: 'bg-uav-blue-light text-uav-blue ring-blue-200',
    PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
    WAITING_SUBSCRIBERS: 'bg-slate-100 text-slate-700 ring-slate-200',
    FAILED: 'bg-red-50 text-red-700 ring-red-200',
};

function prettyJson(payload: string) {
    try {
        return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
        return payload;
    }
}

export function AdminOutboxPanel() {
    const {t, formatDate} = useI18n();
    const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<FinancialOutboxEvent | null>(null);
    const client = useQueryClient();
    const query = useQuery({
        queryKey: ['admin', 'billing', 'outbox', filter, page],
        queryFn: ({signal}) => commerceAdminApi.outbox(page, filter === 'ALL' ? undefined : filter, signal),
    });
    const retry = useMutation({
        mutationFn: commerceAdminApi.retryOutbox,
        onSuccess: event => {
            toast.success(t('adminCommerce.outbox.retried', {id: event.id}));
            setSelected(current => (current?.id === event.id ? event : current));
            void client.invalidateQueries({queryKey: ['admin', 'billing', 'outbox']});
        },
    });
    const askRetry = (event: FinancialOutboxEvent) => {
        if (window.confirm(t('adminCommerce.outbox.retryConfirm', {id: event.id}))) retry.mutate(event.id);
    };
    const statusLabel = (status: string) => {
        const key = `adminCommerce.outboxStatus.${status}`;
        const text = t(key);
        return text === key ? status : text;
    };
    const statusBadge = (status: string) => <span className={cn('inline-flex px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
        statusTone[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200')}>{statusLabel(status)}</span>;
    const retryButton = (event: FinancialOutboxEvent) => event.retryable &&
        <button type="button" disabled={retry.isPending} onClick={e => {
            e.stopPropagation();
            askRetry(event);
        }} className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 text-xs font-semibold text-primary hover:bg-[#fdf2f2] disabled:opacity-50">
            <RotateCw size={13} aria-hidden="true"/>{t('adminCommerce.outbox.retry')}</button>;

    return <div className="space-y-4">
        <p className="border-l-[3px] border-l-uav-blue bg-uav-blue-light px-3 py-2 text-[13px] text-uav-blue">{t('adminCommerce.outbox.intro')}</p>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('adminCommerce.outbox.filterLabel')}>
            {filters.map(key => <button key={key} type="button" aria-pressed={filter === key}
                                        onClick={() => {
                                            setFilter(key);
                                            setPage(0);
                                        }}
                                        className={cn('h-9 border px-3 text-[13px] font-medium',
                                            filter === key ? 'border-primary bg-[#fdf2f2] text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                {key === 'ALL' ? t('adminCommerce.common.all') : statusLabel(key)}
            </button>)}
        </div>
        <ErrorNotice error={retry.error}/>

        <section className="border border-slate-200 bg-white">
            <QueryState query={query}>{query.data && <>
                {query.data.content.length ? <div className="overflow-x-auto" tabIndex={0} aria-label={t('adminCommerce.outbox.table')}>
                    <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
                        <thead className="bg-slate-50 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-3">{t('adminCommerce.outbox.col.event')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.outbox.col.invoice')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.outbox.col.status')}</th>
                            <th className="px-4 py-3 text-right">{t('adminCommerce.outbox.col.attempts')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.outbox.col.lastError')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.outbox.col.nextAttempt')}</th>
                            <th className="px-4 py-3">{t('adminCommerce.outbox.col.created')}</th>
                            <th className="px-4 py-3 text-right">{t('adminCommerce.outbox.col.actions')}</th>
                        </tr>
                        </thead>
                        <tbody>{query.data.content.map(event => <tr key={event.id} tabIndex={0}
                                                                     onClick={() => setSelected(event)}
                                                                     onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && setSelected(event)}
                                                                     className="cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none">
                            <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-slate-900">{event.eventType}</span>
                                <span className="block break-all font-mono text-[11px] text-slate-500">{event.id}</span></td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-700">#{event.invoiceId}</td>
                            <td className="px-4 py-3">{statusBadge(event.status)}</td>
                            <td className="px-4 py-3 text-right tabular-nums">{event.attempts}</td>
                            <td className="px-4 py-3 font-mono text-xs text-red-700">{event.lastError ?? '—'}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(event.nextAttemptAt)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(event.createdAt)}</td>
                            <td className="px-4 py-3 text-right">{retryButton(event)}</td>
                        </tr>)}</tbody>
                    </table>
                </div> : <p className="px-6 py-12 text-center text-[13px] text-slate-500">{t('adminCommerce.outbox.empty')}</p>}
                {query.data.totalPages > 1 && <div className="border-t border-slate-100 px-4 py-2">
                    <Pagination page={page} totalPages={query.data.totalPages} total={query.data.totalElements} onChange={setPage}/></div>}
            </>}</QueryState>
        </section>

        {selected && <Drawer title={t('adminCommerce.outbox.detailTitle', {type: selected.eventType})} onClose={() => setSelected(null)}>
            <Metadata items={[
                [t('adminCommerce.outbox.col.event'), <span key="id" className="break-all font-mono text-xs">{selected.id}</span>],
                [t('adminCommerce.outbox.col.status'), statusBadge(selected.status)],
                [t('adminCommerce.outbox.col.invoice'), `#${selected.invoiceId}`],
                [t('adminCommerce.outbox.customer'), `#${selected.userId}`],
                [t('adminCommerce.outbox.col.attempts'), String(selected.attempts)],
                [t('adminCommerce.outbox.notification'), t(selected.notificationCreated ? 'adminCommerce.outbox.notificationDone' : 'adminCommerce.outbox.notificationPending')],
                [t('adminCommerce.outbox.col.lastError'), selected.lastError ?? '—'],
                [t('adminCommerce.outbox.col.nextAttempt'), formatDate(selected.nextAttemptAt)],
                [t('adminCommerce.outbox.col.created'), formatDate(selected.createdAt)],
            ]}/>
            <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-700">{t('adminCommerce.outbox.payload')}</h3>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">{prettyJson(selected.payload)}</pre>
            </section>
            {selected.retryable
                ? <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500">{t('adminCommerce.outbox.retryHint')}</p>
                    {retryButton(selected)}
                </div>
                : <p className="text-xs text-slate-500">{t('adminCommerce.outbox.notRetryable')}</p>}
        </Drawer>}
    </div>;
}

export default function AdminOutboxPage() {
    return <AdminPage title="adminCommerce.pages.outbox" permission="USER_MANAGE" activeResource="/admin/billing/outbox">
        <AdminOutboxPanel/>
    </AdminPage>;
}
