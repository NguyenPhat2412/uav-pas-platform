'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useMemo, useState} from 'react';
import {displayLabel} from '@/components/shared/presentation';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {BarList, ColumnChart, Delta, Legend, SegmentBar, seriesColors, TrendChart} from '@/features/dashboard/components/AdminCharts';
import {useAdminAnalytics} from '@/lib/query/admin';
import type {AdminAnalytics as Analytics} from '@/types/admin';
import {cn} from '@/lib/utils';

const MissionMap = dynamic(() => import('@/features/dashboard/components/MissionMap').then(m => m.MissionMap), {ssr: false});

const ranges = [7, 30, 90] as const;

// Ten mission states collapse to six groups so the part-to-whole bar stays readable.
const statusGroups = [
    {key: 'waiting', color: seriesColors.yellow, states: ['PENDING_CONFIRMATION']},
    {key: 'scheduled', color: seriesColors.violet, states: ['CONFIRMED', 'RESOURCE_RESERVED', 'READY']},
    {key: 'active', color: seriesColors.aqua, states: ['IN_PROGRESS']},
    {key: 'completed', color: seriesColors.blue, states: ['COMPLETED']},
    {key: 'stopped', color: seriesColors.red, states: ['CANCELLED', 'REJECTED', 'FAILED']},
    {key: 'draft', color: seriesColors.gray, states: ['DRAFT']},
] as const;

const fleetColors: Record<string, string> = {
    AVAILABLE: 'var(--success)', ASSIGNED: seriesColors.violet, IN_USE: seriesColors.blue, MAINTENANCE: 'var(--warning)', INACTIVE: seriesColors.gray,
};

function groupOf(status: string) {
    return statusGroups.find(group => (group.states as readonly string[]).includes(status)) ?? statusGroups[5];
}

export function AdminAnalytics() {
    const {can} = useAuth();
    const {t, locale} = useI18n();
    const [days, setDays] = useState<number>(30);
    const query = useAdminAnalytics(days);
    const numberLocale = locale === 'vi' ? 'vi-VN' : locale === 'ja' ? 'ja-JP' : 'en-US';
    const money = useMemo(() => new Intl.NumberFormat(numberLocale, {notation: 'compact', maximumFractionDigits: 1}), [numberLocale]);
    if (!can('DASHBOARD_READ')) return null;

    return <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="inline-flex rounded-[9px] border border-border bg-card p-[3px]" role="group" aria-label={t('admin.analytics.range')}>{ranges.map(range =>
                <button key={range} type="button" aria-pressed={days === range}
                        className={cn('cursor-pointer rounded-md border-0 px-3 py-[5px] text-[12.5px] font-medium text-muted transition-colors', days === range ? 'bg-uav-red-light font-semibold text-primary' : 'bg-transparent hover:text-foreground')}
                        onClick={() => setDays(range)}>{t('admin.analytics.days', {count: range})}</button>)}</div>
        </div>
        <QueryState query={query}>{query.data && <AnalyticsBody data={query.data} money={money} />}</QueryState>
    </section>;
}

