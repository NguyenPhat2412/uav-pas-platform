'use client';

import Link from 'next/link';
import {useState, type CSSProperties, type ReactNode} from 'react';
import type {UseQueryResult} from '@tanstack/react-query';
import {ArrowDownRight, ArrowUpRight, ChevronRight} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {planName} from '@/lib/presentation';
import {QueryState} from '@/components/data/WorkspaceState';
import {FilterSelect} from '@/components/shared/FilterSelect';
import {cn} from '@/lib/utils';
import type {PlanStats, PlanStatsMonth, PlanStatsRow} from '@/types/billing/billing.types';
import {axisTicks, clampPercent, earningCodes, MISSION_KEY, percentChange, stackMonths} from '@/utils/billing/plan-stats';

export const PLAN_STATS_PERIODS = ['3', '6', '12'] as const;

/** The accent is reserved for the key series and alerts; plans are drawn in greys. */
const ACCENT = '#c43a4a';
const PLAN_GREYS = ['#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8', '#52525b', '#e4e4e7', '#27272a'];
/** Where an administrator can raise a customer's hours or change their plan. */
const QUOTAS_HREF = '/admin/billing/quotas';

type Color = (code: string) => string;

export function AdminPlanStats({query, months, onMonthsChange}: {
    query: UseQueryResult<PlanStats>;
    months: number;
    onMonthsChange: (months: number) => void;
}) {
    const {t} = useI18n();
    return <section aria-label={t('admin.plans.stats.title')} className="space-y-4">
        <QueryState query={query}>{query.data && <StatsBody data={query.data} months={months} onMonthsChange={onMonthsChange}/>}</QueryState>
    </section>;
}

function StatsBody({data, months, onMonthsChange}: { data: PlanStats; months: number; onMonthsChange: (months: number) => void }) {
    const codes = data.plans.map(p => p.code);
    const color: Color = code => code === MISSION_KEY ? ACCENT : PLAN_GREYS[Math.max(0, codes.indexOf(code)) % PLAN_GREYS.length];
    return <>
        <KpiStrip data={data}/>
        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <RevenueCard className="lg:col-span-2" monthly={data.monthly} plans={data.plans} color={color} months={months} onMonthsChange={onMonthsChange}/>
            <ShareCard plans={data.plans}/>
        </div>
        <NearLimitCard data={data}/>
    </>;
}

function KpiStrip({data}: { data: PlanStats }) {
    const {t, formatCurrency} = useI18n();
    const s = data.summary;
    const change = percentChange(s.revenueThisMonth, s.revenueLastMonth);
    return <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label={t('admin.plans.stats.kpi.customers')} value={s.totalCustomers}
             hint={t('admin.plans.stats.kpi.customersSplit', {paying: s.payingCustomers, free: s.freeCustomers})}/>
        <Kpi label={t('admin.plans.stats.kpi.mrr')} value={formatCurrency(s.mrr)} hint={t('admin.plans.stats.kpi.mrrHint')}/>
        <Kpi label={t('admin.plans.stats.kpi.revenue')} value={formatCurrency(s.revenueThisMonth)}
             hint={<>
                 <ChangeBadge change={change}/>
                 <span className="block">{t('admin.plans.stats.kpi.revenueSplit', {
                     plan: formatCurrency(s.planRevenueThisMonth),
                     mission: formatCurrency(s.missionRevenueThisMonth),
                 })}</span>
             </>}/>
        <Kpi label={t('admin.plans.stats.kpi.pending')} value={s.pendingInvoices.count}
             suffix={formatCurrency(s.pendingInvoices.amount)}/>
        <Kpi label={t('admin.plans.stats.kpi.overdue')} value={s.overdueInvoices.count} alert={s.overdueInvoices.count > 0}
             suffix={formatCurrency(s.overdueInvoices.amount)}/>
        <Kpi label={t('admin.plans.stats.kpi.nearLimit')} value={s.nearLimitCustomers} alert={s.nearLimitCustomers > 0}
             hint={t('admin.plans.stats.kpi.expiring', {count: s.expiringSoon})}/>
    </div>;
}

