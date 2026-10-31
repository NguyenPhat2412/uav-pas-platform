'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {CalendarClock} from 'lucide-react';
import {Panel, Status} from '@/components/customer/CustomerUi';
import {displayLabel, planName} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import {useCustomerAnalytics} from '@/hooks/dashboard/useCustomerAnalytics';
import {useAuth} from '@/providers/AuthContext';
import type {CustomerAnalytics as Analytics} from '@/types/dashboard/dashboard.types';
import {BarList, ColumnChart, Legend, SegmentBar, seriesColors} from '@/components/dashboard/AdminCharts';

const MissionMap = dynamic(() => import('@/components/dashboard/MissionMap').then(m => m.MissionMap), {ssr: false});

export const pipelineColors = {waiting: seriesColors.yellow, scheduled: seriesColors.violet, active: seriesColors.aqua, draft: seriesColors.gray} as const;
const mapColor = (status: string) => status === 'COMPLETED' ? seriesColors.blue
    : ['FAILED', 'CANCELLED', 'REJECTED'].includes(status) ? seriesColors.red
        : status === 'DRAFT' ? seriesColors.gray : seriesColors.aqua;

/**
 * Compact combined panel for the right-hand operational column:
 * Quota + Active Pipeline + Turnaround SLA.
 */
export function CustomerOperationalInsights({data, isPending}: { data?: Analytics; isPending: boolean }) {
    const {t, formatNumber} = useI18n();
    const duration = (hours: number | null) => hours == null ? '—' : hours >= 48
        ? t('dashboard.analytics.days', {value: formatNumber(Math.round(hours / 24 * 10) / 10)})
        : t('dashboard.analytics.hours', {value: formatNumber(hours)});

    return (
        <div className="flex h-full flex-col divide-y divide-slate-200 bg-white">
            {/* Sub-block 1: Service Plan Quota */}
            <Panel
                title={t('dashboard.analytics.quotaTitle')}
                className="border-0"
                action={<Link href="/customer/billing" className="text-xs font-bold text-primary hover:underline">{t('dashboard.analytics.managePlan')}</Link>}
            >
                {isPending ? (
                    <div className="h-20 animate-pulse bg-slate-100"/>
                ) : data?.quota ? (
                    <Quota quota={data.quota}/>
                ) : (
                    <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noQuota')}</p>
                )}
            </Panel>

            {/* Sub-block 2: Current Mission Pipeline */}
            <Panel
                title={t('dashboard.analytics.pipelineTitle')}
                className="border-0"
                action={<Link href="/customer/missions" className="text-xs font-bold text-primary hover:underline">{t('dashboard.analytics.viewMissions')}</Link>}
            >
                {isPending || !data ? (
                    <div className="h-14 animate-pulse bg-slate-100"/>
                ) : (
                    <SegmentBar
                        ariaLabel={t('dashboard.analytics.pipelineTitle')}
                        items={(Object.keys(pipelineColors) as (keyof typeof pipelineColors)[]).map(k => ({
                            label: t(`dashboard.analytics.pipeline.${k}`),
                            value: data.pipeline[k] ?? 0,
                            color: pipelineColors[k],
                        }))}
                    />
                )}
            </Panel>

            {/* Sub-block 3: Average Turnaround Time */}
            <Panel title={t('dashboard.analytics.turnaroundTitle')} className="flex-1 border-0">
                {isPending || !data ? (
                    <div className="h-16 animate-pulse bg-slate-100"/>
                ) : data.turnaround.sampleSize ? (
                    <div className="overflow-hidden rounded-control bg-slate-50/80">
                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                            <div className="flex flex-col gap-1 px-3.5 py-2.5">
                                <span className="text-[12px] text-muted">{t('dashboard.analytics.toConfirm')}</span>
                                <strong className="text-lg font-extrabold tabular-nums text-foreground">{duration(data.turnaround.submitToConfirm)}</strong>
                            </div>
                            <div className="flex flex-col gap-1 px-3.5 py-2.5">
                                <span className="text-[12px] text-muted">{t('dashboard.analytics.toComplete')}</span>
                                <strong className="text-lg font-extrabold tabular-nums text-foreground">{duration(data.turnaround.submitToComplete)}</strong>
                            </div>
                        </div>
                        <small className="block border-t border-slate-200/80 px-3.5 py-2 text-xs text-muted">
                            {t('dashboard.analytics.turnaroundHint', {count: data.turnaround.sampleSize})}
                        </small>
                    </div>
                ) : (
                    <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noTurnaround')}</p>
                )}
            </Panel>
        </div>
    );
}

/**
 * Compact Upcoming Flights strip placed directly below Recent Missions in the left operational column.
 */