function AnalyticsBody({data, money}: { data: Analytics; money: Intl.NumberFormat }) {
    const {t} = useI18n();
    const {can} = useAuth();
    const vs = t('admin.analytics.vsPrevious');
    const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
    const status = statusGroups.map(group => ({
        label: t(`admin.analytics.status.${group.key}`),
        color: group.color,
        value: group.states.reduce((sum, state) => sum + (data.statusBreakdown[state] ?? 0), 0),
    }));
    const fleetTotal = Object.values(data.fleet).reduce((a, b) => a + b, 0);
    const missionsVisible = can('MISSION_VIEW_ALL');
    const billingVisible = can('PERMISSION_MANAGE');
    const kpis = [
        {key: 'completed', value: String(data.current.completedMissions), delta: <Delta current={data.current.completedMissions} previous={data.previous.completedMissions} label={vs}/>, show: missionsVisible},
        {key: 'successRate', value: `${data.current.successRate}%`, delta: <Delta current={data.current.successRate} previous={data.previous.successRate} suffix={t('admin.analytics.points')} label={vs}/>, show: missionsVisible},
        {key: 'flightHours', value: t('admin.analytics.hours', {value: data.current.flightHours}), delta: <Delta current={data.current.flightHours} previous={data.previous.flightHours} label={vs}/>, show: missionsVisible},
        {key: 'revenue', value: `${money.format(data.current.revenue)} đ`, delta: <Delta current={data.current.revenue} previous={data.previous.revenue} label={vs}/>, show: billingVisible},
        {key: 'newUsers', value: String(data.current.newUsers), delta: <Delta current={data.current.newUsers} previous={data.previous.newUsers} label={vs}/>, show: can('USER_READ')},
    ].filter(k => k.show);

    return <>
        {kpis.length > 0 && <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">{kpis.map(kpi => <article key={kpi.key} className="flex flex-col gap-1 rounded-xl border border-border bg-card px-[18px] py-4">
            <span className="text-[12.5px] text-muted">{t(`admin.analytics.kpi.${kpi.key}`)}</span>
            <strong className="text-2xl font-bold leading-tight tabular-nums text-foreground">{kpi.value}</strong>
            {kpi.delta}
        </article>)}</div>}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
            {missionsVisible && <section className="col-span-full min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.dailyTitle')}</h2>
                    <Legend items={[{label: t('admin.analytics.completed'), color: seriesColors.blue},
                        {label: t('admin.analytics.failed'), color: seriesColors.red, dashed: true}]}/></header>
                <div className="p-6">
                    <TrendChart labels={data.daily.map(d => shortDate(d.date))}
                                ariaLabel={t('admin.analytics.dailyAria', {from: shortDate(data.from), to: shortDate(data.to)})}
                                series={[
                                    {key: 'completed', label: t('admin.analytics.completed'), color: seriesColors.blue, values: data.daily.map(d => d.completed)},
                                    {key: 'failed', label: t('admin.analytics.failed'), color: seriesColors.red, dashed: true, values: data.daily.map(d => d.failed)},
                                ]}/>
                </div>
            </section>}
            {missionsVisible && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.statusTitle')}</h2></header>
                <div className="p-6"><SegmentBar items={status} ariaLabel={t('admin.analytics.statusTitle')}/></div>
            </section>}
            {missionsVisible && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.stationTitle')}</h2></header>
                <div className="p-6">{data.flightHoursByStation.length ?
                    <BarList items={data.flightHoursByStation.map(s => ({label: s.name, value: s.value}))}
                             format={v => t('admin.analytics.hours', {value: v})}/> :
                    <p className="m-0 text-[13px] text-muted">{t('admin.analytics.noFlights')}</p>}</div>
            </section>}
            {fleetTotal > 0 && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.fleetTitle')}</h2>
                    <span className="text-xs text-slate-500">{t('admin.analytics.fleetTotal', {count: fleetTotal})}</span></header>
                <ul className="m-0 flex list-none flex-col gap-3 px-[18px] pb-4 pt-2.5">{Object.entries(data.fleet).map(([state, count]) => <li key={state}>
                    <div className="mb-[5px] flex justify-between gap-2 text-[13px]"><span className="truncate text-muted">{displayLabel(state)}</span><strong>{count}/{fleetTotal}</strong></div>
                    <span className="flex h-[7px] gap-0.5 overflow-hidden rounded bg-slate-100"><span className="rounded" style={{width: `${count / fleetTotal * 100}%`, background: fleetColors[state] ?? seriesColors.gray}}/></span>
                </li>)}</ul>
            </section>}
            {billingVisible && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.revenueTitle')}</h2>
                    <Legend items={[{label: t('admin.analytics.paid'), color: seriesColors.blue},
                        {label: t('admin.analytics.outstanding'), color: seriesColors.orange}]}/></header>
                <div className="p-6">
                    <ColumnChart ariaLabel={t('admin.analytics.revenueTitle')} format={v => `${money.format(v)} đ`}
                                 series={[{label: t('admin.analytics.paid'), color: seriesColors.blue}, {label: t('admin.analytics.outstanding'), color: seriesColors.orange}]}
                                 groups={data.revenueByMonth.map(m => ({label: `${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`, values: [m.paid, m.outstanding]}))}/>
                </div>
            </section>}
            {billingVisible && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.quotaTitle')}</h2>
                    <Link href="/admin/billing" className="text-[13px] font-semibold text-primary hover:underline">{t('admin.analytics.manage')}</Link></header>
                {data.quotaWarnings.length ? <ul className="m-0 flex list-none flex-col gap-3 px-[18px] pb-4 pt-2.5">{data.quotaWarnings.map(q => {
                    const ratio = Math.min(1, q.used / q.limit);
                    return <li key={q.username}>
                        <div className="mb-[5px] flex justify-between gap-2 text-[13px]"><span className="truncate text-muted">{q.username}</span><strong>{t('admin.analytics.quotaUsage', {used: q.used, limit: q.limit})}</strong></div>
                        <span className="flex h-[7px] gap-0.5 overflow-hidden rounded bg-slate-100"><span className="rounded" style={{width: `${ratio * 100}%`, background: ratio >= 1 ? 'var(--danger)' : 'var(--warning)'}}/></span>
                    </li>;
                })}</ul> : <p className="m-0 p-6 text-[13px] text-muted">{t('admin.analytics.quotaEmpty')}</p>}
            </section>}
            {missionsVisible && <section className="col-span-full min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.mapTitle')}</h2>
                    <Legend items={statusGroups.slice(0, 5).map(g => ({label: t(`admin.analytics.status.${g.key}`), color: g.color}))}/></header>
                {data.missionLocations.length ? <MissionMap ariaLabel={t('admin.analytics.mapAria', {count: data.missionLocations.length})}
                                                            points={data.missionLocations.map(p => ({...p, color: groupOf(p.status).color, label: displayLabel(p.status)}))}/> :
                    <p className="m-0 p-6 text-[13px] text-muted">{t('admin.analytics.mapEmpty')}</p>}
            </section>}
            {can('USER_MANAGE') && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.analytics.webhookTitle')}</h2>
                    <Link href="/admin/webhooks" className="text-[13px] font-semibold text-primary hover:underline">{t('admin.analytics.manage')}</Link></header>
                {data.webhooks.length ? <ul className="m-0 flex list-none flex-col gap-3 px-[18px] pb-4 pt-2.5">{data.webhooks.map(w => {
                    const total = w.success + w.failed;
                    return <li key={w.name}>
                        <div className="mb-[5px] flex justify-between gap-2 text-[13px]"><span className="truncate text-muted">{w.name}</span><strong>{t('admin.analytics.webhookRate', {rate: Math.round(w.success / total * 100), total})}</strong></div>
                        <span className="flex h-[7px] gap-0.5 overflow-hidden rounded bg-slate-100"><span style={{flexGrow: w.success, background: 'var(--success)'}}/><span style={{flexGrow: w.failed, background: 'var(--danger)'}}/></span>
                    </li>;
                })}</ul> : <p className="m-0 p-6 text-[13px] text-muted">{t('admin.analytics.webhookEmpty')}</p>}
            </section>}
        </div>
    </>;
}
