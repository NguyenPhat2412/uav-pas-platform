'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useMemo, useState} from 'react';
import {AlertTriangle, ChevronRight, CircleAlert, Info} from 'lucide-react';
import {displayLabel} from '@/components/shared/presentation';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {QueryState} from '@/components/admin/data/WorkspaceState';
import {BarList, ColumnChart, Delta, Legend, SegmentBar, seriesColors, TrendChart} from '@/components/admin/charts/AdminCharts';
import {useAdminAnalytics} from '@/lib/query/admin';
import type {AdminAlert, AdminAnalytics as Analytics} from '@/types/admin';
import {cn} from '@/lib/utils';

const MissionMap = dynamic(() => import('@/components/admin/charts/MissionMap').then(m => m.MissionMap), {ssr: false});

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
    AVAILABLE: '#0ca30c', ASSIGNED: seriesColors.violet, IN_USE: seriesColors.blue, MAINTENANCE: '#fab219', INACTIVE: seriesColors.gray,
};

const alertIcon = {danger: CircleAlert, warning: AlertTriangle, info: Info};

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

    return <section className="admin-analytics space-y-5" aria-labelledby="analytics-title">
        <div className="analytics-toolbar">
            <h2 id="analytics-title">{t('admin.analytics.title')}</h2>
            <div className="segmented" role="group" aria-label={t('admin.analytics.range')}>{ranges.map(range =>
                <button key={range} type="button" aria-pressed={days === range} className={cn(days === range && 'segmented-active')}
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
        <AlertsPanel alerts={data.alerts}/>
        {kpis.length > 0 && <div className="analytics-kpis">{kpis.map(kpi => <article key={kpi.key} className="analytics-kpi">
            <span>{t(`admin.analytics.kpi.${kpi.key}`)}</span>
            <strong>{kpi.value}</strong>
            {kpi.delta}
        </article>)}</div>}

        <div className="analytics-grid">
            {missionsVisible && <section className="console-panel analytics-wide">
                <header className="console-panel-header"><h2>{t('admin.analytics.dailyTitle')}</h2>
                    <Legend items={[{label: t('admin.analytics.completed'), color: seriesColors.blue},
                        {label: t('admin.analytics.failed'), color: seriesColors.red, dashed: true}]}/></header>
                <div className="panel-body">
                    <TrendChart labels={data.daily.map(d => shortDate(d.date))}
                                ariaLabel={t('admin.analytics.dailyAria', {from: shortDate(data.from), to: shortDate(data.to)})}
                                series={[
                                    {key: 'completed', label: t('admin.analytics.completed'), color: seriesColors.blue, values: data.daily.map(d => d.completed)},
                                    {key: 'failed', label: t('admin.analytics.failed'), color: seriesColors.red, dashed: true, values: data.daily.map(d => d.failed)},
                                ]}/>
                </div>
            </section>}
            {missionsVisible && <section className="console-panel">
                <header className="console-panel-header"><h2>{t('admin.analytics.statusTitle')}</h2></header>
                <div className="panel-body"><SegmentBar items={status} ariaLabel={t('admin.analytics.statusTitle')}/></div>
            </section>}
            {missionsVisible && <section className="console-panel">
                <header className="console-panel-header"><h2>{t('admin.analytics.stationTitle')}</h2></header>
                <div className="panel-body">{data.flightHoursByStation.length ?
                    <BarList items={data.flightHoursByStation.map(s => ({label: s.name, value: s.value}))}
                             format={v => t('admin.analytics.hours', {value: v})}/> :
                    <p className="chart-empty">{t('admin.analytics.noFlights')}</p>}</div>
            </section>}
            {fleetTotal > 0 && <section className="console-panel">
                <header className="console-panel-header"><h2>{t('admin.analytics.fleetTitle')}</h2>
                    <span className="text-xs text-slate-500">{t('admin.analytics.fleetTotal', {count: fleetTotal})}</span></header>
                <ul className="meter-list">{Object.entries(data.fleet).map(([state, count]) => <li key={state}>
                    <div><span>{displayLabel(state)}</span><strong>{count}/{fleetTotal}</strong></div>
                    <span className="meter-track"><span style={{width: `${count / fleetTotal * 100}%`, background: fleetColors[state] ?? seriesColors.gray}}/></span>
                </li>)}</ul>
            </section>}
            {billingVisible && <section className="console-panel">
                <header className="console-panel-header"><h2>{t('admin.analytics.revenueTitle')}</h2>
                    <Legend items={[{label: t('admin.analytics.paid'), color: seriesColors.blue},
                        {label: t('admin.analytics.outstanding'), color: seriesColors.orange}]}/></header>
                <div className="panel-body">
                    <ColumnChart ariaLabel={t('admin.analytics.revenueTitle')} format={v => `${money.format(v)} đ`}
                                 series={[{label: t('admin.analytics.paid'), color: seriesColors.blue}, {label: t('admin.analytics.outstanding'), color: seriesColors.orange}]}
                                 groups={data.revenueByMonth.map(m => ({label: `${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`, values: [m.paid, m.outstanding]}))}/>
                </div>
            </section>}
            {billingVisible && <section className="console-panel">
                <header className="console-panel-header"><h2>{t('admin.analytics.quotaTitle')}</h2>
                    <Link href="/admin/billing" className="text-primary font-semibold">{t('admin.analytics.manage')}</Link></header>
                {data.quotaWarnings.length ? <ul className="meter-list">{data.quotaWarnings.map(q => {
                    const ratio = Math.min(1, q.used / q.limit);
                    return <li key={q.username}>
                        <div><span>{q.username}</span><strong>{t('admin.analytics.quotaUsage', {used: q.used, limit: q.limit})}</strong></div>
                        <span className="meter-track"><span style={{width: `${ratio * 100}%`, background: ratio >= 1 ? '#d03b3b' : '#fab219'}}/></span>
                    </li>;
                })}</ul> : <p className="chart-empty panel-body">{t('admin.analytics.quotaEmpty')}</p>}
            </section>}
            {missionsVisible && <section className="console-panel analytics-wide">
                <header className="console-panel-header"><h2>{t('admin.analytics.mapTitle')}</h2>
                    <Legend items={statusGroups.slice(0, 5).map(g => ({label: t(`admin.analytics.status.${g.key}`), color: g.color}))}/></header>
                {data.missionLocations.length ? <MissionMap ariaLabel={t('admin.analytics.mapAria', {count: data.missionLocations.length})}
                                                            points={data.missionLocations.map(p => ({...p, color: groupOf(p.status).color, label: displayLabel(p.status)}))}/> :
                    <p className="chart-empty panel-body">{t('admin.analytics.mapEmpty')}</p>}
            </section>}
            {can('USER_MANAGE') && <section className="console-panel">
                <header className="console-panel-header"><h2>{t('admin.analytics.webhookTitle')}</h2>
                    <Link href="/admin/webhooks" className="text-primary font-semibold">{t('admin.analytics.manage')}</Link></header>
                {data.webhooks.length ? <ul className="meter-list">{data.webhooks.map(w => {
                    const total = w.success + w.failed;
                    return <li key={w.name}>
                        <div><span>{w.name}</span><strong>{t('admin.analytics.webhookRate', {rate: Math.round(w.success / total * 100), total})}</strong></div>
                        <span className="meter-track meter-split"><span style={{flexGrow: w.success, background: '#0ca30c'}}/><span style={{flexGrow: w.failed, background: '#d03b3b'}}/></span>
                    </li>;
                })}</ul> : <p className="chart-empty panel-body">{t('admin.analytics.webhookEmpty')}</p>}
            </section>}
        </div>
    </>;
}

function AlertsPanel({alerts}: { alerts: AdminAlert[] }) {
    const {t} = useI18n();
    const message = (alert: AdminAlert) => {
        const key = `admin.analytics.alertCodes.${alert.code}`;
        const text = t(key, {count: alert.count});
        return text === key ? alert.message : text;
    };
    return <section id="alerts" className="console-panel analytics-alerts" aria-labelledby="alerts-title">
        <header className="console-panel-header"><h2 id="alerts-title">{t('admin.analytics.alertsTitle')}</h2>
            <span className={cn('status-badge', alerts.length ? 'status-badge-warning' : 'status-badge-online')}>
                {alerts.length ? t('admin.analytics.alertsCount', {count: alerts.length}) : t('admin.analytics.alertsNone')}</span></header>
        {alerts.length ? <ul className="alert-list">{alerts.map(alert => {
            const Icon = alertIcon[alert.level] ?? Info;
            return <li key={alert.code} className={`alert-item alert-${alert.level}`}>
                <Icon size={17} aria-hidden="true"/>
                <span>{message(alert)}</span>
                <Link href={alert.href}>{t('admin.analytics.resolve')}<ChevronRight size={14} aria-hidden="true"/></Link>
            </li>;
        })}</ul> : <p className="chart-empty panel-body">{t('admin.analytics.alertsEmpty')}</p>}
    </section>;
}
