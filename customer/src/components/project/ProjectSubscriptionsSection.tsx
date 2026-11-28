'use client';

import {useState} from 'react';
import Link from 'next/link';
import {CalendarClock, Pause, Play, Plus, Trash2} from 'lucide-react';
import {Alert, Button, StatusBadge} from '@/components/ui';
import {extractActionableError, formatVndCompact} from '@/forms/marketplace-forms';
import {PROJECT_SCHEDULE_TYPES} from '@/forms/project-form';
import {useProjectActions, useProjectSubscriptions} from '@/hooks/useCustomerProjects';
import {ApiError} from '@/lib/api';
import {useI18n} from '@/providers/I18nContext';
import type {ProjectScheduleType, ProjectSubscription} from '@/types/project.types';

export function ProjectSubscriptionsSection({projectId}: { projectId: number }) {
    const {t, formatDate} = useI18n();
    const subsQuery = useProjectSubscriptions(projectId, 0, 20);
    const actions = useProjectActions();
    const [reschedulingId, setReschedulingId] = useState<number | null>(null);
    const [nextSchedule, setNextSchedule] = useState<ProjectScheduleType>('WEEKLY');
    const [nextDate, setNextDate] = useState<string>('');
    const [actionError, setActionError] = useState<string | null>(null);

    const items = subsQuery.data?.content ?? [];
    const busy = actions.updateSubscription.isPending || actions.cancelSubscription.isPending;

    const scheduleLabel = (kind: ProjectScheduleType) => {
        if (kind === 'WEEKLY') return t('marketplaceShop.scheduleWeekly');
        if (kind === 'MONTHLY') return t('marketplaceShop.scheduleMonthly');
        return t('marketplaceShop.scheduleOnce');
    };

    const statusLabel = (status: ProjectSubscription['status']) => {
        if (status === 'PAUSED') return t('marketplaceShop.statusPaused');
        if (status === 'ENDED') return t('marketplaceShop.statusEnded');
        return t('marketplaceShop.statusActive');
    };

    const runAction = async (fn: () => Promise<unknown>) => {
        setActionError(null);
        try {
            await fn();
            setReschedulingId(null);
        } catch (err) {
            setActionError(
                err instanceof ApiError && err.status === 404
                    ? t('marketplaceShop.bookingApiUnavailable')
                    : extractActionableError(err, t('missionDetail.actionFailed')),
            );
        }
    };

    return (
        <section className="space-y-3 rounded-panel border border-slate-200 bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 whitespace-nowrap text-sm font-bold text-slate-900">
                    {t('marketplaceShop.subscriptionsTitle')} ({items.length})
                </h3>
                <Link
                    href={`/customer/services?projectId=${projectId}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-control bg-primary px-3 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                    <Plus size={14} aria-hidden="true"/>
                    <span>{t('marketplaceShop.addServiceToProject')}</span>
                </Link>
            </div>

            {actionError && (
                <Alert variant="error" role="alert" className="text-xs">
                    {actionError}
                </Alert>
            )}

            {subsQuery.isLoading ? (
                <div role="status" aria-busy="true" className="space-y-2.5">
                    {[0, 1].map(idx => (
                        <div key={idx} className="h-20 animate-pulse rounded-panel bg-slate-100"/>
                    ))}
                </div>
            ) : subsQuery.isError ? (
                <Alert variant="error" role="alert" className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                        {subsQuery.error instanceof ApiError && subsQuery.error.status === 404
                            ? t('marketplaceShop.bookingApiUnavailable')
                            : t('errorPage.detail')}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void subsQuery.refetch()}>
                        {t('common.retry')}
                    </Button>
                </Alert>
            ) : items.length === 0 ? (
                <p className="m-0 py-4 text-center text-xs text-slate-500">
                    {t('marketplaceShop.emptySubscriptions')}
                </p>
            ) : (
                <div className="grid gap-2.5">
                    {items.map(sub => {
                        const isRescheduling = reschedulingId === sub.id;
                        return (
                            <article key={sub.id} className="space-y-2.5 rounded-panel border border-slate-200 bg-slate-50/60 p-3.5">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0 space-y-1">
                                        <strong className="block line-clamp-2 text-sm font-semibold text-slate-900">
                                            {sub.listingTitle || `#${sub.listingId}`}
                                        </strong>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                                            <span className="rounded-badge bg-white px-2 py-0.5 font-semibold whitespace-nowrap text-slate-700 ring-1 ring-slate-200">
                                                {scheduleLabel(sub.scheduleType)}
                                            </span>
                                            <span className="whitespace-nowrap">
                                                {sub.startDate ? formatDate(sub.startDate, {dateStyle: 'short'}) : '—'}
                                            </span>
                                            {sub.estimatedTotalVnd != null && (
                                                <span className="font-bold whitespace-nowrap text-primary">
                                                    {formatVndCompact(sub.estimatedTotalVnd)} · {t('marketplaceShop.illustrative')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <StatusBadge status={sub.status} label={statusLabel(sub.status)}/>
                                </div>

                                {sub.status !== 'ENDED' && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() =>
                                                void runAction(() =>
                                                    actions.updateSubscription.mutateAsync({
                                                        projectId,
                                                        subId: sub.id,
                                                        payload: {status: sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'},
                                                    }),
                                                )
                                            }
                                            leftIcon={sub.status === 'ACTIVE' ? <Pause size={13}/> : <Play size={13}/>}
                                            className="whitespace-nowrap"
                                        >
                                            {sub.status === 'ACTIVE'
                                                ? t('marketplaceShop.pauseAction')
                                                : t('marketplaceShop.resumeAction')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => {
                                                setReschedulingId(isRescheduling ? null : sub.id);
                                                setNextSchedule(sub.scheduleType);
                                                setNextDate(sub.startDate?.slice(0, 10) || '');
                                            }}
                                            leftIcon={<CalendarClock size={13}/>}
                                            className="whitespace-nowrap"
                                        >
                                            {t('marketplaceShop.rescheduleAction')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() =>
                                                void runAction(() =>
                                                    actions.cancelSubscription.mutateAsync({projectId, subId: sub.id}),
                                                )
                                            }
                                            leftIcon={<Trash2 size={13}/>}
                                            className="whitespace-nowrap"
                                        >
                                            {t('marketplaceShop.cancelSubAction')}
                                        </Button>
                                    </div>
                                )}

                                {isRescheduling && (
                                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2.5">
                                        <select
                                            value={nextSchedule}
                                            aria-label={t('marketplaceShop.scheduleType')}
                                            onChange={e => setNextSchedule(e.target.value as ProjectScheduleType)}
                                            className="h-9 rounded-control border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800"
                                        >
                                            {PROJECT_SCHEDULE_TYPES.map(k => (
                                                <option key={k} value={k}>
                                                    {scheduleLabel(k)}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="date"
                                            value={nextDate}
                                            aria-label={t('marketplaceShop.startDate')}
                                            onChange={e => setNextDate(e.target.value)}
                                            className="h-9 rounded-control border border-slate-300 bg-white px-2.5 text-xs text-slate-800 tabular-nums"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() =>
                                                void runAction(() =>
                                                    actions.updateSubscription.mutateAsync({
                                                        projectId,
                                                        subId: sub.id,
                                                        payload: {
                                                            scheduleType: nextSchedule,
                                                            ...(nextDate ? {startDate: nextDate} : {}),
                                                        },
                                                    }),
                                                )
                                            }
                                            className="whitespace-nowrap"
                                        >
                                            {t('common.save')}
                                        </Button>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
