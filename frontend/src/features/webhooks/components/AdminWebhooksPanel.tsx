'use client';

import React, {useEffect, useState} from 'react';
import {AdminPage} from '@/components/layout/AdminPage';
import {adminService} from "@/lib/api/admin";
import type {WebhookDeliveryLogItem, WebhookEndpointItem} from "@/types/admin";
import {Radio, RotateCw, Send} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';
import {WebhookSubscriptions} from '@/features/webhooks/components/WebhookSubscriptions';

type Translate = (key: string, params?: Record<string, string | number>) => string;
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
    const [webhooks, setWebhooks] = useState<WebhookEndpointItem[]>([]);
    const [logs, setLogs] = useState<WebhookDeliveryLogItem[]>([]);
    const [status, setStatus] = useState('UNKNOWN');
    const [loading, setLoading] = useState(true);
    const [isDispatching, setIsDispatching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const {t, formatDate} = useI18n();

    // Errors are stored as catalog keys and rendered through t(), so effects stay locale-independent.
    async function refresh(signal?: AbortSignal) {
        try {
            const [subscriptions, deliveries, runtime] = await Promise.all([
                adminService.webhooks(signal), adminService.webhookLogs(signal), adminService.webhookStatus(signal),
            ]);
            if (signal?.aborted) return;
            setWebhooks(subscriptions);
            setLogs(deliveries);
            setStatus(runtime.status);
        } catch {
            if (!signal?.aborted) {
                setError('admin.webhooks.loadError');
                setWebhooks([]);
                setLogs([]);
                setStatus('UNKNOWN');
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([adminService.webhooks(controller.signal), adminService.webhookLogs(controller.signal), adminService.webhookStatus(controller.signal)])
            .then(([subscriptions, deliveries, runtime]) => {
                if (controller.signal.aborted) return;
                setWebhooks(subscriptions);
                setLogs(deliveries);
                setStatus(runtime.status);
                setLoading(false);
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setError('admin.webhooks.loadError');
                setLoading(false);
            });
        return () => controller.abort();
    }, []);

    async function handleTestDispatch() {
        setIsDispatching(true);
        setError(null);
        setMessage(null);
        try {
            const result = await adminService.triggerWebhookTest();
            setMessage(`${statusLabel(result.status, t)}. ${result.message}`);
            await refresh();
        } catch {
            setError('admin.webhooks.testError');
        } finally {
            setIsDispatching(false);
        }
    }

    return <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-border bg-card p-5 text-foreground shadow-sm">
            <div><h2 className="flex items-center gap-2 text-lg font-bold text-foreground"><Radio size={20}/> {t('admin.webhooks.heading')}</h2>
                <p className="mt-2 text-sm text-slate-500">{t('admin.webhooks.intro')}</p></div>
            <div className="flex flex-wrap gap-2">
                <button
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card px-4 font-bold text-foreground transition hover:-translate-y-px hover:bg-background disabled:cursor-not-allowed disabled:opacity-55"
                    onClick={() => {
                        setLoading(true);
                        setError(null);
                        void refresh();
                    }} disabled={loading}><RotateCw size={16}/> {t('admin.webhooks.refresh')}
                </button>
                <button
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground transition hover:-translate-y-px hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
                    onClick={() => void handleTestDispatch()}
                    disabled={loading || isDispatching || status !== 'QUEUED'}><Send
                    size={16}/> {isDispatching ? t('admin.webhooks.recording') : t('admin.webhooks.testEvent')}</button>
            </div>
        </div>
        <div className="rounded-[18px] border border-border bg-card p-4 text-foreground shadow-sm" role="status">
            {status === 'UNCONFIGURED' ? t('admin.webhooks.runtime.unconfigured') : status === 'QUEUED' ? t('admin.webhooks.runtime.queued') : t('admin.webhooks.runtime.unknown')}
        </div>
        {error && <div role="alert" className="rounded-[18px] border border-border bg-card p-4 text-danger shadow-sm">{t(error)}</div>}
        {message && <div role="status" className="rounded-[18px] border border-border bg-card p-4 text-foreground shadow-sm">{message}</div>}
        {loading ? <p role="status">{t('admin.webhooks.loading')}</p> : <>
            <WebhookSubscriptions items={webhooks} onChanged={() => void refresh()}/>
            <section className="overflow-hidden rounded-[18px] border border-border bg-card text-foreground shadow-sm"><h3 className="p-5 font-semibold">{t('admin.webhooks.deliveryLog', {count: logs.length})}</h3>
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
                            </tr>)}</tbody>
                        </table>
                    </div>}
            </section>
        </>}
    </div>;
}

export default function WebhooksPage() {
    return <AdminPage title="admin.pages.webhooks.title"
                      meta="admin.pages.webhooks.meta" permission="USER_MANAGE"
                      activeResource="webhooks"><WebhooksContent/></AdminPage>;
}
