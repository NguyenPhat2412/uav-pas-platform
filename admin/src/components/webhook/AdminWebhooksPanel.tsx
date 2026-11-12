'use client';

import React, {useState} from 'react';
import {RotateCw, Send} from 'lucide-react';
import {Alert, Badge, Button, Card, CardHeader, CardTitle, Spinner, StatusBadge} from '@/components/ui';
import {AdminPage} from '@/components/layout/AdminPage';
import {confirmDialog} from '@/providers/ConfirmContext';
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
    const refresh = () => overview.refetch();

    // Manual requeue of a FAILED delivery; the delivery worker sends it on its next run.
    const retryDelivery = useRetryDelivery({
        onSuccess: () => {
            toast.success(t('adminCommerce.webhooks.retried'));
            void refresh();
        },
    });

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

    return (
        <div className="space-y-6">
            <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5" role="status">
                    <StatusBadge status={status === 'QUEUED' ? 'READY' : status} label={statusLabel(status, t)}/>
                    <p className="m-0 min-w-0 flex-1 text-sm text-slate-600">
                        {status === 'UNCONFIGURED'
                            ? t('admin.webhooks.runtime.unconfigured')
                            : status === 'QUEUED'
                                ? t('admin.webhooks.runtime.queued')
                                : t('admin.webhooks.runtime.unknown')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        leftIcon={<RotateCw size={16} className={reloading ? 'animate-spin' : undefined}/>}
                        onClick={() => {
                            setReloading(true);
                            setError(null);
                            void refresh().finally(() => setReloading(false));
                        }}
                    >
                        {t('admin.webhooks.refresh')}
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        isLoading={isDispatching}
                        loadingText={t('admin.webhooks.recording')}
                        disabled={loading || status !== 'QUEUED'}
                        leftIcon={<Send size={16}/>}
                        onClick={() => void handleTestDispatch()}
                    >
                        {t('admin.webhooks.testEvent')}
                    </Button>
                </div>
            </Card>

            {error && <Alert variant="error" role="alert">{t(error)}</Alert>}
            {message && <Alert variant="info" role="status">{message}</Alert>}

            {loading ? (
                <div className="py-6">
                    <Spinner label={t('admin.webhooks.loading')}/>
                </div>
            ) : (
                <>
                    <WebhookSubscriptions items={webhooks} onChanged={() => void refresh()}/>
                    <Card>
                        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 px-5 py-4">
                            <CardTitle className="m-0 text-base font-semibold">
                                {t('admin.webhooks.deliveryLog', {count: logs.length})}
                            </CardTitle>
                            <Badge variant="outline" size="sm" className="tabular-nums">
                                {logs.length}
                            </Badge>
                        </CardHeader>
                        {retryDelivery.error && <div className="px-5 pt-3"><ErrorNotice error={retryDelivery.error}/></div>}
                        {logs.length === 0 ? (
                            <p className="p-5 text-sm text-slate-500">{t('admin.webhooks.noDeliveries')}</p>
                        ) : (
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
                                    <tbody className="divide-y divide-border">
                                    {logs.map(log => (
                                        <tr key={log.id} className="transition-colors hover:bg-background">
                                            <td className="px-4 py-3.5 align-middle text-foreground">{log.subscriptionName}</td>
                                            <td className="px-4 py-3.5 align-middle text-foreground">
                                                {log.eventType}
                                                <div className="text-xs text-slate-500">{log.eventId ?? t('admin.webhooks.legacyEvent')}</div>
                                            </td>
                                            <td className="px-4 py-3.5 align-middle">
                                                <StatusBadge
                                                    status={log.deliveryStatus === 'DELIVERED' ? 'COMPLETED' : log.deliveryStatus === 'RETRYING' ? 'PENDING' : log.deliveryStatus}
                                                    label={statusLabel(log.deliveryStatus, t)}
                                                />
                                            </td>
                                            <td className="px-4 py-3.5 align-middle tabular-nums text-foreground">{log.responseStatusCode ?? t('admin.webhooks.noResponse')}</td>
                                            <td className="px-4 py-3.5 align-middle tabular-nums text-foreground">{log.retryCount}</td>
                                            <td className="px-4 py-3.5 align-middle tabular-nums text-foreground">{formatDate(log.attemptedAt)}</td>
                                            <td className="px-4 py-3.5 text-right align-middle">
                                                {log.deliveryStatus === 'FAILED' && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={retryDelivery.isPending}
                                                        leftIcon={<RotateCw size={13} aria-hidden="true"/>}
                                                        className="ml-auto h-8 px-2.5 text-xs font-semibold"
                                                        onClick={() => void (async () => {
                                                            if (await confirmDialog(t('adminCommerce.webhooks.retryConfirm', {event: log.eventType, name: log.subscriptionName}))) {
                                                                retryDelivery.mutate(log.id);
                                                            }
                                                        })()}
                                                    >
                                                        {t('adminCommerce.webhooks.retry')}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}

export default function WebhooksPage() {
    return (
        <AdminPage title="admin.pages.webhooks.title" permission="USER_MANAGE" activeResource="webhooks">
            <WebhooksContent/>
        </AdminPage>
    );
}