function Kpi({label, value, suffix, hint, alert = false}: {
    label: string;
    value: ReactNode;
    suffix?: string;
    hint?: ReactNode;
    alert?: boolean;
}) {
    return <div className="min-w-0 bg-card p-4">
        <span className="text-[11px] font-semibold text-slate-500">{label}</span>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className={cn('break-words font-mono text-lg font-bold sm:text-2xl', alert ? 'text-[#c43a4a]' : 'text-slate-900')}>{value}</span>
            {suffix && <span className="font-mono text-xs text-slate-500">· {suffix}</span>}
        </div>
        {hint && <div className="mt-1 text-[11.5px] leading-snug text-slate-500">{hint}</div>}
    </div>;
}

function ChangeBadge({change}: { change: number | null }) {
    const {t, formatNumber} = useI18n();
    if (change === null) return <span className="block">{t('admin.plans.stats.kpi.noBaseline')}</span>;
    const down = change < 0;
    const value = `${change > 0 ? '+' : ''}${formatNumber(change, {maximumFractionDigits: 1})}%`;
    return <span className={cn('inline-flex items-center gap-0.5 font-semibold', down ? 'text-[#c43a4a]' : 'text-slate-700')}>
        {down ? <ArrowDownRight size={13} aria-hidden="true"/> : <ArrowUpRight size={13} aria-hidden="true"/>}
        {t('admin.plans.stats.kpi.change', {value})}
    </span>;
}

