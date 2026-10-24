'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useQuery} from '@tanstack/react-query';
import {AlertTriangle, CalendarClock, ChevronRight} from 'lucide-react';
import {Panel, Status} from '@/components/customer/ui';
import {displayLabel, planName} from '@/components/shared/presentation';
import {useI18n} from '@/contexts/I18nContext';
import {useCustomerScope} from '@/lib/query/customer';
import {dashboardService} from '@/features/dashboard/services/dashboard.service';
import type {CustomerAnalytics as Analytics} from '@/features/dashboard/types/dashboard.types';
import {BarList, ColumnChart, Delta, Legend, SegmentBar, seriesColors} from '@/features/dashboard/components/AdminCharts';

const MissionMap = dynamic(() => import('@/features/dashboard/components/MissionMap').then(m => m.MissionMap), {ssr: false});

const pipelineColors = {waiting: seriesColors.yellow, scheduled: seriesColors.violet, active: seriesColors.aqua, draft: seriesColors.gray} as const;
const mapColor = (status: string) => status === 'COMPLETED' ? seriesColors.blue
    : ['FAILED', 'CANCELLED', 'REJECTED'].includes(status) ? seriesColors.red
        : status === 'DRAFT' ? seriesColors.gray : seriesColors.aqua;

export function CustomerAnalytics() {
    const {key, can, permissionsReady} = useCustomerScope();
    const {t} = useI18n();
    const query = useQuery({
        queryKey: [...key, 'analytics'],
        queryFn: ({signal}) => dashboardService.getCustomerAnalytics(signal),
        enabled: permissionsReady && can('MISSION_VIEW'),
        staleTime: 60_000,
    });
    if (!can('MISSION_VIEW')) return null;
    return <section className="flex flex-col gap-4" aria-labelledby="customer-analytics-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="customer-analytics-title" className="text-[17px] font-bold text-foreground">{t('dashboard.analytics.title')}</h2></div>
        {query.isPending ? <p className="m-0 px-5 py-3 text-[13px] text-muted" role="status">{t('dashboard.analytics.loading')}</p> :
            query.isError ? <div role="alert" className="rounded-none bg-danger/10 px-3.5 py-3 text-[13px] text-danger">{t('dashboard.analytics.loadError')}</div> :
                <Body data={query.data}/>}
    </section>;
}

