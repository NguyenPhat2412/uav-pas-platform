'use client';

import React, {useState} from 'react';
import {AdminPage} from '@/components/layout/AdminPage';
import {RotateCw, Send} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {WebhookSubscriptions} from '@/components/webhook/WebhookSubscriptions';
import {ErrorNotice} from '@/components/data/WorkspaceState';
import {toast} from '@/providers/ToastContext';
import {useRetryDelivery, useWebhookOverview, useWebhookTestDispatch} from '@/hooks/webhook/useWebhooks';

import type {Translate} from '@/types';
const knownStatuses = ['QUEUED', 'DELIVERED', 'FAILED', 'RETRYING', 'CANCELLED', 'UNCONFIGURED', 'LEGACY_UNVERIFIED'];
// Without a translator the Vietnamese label is returned, which keeps this mapper testable outside React.
const statusLabel = (status: string, t?: Translate) => t
    ? t(`admin.webhooks.status.${knownStatuses.includes(status) ? status : 'unknown'}`)
    : ({
        QUEUED: 'Đã xếp hàng',
        DELIVERED: 'Đã nhận HTTP 2xx',
        FAILED: 'Gửi thất bại',
        RETRYING: 'Đang chờ gửi lại',
        CANCELLED: 'Đã hủy — đích nhận đã xóa',
        UNCONFIGURED: 'Chưa cấu hình',
        LEGACY_UNVERIFIED: 'Lịch sử chưa xác minh',
    }[status] ?? 'Chưa xác định');

function WebhooksContent() {
    const overview = useWebhookOverview();
    const webhooks = overview.data?.subscriptions ?? [];
    const logs = overview.data?.deliveries ?? [];
    const status = overview.data?.status ?? 'UNKNOWN';
    const [reloading, setReloading] = useState(false);
    const loading = overview.isPending || reloading;
    const testDispatch = useWebhookTestDispatch();
    const isDispatching = testDispatch.isPending;
    // Errors are catalog keys rendered through t(), so they follow language changes.
    const [actionError, setError] = useState<string | null>(null);
    const error = actionError ?? (overview.isError && !overview.isFetching ? 'admin.webhooks.loadError' : null);
    const [message, setMessage] = useState<string | null>(null);
    const {t, formatDate} = useI18n();
    // Manual requeue of a FAILED delivery; the delivery worker sends it on its next run.
    const retryDelivery = useRetryDelivery({
        onSuccess: () => {
            toast.success(t('adminCommerce.webhooks.retried'));
            void refresh();
        },
    });

    const refresh = () => overview.refetch();

    async function handleTestDispatch() {
        setError(null);
        setMessage(null);
        try {
            const result = await testDispatch.mutateAsync();
            setMessage(`${statusLabel(result.status, t)}. ${result.message}`);
            await refresh();
        } catch {
            setError('admin.webhooks.testError');
        }
    }

    return <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-4 py-3 text-foreground">
            <p className="m-0 min-w-0 flex-1 text-sm text-slate-600" role="status">
                {status === 'UNCONFIGURED' ? t('admin.webhooks.runtime.unconfigured') : status === 'QUEUED' ? t('admin.webhooks.runtime.queued') : t('admin.webhooks.runtime.unknown')}
            </p>
            <div className="flex flex-wrap gap-2">
                <button
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control border border-border bg-card px-4 font-bold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-55"
                    onClick={() => {
                        setReloading(true);
                        setError(null);
                        void refresh().finally(() => setReloading(false));
                    }} disabled={loading}><RotateCw size={16}/> {t('admin.webhooks.refresh')}
                </button>
                <button
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-control bg-primary px-4 font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
                    onClick={() => void handleTestDispatch()}
                    disabled={loading || isDispatching || status !== 'QUEUED'}><Send
                    size={16}/> {isDispatching ? t('admin.webhooks.recording') : t('admin.webhooks.testEvent')}</button>
            </div>
        </div>
        {error && <div role="alert" className="rounded-panel border border-border bg-card p-4 text-danger">{t(error)}</div>}
        {message && <div role="status" className="rounded-panel border border-border bg-card p-4 text-foreground">{message}</div>}
        {loading ? <p role="status">{t('admin.webhooks.loading')}</p> : <>
            <WebhookSubscriptions items={webhooks} onChanged={() => void refresh()}/>
            <section className="overflow-hidden rounded-panel border border-border bg-card text-foreground"><h3 className="p-5 font-semibold">{t('admin.webhooks.deliveryLog', {count: logs.length})}</h3>
                {retryDelivery.error && <div className="px-5 pb-3"><ErrorNotice error={retryDelivery.error}/></div>}
                {logs.length === 0 ? <p className="p-5">{t('admin.webhooks.noDeliveries')}</p> :
                    <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.webhooks.logTable')}>
                        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
                            <thead>
                            <tr>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('admin.webhooks.col.destination')}</th>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('admin.webhooks.col.event')}</th>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('admin.webhooks.col.status')}</th>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">HTTP</th>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('admin.webhooks.col.attempts')}</th>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500">{t('admin.webhooks.col.time')}</th>
                                <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-right text-xs font-semibold text-slate-500">{t('admin.webhooks.col.actions')}</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-border">{logs.map(log => <tr key={log.id} className="transition-colors hover:bg-background">
                                <td className="px-4 py-3.5 align-middle text-foreground">{log.subscriptionName}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{log.eventType}
                                    <div className="text-xs text-slate-500">{log.eventId ?? t('admin.webhooks.legacyEvent')}</div>
                                </td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{statusLabel(log.deliveryStatus, t)}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{log.responseStatusCode ?? t('admin.webhooks.noResponse')}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{log.retryCount}</td>
                                <td className="px-4 py-3.5 align-middle text-foreground">{formatDate(log.attemptedAt)}</td>
                                <td className="px-4 py-3.5 text-right align-middle">{log.deliveryStatus === 'FAILED' &&
                                    <button type="button" disabled={retryDelivery.isPending}
                                            onClick={() => {
                                                if (window.confirm(t('adminCommerce.webhooks.retryConfirm', {event: log.eventType, name: log.subscriptionName}))) retryDelivery.mutate(log.id);
                                            }}
                                            className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 text-xs font-semibold text-primary hover:bg-uav-red-light disabled:opacity-50">
                                        <RotateCw size={13} aria-hidden="true"/>{t('adminCommerce.webhooks.retry')}</button>}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>}
            </section>
        </>}
    </div>;
}

export default function WebhooksPage() {
    return <AdminPage title="admin.pages.webhooks.title" permission="USER_MANAGE"
                      activeResource="webhooks"><WebhooksContent/></AdminPage>;
}