function Card({title, hint, action, className, children}: {
    title: string;
    hint?: string;
    action?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return <section className={cn('min-w-0 border border-slate-200 bg-white', className)}>
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
                {hint && <p className="m-0 text-[11.5px] text-slate-500">{hint}</p>}
            </div>
            {action}
        </header>
        {children}
    </section>;
}

function RevenueCard({monthly, plans, color, months, onMonthsChange, className}: {
    monthly: PlanStatsMonth[];
    plans: PlanStatsRow[];
    color: Color;
    months: number;
    onMonthsChange: (months: number) => void;
    className?: string;
}) {
    const {t} = useI18n();
    const codes = earningCodes(monthly, plans.map(p => p.code));
    const hasMission = monthly.some(m => m.missionRevenue > 0);
    const names = new Map(plans.map(p => [p.code, planName(p.name)]));
    const label = (key: string) => key === MISSION_KEY ? t('admin.plans.stats.chart.mission') : names.get(key) ?? key;
    const legend = [...codes, ...(hasMission ? [MISSION_KEY] : [])];
    return <Card className={className} title={t('admin.plans.stats.chart.title')}
                 action={<FilterSelect label={t('admin.plans.stats.chart.period')} value={String(months) as typeof PLAN_STATS_PERIODS[number]}
                                       onChange={next => onMonthsChange(Number(next))}
                                       options={PLAN_STATS_PERIODS.map(value => ({value, label: t('admin.plans.stats.chart.months', {count: value})}))}/>}>
        <div className="p-4">
            {legend.length ? <>
                <ul className="m-0 mb-4 flex list-none flex-wrap gap-x-3.5 gap-y-1.5 p-0 text-xs text-slate-600">{legend.map(key =>
                    <li key={key} className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-2.5 w-2.5 border border-slate-200" style={{background: color(key)}} aria-hidden="true"/>{label(key)}</li>)}</ul>
                <StackedColumns monthly={monthly} codes={codes} color={color} label={label}/>
            </> : <p className="m-0 py-10 text-center text-[13px] text-slate-500">{t('admin.plans.stats.chart.empty', {count: months})}</p>}
        </div>
    </Card>;
}

/** Stacked monthly columns drawn with HTML like the dashboard charts, so labels never stretch. */
function StackedColumns({monthly, codes, color, label}: {
    monthly: PlanStatsMonth[];
    codes: string[];
    color: Color;
    label: (key: string) => string;
}) {
    const {t, formatCurrency, formatNumber, formatDate} = useI18n();
    const [hover, setHover] = useState<number | null>(null);
    const columns = stackMonths(monthly, codes);
    const ticks = axisTicks(Math.max(0, ...columns.map(c => c.total)));
    const top = ticks[ticks.length - 1] || 1;
    const many = columns.length > 6;
    const monthLabel = (ym: string) => formatDate(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1), {month: 'short', year: '2-digit'});
    // Twelve columns leave no room for month names on a phone: use "3/26" and show every other one.
    const axisLabel = (ym: string) => many ? `${Number(ym.slice(5, 7))}/${ym.slice(2, 4)}` : monthLabel(ym);
    const compact = (value: number) => formatNumber(value, {notation: 'compact', maximumFractionDigits: 1});
    const tooltipLeft = (i: number) => Math.min(80, Math.max(20, ((i + 0.5) / columns.length) * 100));
    return <div className="select-none" role="img" aria-label={t('admin.plans.stats.chart.label')}>
        <div className="flex items-stretch gap-2">
            <div className="flex h-[200px] w-11 shrink-0 flex-col-reverse justify-between text-right text-[10.5px] tabular-nums text-slate-400" aria-hidden="true">
                {ticks.map(v => <span key={v} className="leading-none">{compact(v)}</span>)}
            </div>
            <div className="relative h-[200px] min-w-0 flex-1" onMouseLeave={() => setHover(null)}>
                <div className="pointer-events-none absolute inset-0 flex flex-col-reverse justify-between" aria-hidden="true">
                    {ticks.map((v, i) => <div key={v} className={cn('w-full border-b', i === 0 ? 'border-slate-300' : 'border-dashed border-slate-100')}/>)}
                </div>
                <div className={cn('relative z-10 flex h-full items-end', many ? 'gap-1' : 'gap-2 sm:gap-4')}>
                    {columns.map((column, i) => <div key={column.month} tabIndex={0}
                                                     aria-label={`${monthLabel(column.month)}: ${formatCurrency(column.total)}`}
                                                     onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                                                     className={cn('relative flex h-full min-w-0 flex-1 justify-center outline-none focus-visible:ring-2 focus-visible:ring-slate-400', hover === i && 'bg-slate-50')}>
                        <div className="relative h-full w-full max-w-[36px]">
                            {column.total > 0 ? column.segments.map(seg => <span key={seg.key} className="absolute inset-x-0 border-t border-white/70"
                                                                                  style={{bottom: `${(seg.offset / top) * 100}%`, height: `${(seg.value / top) * 100}%`, background: color(seg.key)}}/>)
                                : <span className="absolute inset-x-0 bottom-0 h-[2px] bg-slate-200"/>}
                        </div>
                    </div>)}
                </div>
                {/* Full plot width on phones so it never pushes the page sideways; centred on the column from sm up. */}
                {hover !== null && columns[hover] && <div role="tooltip" style={{'--tip-left': `${tooltipLeft(hover)}%`} as CSSProperties}
                                                          className="pointer-events-none absolute inset-x-0 top-1 z-20 grid gap-1 border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-lg sm:right-auto sm:left-[var(--tip-left)] sm:min-w-[190px] sm:-translate-x-1/2">
                    <span className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1">
                        <strong className="text-slate-900">{monthLabel(columns[hover].month)}</strong>
                        <strong className="tabular-nums text-slate-900">{formatCurrency(columns[hover].total)}</strong>
                    </span>
                    {[...columns[hover].segments].reverse().map(seg => <span key={seg.key} className="flex items-center justify-between gap-3">
                        <span className="inline-flex min-w-0 items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 shrink-0 border border-slate-200" style={{background: color(seg.key)}}/>
                            <span className="truncate">{label(seg.key)}</span></span>
                        <span className="tabular-nums text-slate-900">{formatCurrency(seg.value)}</span>
                    </span>)}
                    <span className="text-slate-500">{t('admin.plans.stats.chart.newSubscriptions', {count: monthly[hover]?.newSubscriptions ?? 0})}</span>
                </div>}
            </div>
        </div>
        <div className={cn('mt-2 flex pl-[52px]', many ? 'gap-1' : 'gap-2 sm:gap-4')} aria-hidden="true">
            {columns.map((column, i) => <span key={column.month}
                                              className={cn('min-w-0 flex-1 text-center text-[10.5px] tabular-nums', many ? 'whitespace-nowrap' : 'truncate',
                                                  hover === i ? 'font-semibold text-slate-900' : 'text-slate-500',
                                                  many && i % 2 === 1 && 'max-sm:invisible')}>{axisLabel(column.month)}</span>)}
        </div>
    </div>;
}

function ShareCard({plans}: { plans: PlanStatsRow[] }) {
    const {t, formatNumber} = useI18n();
    const rows = plans.filter(p => p.subscribers > 0).sort((a, b) => b.subscribers - a.subscribers);
    return <Card title={t('admin.plans.stats.share.title')}>
        <div className="p-4">{rows.length ? <>
            <ul className="m-0 grid list-none gap-3 p-0">{rows.map(p => <li key={p.planId} className="grid gap-1 text-[13px]">
                <span className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="truncate text-slate-800">{planName(p.name)}{!p.active && <span className="ml-1 text-[11px] text-slate-400">({t('admin.plans.stats.share.inactive')})</span>}</span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">{t('admin.plans.stats.share.row', {count: p.subscribers, percent: formatNumber(p.sharePercent, {maximumFractionDigits: 1})})}</span>
                </span>
                <span className="relative block h-2 bg-slate-100" aria-hidden="true">
                    <span className="absolute inset-y-0 left-0 bg-slate-300" style={{width: `${clampPercent(p.sharePercent)}%`}}/>
                    <span className="absolute inset-y-0 left-0 bg-slate-700"
                          style={{width: `${clampPercent(p.subscribers ? p.sharePercent * p.payingSubscribers / p.subscribers : 0)}%`}}/>
                </span>
            </li>)}</ul>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-[11.5px] text-slate-500">
                <li className="inline-flex items-center gap-1.5"><span className="h-2 w-2.5 bg-slate-700" aria-hidden="true"/>{t('admin.plans.stats.share.paying')}</li>
                <li className="inline-flex items-center gap-1.5"><span className="h-2 w-2.5 bg-slate-300" aria-hidden="true"/>{t('admin.plans.stats.share.free')}</li>
            </ul>
        </> : <p className="m-0 py-8 text-center text-[13px] text-slate-500">{t('admin.plans.stats.share.empty')}</p>}</div>
    </Card>;
}

function NearLimitCard({data}: { data: PlanStats }) {
    const {t, formatNumber} = useI18n();
    const names = new Map(data.plans.map(p => [p.code, planName(p.name)]));
    const hours = (value: number) => formatNumber(value, {maximumFractionDigits: 1});
    return <Card title={t('admin.plans.stats.nearLimit.title')} hint={t('admin.plans.stats.nearLimit.hint')}>
        {data.nearLimit.length ? <ul className="m-0 list-none divide-y divide-slate-100 p-0">{data.nearLimit.map(c => {
            const name = c.fullName || c.username;
            return <li key={c.userId}>
                <Link href={QUOTAS_HREF} aria-label={t('admin.plans.stats.nearLimit.open', {name})}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 text-[13px] hover:bg-slate-50">
                    <span className="min-w-0 truncate"><strong className="font-semibold text-slate-900">{name}</strong>
                        <span className="ml-1.5 text-xs text-slate-500">{names.get(c.planCode) ?? c.planCode}</span></span>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#c43a4a]">
                        {formatNumber(c.percent, {maximumFractionDigits: 1})}%<ChevronRight size={14} className="text-slate-400" aria-hidden="true"/></span>
                    <span className="relative block h-1.5 bg-slate-100" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 bg-[#c43a4a]" style={{width: `${clampPercent(c.percent)}%`}}/>
                    </span>
                    <span className="text-right text-[11.5px] tabular-nums text-slate-500">
                        {t('admin.plans.stats.nearLimit.hours', {used: hours(c.usedHours), limit: hours(c.limitHours)})}</span>
                </Link>
            </li>;
        })}</ul> : <p className="m-0 px-4 py-8 text-center text-[13px] text-slate-500">{t('admin.plans.stats.nearLimit.empty')}</p>}
    </Card>;
}