function Body({data}: { data: Analytics }) {
    const {t, formatCurrency, formatNumber, formatDate} = useI18n();
    const compact = (value: number) => formatNumber(value, {notation: 'compact', maximumFractionDigits: 1});
    const month = (iso: string) => `${Number(iso.slice(5))}/${iso.slice(2, 4)}`;
    const vs = t('dashboard.analytics.vsLastMonth');
    const hasMissions = data.missionsByMonth.some(m => m.completed + m.stopped > 0) || Object.values(data.pipeline).some(Boolean);
    const hasSpend = data.spendByMonth.some(m => m.paid + m.outstanding > 0);
    const finished = data.outcomes.completed + data.outcomes.failed + data.outcomes.cancelled + data.outcomes.rejected;
    const duration = (hours: number | null) => hours == null ? '—' : hours >= 48
        ? t('dashboard.analytics.days', {value: formatNumber(Math.round(hours / 24 * 10) / 10)})
        : t('dashboard.analytics.hours', {value: formatNumber(hours)});

    return <div className="space-y-5">
        {data.pendingInvoices.count > 0 && <div className="flex items-center gap-2.5 rounded-none border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13.5px] text-amber-800" role="status">
            <AlertTriangle size={17} aria-hidden="true"/>
            <span className="flex-1">{t('dashboard.analytics.pendingInvoices', {count: data.pendingInvoices.count, amount: formatCurrency(data.pendingInvoices.amount)})}
                {data.pendingInvoices.nextDue && ` · ${t('dashboard.analytics.nextDue', {date: formatDate(data.pendingInvoices.nextDue, {dateStyle: 'short'})})}`}</span>
            <Link href="/customer/billing" className="inline-flex items-center gap-0.5 whitespace-nowrap text-[12.5px] font-semibold hover:underline">{t('dashboard.analytics.payNow')}<ChevronRight size={14} aria-hidden="true"/></Link>
        </div>}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] border-l border-slate-200 bg-white">
            <article className="flex flex-col gap-1 border-b border-r border-t-2 border-slate-200 border-t-uav-blue bg-white px-[18px] py-4"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.kpi.completed')}</span>
                <strong className="text-[22px] font-bold leading-tight tabular-nums text-foreground">{data.thisMonth.completedMissions}</strong>
                <Delta current={data.thisMonth.completedMissions} previous={data.lastMonth.completedMissions} label={vs}/></article>
            <article className="flex flex-col gap-1 border-b border-r border-t-2 border-slate-200 border-t-uav-blue bg-white px-[18px] py-4"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.kpi.flightHours')}</span>
                <strong className="text-[22px] font-bold leading-tight tabular-nums text-foreground">{t('dashboard.analytics.hours', {value: formatNumber(data.thisMonth.flightHours)})}</strong>
                <Delta current={data.thisMonth.flightHours} previous={data.lastMonth.flightHours} label={vs}/></article>
            <article className="flex flex-col gap-1 border-b border-r border-t-2 border-slate-200 border-t-uav-blue bg-white px-[18px] py-4"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.kpi.spend')}</span>
                <strong className="text-[22px] font-bold leading-tight tabular-nums text-foreground">{formatCurrency(data.thisMonth.spend)}</strong>
                <Delta current={data.thisMonth.spend} previous={data.lastMonth.spend} higherIsBetter={false} label={vs}/></article>
            <article className="flex flex-col gap-1 border-b border-r border-t-2 border-slate-200 border-t-uav-blue bg-white px-[18px] py-4"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.kpi.successRate')}</span>
                <strong className="text-[22px] font-bold leading-tight tabular-nums text-foreground">{finished ? `${formatNumber(data.outcomes.successRate)}%` : '—'}</strong>
                <small className="inline-flex items-center gap-[3px] text-xs font-normal text-muted">{t('dashboard.analytics.finishedCount', {count: finished})}</small></article>
            <article className="flex flex-col gap-1 border-b border-r border-t-2 border-slate-200 border-t-uav-blue bg-white px-[18px] py-4"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.kpi.media')}</span>
                <strong className="text-[22px] font-bold leading-tight tabular-nums text-foreground">{data.mediaFiles}</strong>
                <small className="inline-flex items-center gap-[3px] text-xs font-normal text-muted">{t('dashboard.analytics.mediaHint')}</small></article>
        </div>

        <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-full">
            <Panel title={t('dashboard.analytics.monthlyTitle')} className="h-full"
                   action={<Legend items={[{label: t('dashboard.analytics.completed'), color: seriesColors.blue},
                       {label: t('dashboard.analytics.stopped'), color: seriesColors.orange}]}/>}>
                {hasMissions ? <ColumnChart ariaLabel={t('dashboard.analytics.monthlyTitle')}
                                            series={[{label: t('dashboard.analytics.completed'), color: seriesColors.blue},
                                                {label: t('dashboard.analytics.stopped'), color: seriesColors.orange}]}
                                            groups={data.missionsByMonth.map(m => ({label: month(m.month), values: [m.completed, m.stopped]}))}/> :
                    <EmptyHint/>}
            </Panel>

            <Panel title={t('dashboard.analytics.quotaTitle')} className="h-full"
                   action={<Link href="/customer/billing" className="font-bold text-primary hover:underline">{t('dashboard.analytics.managePlan')}</Link>}>
                {data.quota ? <Quota quota={data.quota}/> : <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noQuota')}</p>}
            </Panel>

            <Panel title={t('dashboard.analytics.pipelineTitle')} className="h-full"
                   action={<Link href="/customer/missions" className="font-bold text-primary hover:underline">{t('dashboard.analytics.viewMissions')}</Link>}>
                <SegmentBar ariaLabel={t('dashboard.analytics.pipelineTitle')}
                            items={(Object.keys(pipelineColors) as (keyof typeof pipelineColors)[]).map(k => ({
                                label: t(`dashboard.analytics.pipeline.${k}`), value: data.pipeline[k] ?? 0, color: pipelineColors[k]
                            }))}/>
            </Panel>

            <Panel title={t('dashboard.analytics.upcomingTitle')} className="h-full">
                {data.upcoming.length ? <ul className="m-0 list-none p-0">{data.upcoming.map(m => <li key={m.id} className="grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2.5 border-b border-dashed border-border py-2 text-[13px] last:border-b-0 sm:grid-cols-[18px_minmax(0,1fr)_auto_auto]">
                    <CalendarClock size={16} aria-hidden="true" className="text-primary"/>
                    <div className="min-w-0">
                        <Link href={`/customer/missions/${m.id}`} className="font-semibold text-foreground hover:text-primary">{m.code}</Link>
                        <small className="block truncate text-muted">{m.title}{m.location ? ` · ${m.location}` : ''}</small>
                    </div>
                    <time dateTime={m.startTime} className="col-start-2 whitespace-nowrap text-xs text-muted sm:col-auto">{formatDate(m.startTime, {dateStyle: 'short', timeStyle: 'short'})}</time>
                    <Status value={m.status}/>
                </li>)}</ul> : <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noUpcoming')}</p>}
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

            <Panel title={t('dashboard.analytics.servicesTitle')} className="h-full">
                {data.topServices.length ?
                    <BarList items={data.topServices.map(s => ({label: s.name, value: s.count}))}/> :
                    <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noServices')}</p>}
            </Panel>

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

            <Panel title={t('dashboard.analytics.turnaroundTitle')} className="h-full">
                {data.turnaround.sampleSize ? <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 rounded-none bg-slate-50 px-3.5 py-3"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.toConfirm')}</span><strong className="text-xl font-bold text-foreground">{duration(data.turnaround.submitToConfirm)}</strong></div>
                    <div className="flex flex-col gap-1 rounded-none bg-slate-50 px-3.5 py-3"><span className="text-[12.5px] text-muted">{t('dashboard.analytics.toComplete')}</span><strong className="text-xl font-bold text-foreground">{duration(data.turnaround.submitToComplete)}</strong></div>
                    <small className="col-span-full text-xs text-muted">{t('dashboard.analytics.turnaroundHint', {count: data.turnaround.sampleSize})}</small>
                </div> : <p className="m-0 text-[13px] text-muted">{t('dashboard.analytics.noTurnaround')}</p>}
            </Panel>

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
        <span className="flex h-2.5 gap-0.5 overflow-hidden rounded-none bg-slate-100"><span className="rounded-none" style={{width: `${ratio * 100}%`, background: tone}}/></span>
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
        <Link href="/customer/missions/create" className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-card px-4 text-[13px] font-bold text-foreground transition hover:bg-background">{t('dashboard.bookService')}</Link>
    </div>;
}
