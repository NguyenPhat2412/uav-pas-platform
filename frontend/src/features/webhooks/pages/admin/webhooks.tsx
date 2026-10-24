'use client';

import React, {useEffect, useState} from 'react';
import {AdminPage} from '@/components/layout/AdminPage';
import {adminService} from "@/lib/api/admin";
import type {WebhookDeliveryLogItem, WebhookEndpointItem} from "@/types/admin";
import {Radio, RotateCw, Send} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

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

    return <div className="portal-management space-y-6">
        <div className="portal-card p-5 flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-bold flex items-center gap-2"><Radio size={20}/> {t('admin.webhooks.heading')}</h2>
                <p className="text-sm text-slate-500 mt-2">{t('admin.webhooks.intro')}</p></div>
            <div className="flex flex-wrap gap-2">
                <button
                    className="portal-button portal-button-outline inline-flex items-center justify-center gap-2 px-4"
                    onClick={() => {
                        setLoading(true);
                        setError(null);
                        void refresh();
                    }} disabled={loading}><RotateCw size={16}/> {t('admin.webhooks.refresh')}
                </button>
                <button
                    className="portal-button portal-button-primary inline-flex items-center justify-center gap-2 px-4"
                    onClick={() => void handleTestDispatch()}
                    disabled={loading || isDispatching || status !== 'QUEUED'}><Send
                    size={16}/> {isDispatching ? t('admin.webhooks.recording') : t('admin.webhooks.testEvent')}</button>
            </div>
        </div>
        <div className="portal-card p-4" role="status">
            {status === 'UNCONFIGURED' ? t('admin.webhooks.runtime.unconfigured') : status === 'QUEUED' ? t('admin.webhooks.runtime.queued') : t('admin.webhooks.runtime.unknown')}
        </div>
        {error && <div role="alert" className="portal-card p-4 text-red-700">{t(error)}</div>}
        {message && <div role="status" className="portal-card p-4">{message}</div>}
        {loading ? <p role="status">{t('admin.webhooks.loading')}</p> : <>
            <section><h3 className="font-semibold mb-3">{t('admin.webhooks.subscriptions')}</h3>
                {webhooks.length === 0 ? <p>{t('admin.webhooks.noSubscriptions')}</p> :
                    <div className="grid md:grid-cols-3 gap-4">{webhooks.map(item => <div key={item.id}
                                                                                          className="portal-card p-5">
                        <p className="text-xs text-slate-500">{item.isActive ? t('admin.webhooks.subscriptionOn') : t('admin.webhooks.subscriptionOff')}</p>
                        <h4 className="font-semibold mt-2">{item.name}</h4>
                        <p className="text-xs break-all mt-2">{item.targetUrl}</p><p className="text-xs mt-3">{t('admin.webhooks.events', {events: item.eventsSubscribed})}</p>
                    </div>)}</div>}
            </section>
            <section className="portal-card overflow-hidden"><h3 className="font-semibold p-5">{t('admin.webhooks.deliveryLog', {count: logs.length})}</h3>
                {logs.length === 0 ? <p className="p-5">{t('admin.webhooks.noDeliveries')}</p> :
                    <div className="table-scroll" tabIndex={0} aria-label={t('admin.webhooks.logTable')}>
                        <table className="console-table w-full text-left">
                            <thead>
                            <tr>
                                <th>{t('admin.webhooks.col.destination')}</th>
                                <th>{t('admin.webhooks.col.event')}</th>
                                <th>{t('admin.webhooks.col.status')}</th>
                                <th>HTTP</th>
                                <th>{t('admin.webhooks.col.attempts')}</th>
                                <th>{t('admin.webhooks.col.time')}</th>
                            </tr>
                            </thead>
                            <tbody>{logs.map(log => <tr key={log.id}>
                                <td>{log.subscriptionName}</td>
                                <td>{log.eventType}
                                    <div className="text-xs text-slate-500">{log.eventId ?? t('admin.webhooks.legacyEvent')}</div>
                                </td>
                                <td>{statusLabel(log.deliveryStatus, t)}</td>
                                <td>{log.responseStatusCode ?? t('admin.webhooks.noResponse')}</td>
                                <td>{log.retryCount}</td>
                                <td>{formatDate(log.attemptedAt)}</td>
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