export function CustomerUpcomingStrip({data, isPending}: { data?: Analytics; isPending: boolean }) {
    const {t, formatDate} = useI18n();
    if (isPending || !data) return null;
    return (
        <div className="border-t border-slate-200 bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
                <h3 className="m-0 text-xs font-bold text-slate-800">{t('dashboard.analytics.upcomingTitle')}</h3>
                <span className="text-xs font-semibold tabular-nums text-slate-500">{data.upcoming.length}</span>
            </header>
            {data.upcoming.length ? (
                <ul className="m-0 divide-y divide-slate-200 list-none p-0">
                    {data.upcoming.map(m => (
                        <li key={m.id} className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2.5 px-4 py-2.5 text-[13px] hover:bg-slate-50 sm:grid-cols-[18px_minmax(0,1fr)_auto_auto]">
                            <CalendarClock size={16} aria-hidden="true" className="text-primary"/>
                            <div className="min-w-0">
                                <Link href={`/customer/missions/${m.id}`} className="font-bold text-foreground hover:text-primary">{m.code}</Link>
                                <small className="block truncate text-muted">{m.title}{m.location ? ` · ${m.location}` : ''}</small>
                            </div>
                            <time dateTime={m.startTime} className="col-start-2 whitespace-nowrap tabular-nums text-xs text-muted sm:col-auto">
                                {formatDate(m.startTime, {dateStyle: 'short', timeStyle: 'short'})}
                            </time>
                            <Status value={m.status}/>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="m-0 px-4 py-3 text-[13px] text-muted">{t('dashboard.analytics.noUpcoming')}</p>
            )}
        </div>
    );
}

export function CustomerAnalytics() {
    const {can} = useAuth();
    const {t} = useI18n();
    const query = useCustomerAnalytics();
    if (!can('MISSION_VIEW')) return null;
    return <section className="flex flex-col gap-3 bg-white" aria-labelledby="customer-analytics-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2">
            <h2 id="customer-analytics-title" className="m-0 text-sm font-bold text-slate-800">{t('dashboard.analytics.title')}</h2>
        </div>
        {query.isPending ? (
            <div className="grid min-h-[260px] grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 xl:grid-cols-2" role="status" aria-label={t('dashboard.analytics.loading')}>
                <div className="animate-pulse bg-white p-6"/>
                <div className="animate-pulse bg-white p-6"/>
            </div>
        ) : query.isError ? (
            <div role="alert" className="border-b border-red-200 bg-danger/10 px-4 py-3 text-[13px] text-danger">{t('dashboard.analytics.loadError')}</div>
        ) : (
            <Body data={query.data}/>
        )}
    </section>;
}

function Body({data}: { data: Analytics }) {
    const {t, formatNumber} = useI18n();
    const compact = (value: number) => formatNumber(value, {notation: 'compact', maximumFractionDigits: 1});
    const month = (iso: string) => `${Number(iso.slice(5))}/${iso.slice(2, 4)}`;
    const hasMissions = data.missionsByMonth.some(m => m.completed + m.stopped > 0) || Object.values(data.pipeline).some(Boolean);
    const hasSpend = data.spendByMonth.some(m => m.paid + m.outstanding > 0);
    const finished = data.outcomes.completed + data.outcomes.failed + data.outcomes.cancelled + data.outcomes.rejected;

    return <div className="flex flex-col">
        {/* Pair 1: Monthly Missions & Monthly Spend (matched height column charts) */}
        <div className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 [&>*]:border-0 xl:grid-cols-2">
            <Panel title={t('dashboard.analytics.monthlyTitle')} className="h-full"
                   action={<Legend items={[{label: t('dashboard.analytics.completed'), color: seriesColors.blue},
                       {label: t('dashboard.analytics.stopped'), color: seriesColors.orange}]}/>}>
                {hasMissions ? <ColumnChart ariaLabel={t('dashboard.analytics.monthlyTitle')}
                                            series={[{label: t('dashboard.analytics.completed'), color: seriesColors.blue},
                                                {label: t('dashboard.analytics.stopped'), color: seriesColors.orange}]}
                                            groups={data.missionsByMonth.map(m => ({label: month(m.month), values: [m.completed, m.stopped]}))}/> :
                    <EmptyHint/>}
            </Panel>

            <Panel title={t('dashboard.analytics.spendTitle')} className="h-full"
                   action={<Legend items={[{label: t('dashboard.analytics.paid'), color: seriesColors.blue},
                       {label: t('dashboard.analytics.outstanding'), color: seriesColors.orange}]}/>}>
                {hasSpend ? <ColumnChart ariaLabel={t('dashboard.analytics.spendTitle')} format={v => compact(v)}
                                         series={[{label: t('dashboard.analytics.paid'), color: seriesColors.blue},
                                             {label: t('dashboard.analytics.outstanding'), color: seriesColors.orange}]}
                                         groups={data.spendByMonth.map(m => ({label: month(m.month), values: [m.paid, m.outstanding]}))}/> :
                    <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noSpend')}</p>}
            </Panel>

            {/* Pair 2: Execution Outcomes & Most Used Services */}
            <Panel title={t('dashboard.analytics.outcomesTitle')} className="h-full">
                {finished ? <div className="space-y-4">
                    <SegmentBar ariaLabel={t('dashboard.analytics.outcomesTitle')} items={[
                        {label: t('dashboard.analytics.completed'), value: data.outcomes.completed, color: seriesColors.blue},
                        {label: displayLabel('FAILED'), value: data.outcomes.failed, color: seriesColors.red},
                        {label: displayLabel('CANCELLED'), value: data.outcomes.cancelled, color: seriesColors.orange},
                        {label: displayLabel('REJECTED'), value: data.outcomes.rejected, color: seriesColors.gray},
                    ]}/>
                    {data.outcomes.reasons.length > 0 && <div>
                        <h3 className="mb-2 mt-0 text-[12.5px] font-semibold text-muted">{t('dashboard.analytics.reasonsTitle')}</h3>
                        <BarList color={seriesColors.red} items={data.outcomes.reasons.map(r => ({label: displayLabel(r.reason), value: r.count}))}/>
                    </div>}
                </div> : <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noOutcomes')}</p>}
            </Panel>

            <Panel title={t('dashboard.analytics.servicesTitle')} className="h-full">
                {data.topServices.length ?
                    <BarList items={data.topServices.map(s => ({label: s.name, value: s.count}))}/> :
                    <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noServices')}</p>}
            </Panel>

            {/* Full-width Map */}
            <Panel title={t('dashboard.analytics.mapTitle')} className="col-span-full h-full">
                {data.locations.length ? <MissionMap ariaLabel={t('dashboard.analytics.mapAria', {count: data.locations.length})}
                                                     points={data.locations.map(p => ({...p, color: mapColor(p.status), label: displayLabel(p.status)}))}/> :
                    <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noLocations')}</p>}
            </Panel>
        </div>
    </div>;
}

function Quota({quota}: { quota: NonNullable<Analytics['quota']> }) {
    const {t, formatNumber, formatDate} = useI18n();
    const ratio = quota.limit > 0 ? Math.min(1, quota.used / quota.limit) : 0;
    const tone = ratio >= 1 ? 'var(--danger)' : ratio >= 0.8 ? 'var(--warning)' : seriesColors.blue;
    const runsOutFirst = quota.projectedDaysToLimit != null && quota.projectedDaysToLimit < quota.daysLeftInCycle;
    return <div>
        <div className="mb-1.5 flex justify-between text-[13.5px]"><span>{quota.planName ? planName(quota.planName) : t('dashboard.noPlan')}</span>
            <strong>{Math.round(ratio * 100)}%</strong></div>
        <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100"><span className="rounded-panel" style={{width: `${ratio * 100}%`, background: tone}}/></span>
        <p className="mt-1.5 text-[13px] text-muted">{t('dashboard.analytics.quotaUsed', {used: formatNumber(quota.used), limit: formatNumber(quota.limit)})}</p>
        <p className="mt-1.5 text-[13px] text-muted">{quota.cycleEnd ? t('dashboard.analytics.cycleLeft', {count: quota.daysLeftInCycle, date: formatDate(quota.cycleEnd, {dateStyle: 'short'})}) : null}</p>
        {quota.projectedDaysToLimit === 0 ? <p className="mt-1.5 text-[13px] font-semibold text-amber-700">{t('dashboard.analytics.quotaExhausted')}</p> :
            runsOutFirst ? <p className="mt-1.5 text-[13px] font-semibold text-amber-700">{t('dashboard.analytics.quotaRunsOut', {count: Math.ceil(quota.projectedDaysToLimit!)})}</p> :
                quota.projectedDaysToLimit != null ? <p className="mt-1.5 text-[13px] text-uav-blue">{t('dashboard.analytics.quotaEnough')}</p> : null}
    </div>;
}

function EmptyHint() {
    const {t} = useI18n();
    return <div className="flex flex-col items-start gap-3">
        <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noMissions')}</p>
        <Link href="/customer/missions/create" className="inline-flex min-h-[44px] items-center justify-center rounded-control border border-border bg-card px-4 text-[13px] font-bold text-foreground transition hover:bg-background">{t('dashboard.bookService')}</Link>
    </div>;
}
