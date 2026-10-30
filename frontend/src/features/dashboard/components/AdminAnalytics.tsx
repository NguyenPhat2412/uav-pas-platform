'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useMemo, useState} from 'react';
import {BarChart3, ExternalLink, Grid2x2, MapPin, Navigation, TrendingUp} from 'lucide-react';
import {displayLabel} from '@/components/shared/presentation';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {QueryState} from '@/components/data/WorkspaceState';
import {BarList, ColumnChart, Delta, Legend, SegmentBar, seriesColors, TrendChart, type TrendViewMode} from '@/features/dashboard/components/AdminCharts';
import {useAdminAnalytics} from '@/features/dashboard/hooks/useAdminDashboard';
import type {AdminAnalytics as Analytics} from '@/types/admin';
import {cn} from '@/lib/utils';

const MissionMap = dynamic(() => import('@/features/dashboard/components/MissionMap').then(m => m.MissionMap), {ssr: false});

const ranges = [7, 30, 90] as const;

// Strict Red & White shades so every status group stays in the red-white palette.
const statusGroups = [
    {key: 'waiting', color: '#a1a1aa', states: ['PENDING_CONFIRMATION']},
    {key: 'scheduled', color: '#71717a', states: ['CONFIRMED', 'RESOURCE_RESERVED', 'READY']},
    {key: 'active', color: '#c43a4a', states: ['IN_PROGRESS']},
    {key: 'completed', color: '#3f3f46', states: ['COMPLETED']},
    {key: 'stopped', color: '#7f1d1d', states: ['CANCELLED', 'REJECTED', 'FAILED']},
    {key: 'draft', color: '#fecaca', states: ['DRAFT']},
] as const;

const fleetColors: Record<string, string> = {
    AVAILABLE: '#3f3f46',
    ASSIGNED: '#71717a',
    IN_USE: '#c43a4a',
    MAINTENANCE: '#a1a1aa',
    INACTIVE: '#fecaca',
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-rose-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-badge bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    <MapPin size={12} aria-hidden="true"/>
                    Bản đồ & Thống kê Điều hành
                </span>
                <a href="#admin-tactical-map" className="rounded-control border border-rose-200 bg-uav-red-light px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-white">
                    Bản đồ Nhiệm vụ ({query.data?.missionLocations.length ?? 0})
                </a>
                <a href="#admin-daily-trend" className="rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light">
                    Biểu đồ Xu hướng
                </a>
                <a href="#admin-revenue-quota" className="rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light">
                    Doanh thu & Quota ({query.data?.quotaWarnings.length ?? 0})
                </a>
            </div>
            <div className="inline-flex rounded-panel border border-rose-200 bg-rose-50/60 p-[3px]" role="group" aria-label={t('admin.analytics.range')}>{ranges.map(range =>
                <button key={range} type="button" aria-pressed={days === range}
                        className={cn('cursor-pointer rounded-control border-0 px-3 py-[5px] text-[12.5px] font-semibold transition-colors', days === range ? 'bg-primary text-white shadow-2xs' : 'bg-transparent text-primary/75 hover:bg-white hover:text-primary')}
                        onClick={() => setDays(range)}>{t('admin.analytics.days', {count: range})}</button>)}</div>
        </div>
        <QueryState query={query}>{query.data && <AnalyticsBody data={query.data} money={money} />}</QueryState>
    </section>;
}

function AnalyticsBody({data, money}: { data: Analytics; money: Intl.NumberFormat }) {
    const {t, formatNumber} = useI18n();
    const {can} = useAuth();
    const [dailyMode, setDailyMode] = useState<TrendViewMode>('bars');
    const [mapFilter, setMapFilter] = useState<string>('all');
    const [selectedMissionCode, setSelectedMissionCode] = useState<string | null>(null);
    const vs = t('admin.analytics.vsPrevious');
    const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
    const status = statusGroups.map(group => ({
        key: group.key,
        label: t(`admin.analytics.status.${group.key}`),
        color: group.color,
        value: group.states.reduce((sum, state) => sum + (data.statusBreakdown[state] ?? 0), 0),
    }));
    const fleetTotal = Object.values(data.fleet).reduce((a, b) => a + b, 0);
    const missionsVisible = can('MISSION_VIEW_ALL');
    const billingVisible = can('PERMISSION_MANAGE');

    // Daily summary metrics for the header strip
    const totalDailyCompleted = data.daily.reduce((sum, d) => sum + d.completed, 0);
    const totalDailyFailed = data.daily.reduce((sum, d) => sum + d.failed, 0);
    const totalDailyMissions = totalDailyCompleted + totalDailyFailed;
    const activeDaysCount = data.daily.filter(d => d.completed + d.failed > 0).length;
    const avgDaily = data.daily.length > 0 ? Math.round((totalDailyMissions / data.daily.length) * 10) / 10 : 0;
    const peakEntry = data.daily.reduce<{ date: string; total: number } | null>((best, d) => {
        const total = d.completed + d.failed;
        if (total <= 0) return best;
        if (!best || total > best.total) return {date: shortDate(d.date), total};
        return best;
    }, null);

    const allMapPoints = useMemo(() => data.missionLocations.map(p => {
        const g = groupOf(p.status);
        return {
            ...p,
            color: g.color,
            label: displayLabel(p.status),
            statusKey: g.key,
            pulse: g.key === 'active' || g.key === 'waiting' || g.key === 'stopped',
        };
    }), [data.missionLocations]);

    const filteredMapPoints = useMemo(
        () => mapFilter === 'all' ? allMapPoints : allMapPoints.filter(p => p.statusKey === mapFilter),
        [allMapPoints, mapFilter]
    );

    const mapGroupCounts = useMemo(() => {
        const counts: Record<string, number> = {all: allMapPoints.length};
        for (const g of statusGroups) {
            counts[g.key] = allMapPoints.filter(p => p.statusKey === g.key).length;
        }
        return counts;
    }, [allMapPoints]);

    const activeMissionPoint = useMemo(
        () => filteredMapPoints.find(p => p.code === selectedMissionCode) ?? filteredMapPoints[0] ?? null,
        [filteredMapPoints, selectedMissionCode]
    );

    const kpis = [
        {key: 'completed', value: String(data.current.completedMissions), delta: <Delta current={data.current.completedMissions} previous={data.previous.completedMissions} label={vs}/>, show: missionsVisible},
        {key: 'successRate', value: `${data.current.successRate}%`, delta: <Delta current={data.current.successRate} previous={data.previous.successRate} suffix={t('admin.analytics.points')} label={vs}/>, show: missionsVisible},
        {key: 'flightHours', value: t('admin.analytics.hours', {value: data.current.flightHours}), delta: <Delta current={data.current.flightHours} previous={data.previous.flightHours} label={vs}/>, show: missionsVisible},
        {key: 'revenue', value: `${money.format(data.current.revenue)} đ`, delta: <Delta current={data.current.revenue} previous={data.previous.revenue} label={vs}/>, show: billingVisible},
        {key: 'newUsers', value: String(data.current.newUsers), delta: <Delta current={data.current.newUsers} previous={data.previous.newUsers} label={vs}/>, show: can('USER_READ')},
    ].filter(k => k.show);

    return <>
        {kpis.length > 0 && <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] border-l border-rose-200 bg-white">{kpis.map(kpi => <article key={kpi.key} className="flex flex-col gap-1 border-b border-r border-t-2 border-rose-200 border-t-primary bg-white px-[18px] py-4">
            <span className="text-[12px] font-bold uppercase tracking-wider text-primary/75">{t(`admin.analytics.kpi.${kpi.key}`)}</span>
            <strong className="text-2xl font-black leading-tight tabular-nums text-foreground">{kpi.value}</strong>
            {kpi.delta}
        </article>)}</div>}

        <div className="grid grid-cols-1 gap-px border border-rose-200 bg-rose-200 [&>*]:border-0 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-full">
            {/* 1. PROMOTED INTERACTIVE TACTICAL MISSION MAP (Top of Analytics so users never miss it) */}
            {missionsVisible && <section id="admin-tactical-map" className="col-span-full min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 bg-uav-red-light/60 px-[18px] py-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-control bg-primary text-white">
                            <MapPin size={15} aria-hidden="true"/>
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.mapTitle')}</h2>
                                <span className="rounded-badge bg-primary px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                                    {filteredMapPoints.length}/{allMapPoints.length} điểm bay
                                </span>
                            </div>
                            <p className="m-0 text-xs text-primary/75">
                                Nhấp vào bộ lọc trạng thái hoặc chọn trực tiếp từng nhiệm vụ bên phải để định vị tọa độ trên bản đồ.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/admin/fleet-map"
                            className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                        >
                            <span>Mở Bản đồ Đội bay Toàn màn hình</span>
                            <ExternalLink size={13} aria-hidden="true"/>
                        </Link>
                    </div>
                </header>

                {/* Interactive Red & White Status Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-white px-[18px] py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc điểm nhiệm vụ trên bản đồ">
                        <button
                            type="button"
                            aria-pressed={mapFilter === 'all'}
                            onClick={() => setMapFilter('all')}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-bold transition-colors',
                                mapFilter === 'all'
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-rose-200 bg-white text-primary hover:bg-uav-red-light'
                            )}
                        >
                            <span>Tất cả</span>
                            <span className={cn('rounded-badge px-1.5 py-0.2 text-[10.5px] tabular-nums', mapFilter === 'all' ? 'bg-white text-primary' : 'bg-uav-red-light text-primary')}>
                                {mapGroupCounts.all ?? 0}
                            </span>
                        </button>
                        {statusGroups.slice(0, 5).map(g => {
                            const count = mapGroupCounts[g.key] ?? 0;
                            const isActive = mapFilter === g.key;
                            return (
                                <button
                                    key={g.key}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => setMapFilter(isActive ? 'all' : g.key)}
                                    className={cn(
                                        'inline-flex cursor-pointer items-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-semibold transition-colors',
                                        isActive
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-rose-200 bg-white text-primary hover:bg-uav-red-light'
                                    )}
                                >
                                    <span
                                        className="h-2 w-2 rounded-full border border-white"
                                        style={{background: isActive ? '#ffffff' : g.color}}
                                        aria-hidden="true"
                                    />
                                    <span>{t(`admin.analytics.status.${g.key}`)}</span>
                                    <strong className="tabular-nums">{count}</strong>
                                </button>
                            );
                        })}
                    </div>
                    <Legend items={statusGroups.slice(0, 5).map(g => ({label: t(`admin.analytics.status.${g.key}`), color: g.color}))}/>
                </div>

                {allMapPoints.length ? (
                    <div className="grid grid-cols-1 divide-y divide-rose-200 lg:grid-cols-[minmax(0,1fr)_320px] lg:divide-x lg:divide-y-0">
                        <div className="relative min-w-0">
                            <MissionMap
                                ariaLabel={t('admin.analytics.mapAria', {count: filteredMapPoints.length})}
                                points={filteredMapPoints}
                                selectedCode={activeMissionPoint?.code ?? null}
                                onSelect={setSelectedMissionCode}
                            />
                            {activeMissionPoint && (
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-200 bg-uav-red-light/50 px-4 py-2.5 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white" aria-hidden="true"/>
                                        <strong className="font-mono font-bold text-primary">{activeMissionPoint.code}</strong>
                                        <span className="rounded-badge border border-rose-200 bg-white px-2 py-0.5 font-semibold text-primary">
                                            {activeMissionPoint.label}
                                        </span>
                                        <span className="font-mono text-[11px] text-primary/75 tabular-nums">
                                            ({activeMissionPoint.latitude.toFixed(4)}, {activeMissionPoint.longitude.toFixed(4)})
                                        </span>
                                    </div>
                                    <Link
                                        href="/operations/dispatch/missions"
                                        className="font-bold text-primary hover:underline"
                                    >
                                        Điều phối nhiệm vụ →
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Interactive Mission Locator Sidebar */}
                        <aside className="flex max-h-[425px] flex-col bg-white" aria-label="Danh sách tọa độ nhiệm vụ">
                            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/50 px-3.5 py-2.5 text-xs">
                                <strong className="font-bold uppercase tracking-wider text-primary">Tọa độ Nhiệm vụ</strong>
                                <span className="font-semibold tabular-nums text-primary/75">{filteredMapPoints.length} mục</span>
                            </div>
                            <ul className="m-0 flex-1 list-none divide-y divide-rose-100 overflow-y-auto p-0">
                                {filteredMapPoints.map(pt => {
                                    const selected = activeMissionPoint?.code === pt.code;
                                    return (
                                        <li key={pt.code}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedMissionCode(pt.code)}
                                                className={cn(
                                                    'flex w-full cursor-pointer items-center justify-between gap-2 border-l-[3px] px-3.5 py-2.5 text-left text-xs transition-colors',
                                                    selected
                                                        ? 'border-l-primary bg-uav-red-light font-bold text-primary'
                                                        : 'border-l-transparent bg-white text-foreground hover:bg-rose-50/60'
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Navigation size={12} className="shrink-0 text-primary" aria-hidden="true"/>
                                                        <span className="font-mono font-bold text-primary">{pt.code}</span>
                                                    </div>
                                                    <span className="mt-0.5 block font-mono text-[11px] text-primary/65 tabular-nums">
                                                        {pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}
                                                    </span>
                                                </div>
                                                <span className="shrink-0 rounded-badge border border-rose-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-primary">
                                                    {pt.label}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </aside>
                    </div>
                ) : (
                    <p className="m-0 p-6 text-[13px] text-primary/70">{t('admin.analytics.mapEmpty')}</p>
                )}
            </section>}

            {/* 2. DAILY TREND CHART */}
            {missionsVisible && <section id="admin-daily-trend" className="col-span-full min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.dailyTitle')}</h2>
                        <span className="rounded-badge border border-rose-200 bg-uav-red-light px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                            {shortDate(data.from)} – {shortDate(data.to)}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Legend items={[
                            {label: t('admin.analytics.completed'), color: seriesColors.blue},
                            {label: t('admin.analytics.failed'), color: seriesColors.red, dashed: dailyMode === 'area'},
                        ]}/>
                        <div
                            className="inline-flex items-center rounded-control border border-rose-200 bg-rose-50/80 p-0.5"
                            role="group"
                            aria-label={t('admin.analytics.viewMode')}
                        >
                            {([
                                {id: 'bars', label: t('admin.analytics.viewBars'), Icon: BarChart3},
                                {id: 'area', label: t('admin.analytics.viewArea'), Icon: TrendingUp},
                                {id: 'matrix', label: t('admin.analytics.viewMatrix'), Icon: Grid2x2},
                            ] as const).map(({id, label, Icon}) => (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={dailyMode === id}
                                    onClick={() => setDailyMode(id)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[11.5px] font-semibold transition-colors cursor-pointer',
                                        dailyMode === id
                                            ? 'bg-primary text-white shadow-2xs'
                                            : 'text-primary/75 hover:bg-white hover:text-primary'
                                    )}
                                >
                                    <Icon size={13} aria-hidden="true"/>
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Compact Daily Summary Strip */}
                <div className="grid grid-cols-2 divide-x divide-y divide-rose-200/80 border-b border-rose-200/80 bg-rose-50/40 sm:grid-cols-4 sm:divide-y-0">
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span className="text-xs font-medium text-primary/75">{t('admin.analytics.completed')}</span>
                        <strong className="text-sm font-bold tabular-nums text-primary">{formatNumber(totalDailyCompleted)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span className="text-xs font-medium text-primary/75">{t('admin.analytics.failed')}</span>
                        <strong className="rounded-badge bg-primary px-2 py-0.5 text-xs font-bold tabular-nums text-white">{formatNumber(totalDailyFailed)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span className="text-xs font-medium text-primary/75">{t('admin.analytics.dailyAvg')}</span>
                        <strong className="text-sm font-bold tabular-nums text-primary">
                            {formatNumber(avgDaily)} <small className="font-normal text-primary/65">({activeDaysCount}/{data.daily.length}d)</small>
                        </strong>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span className="text-xs font-medium text-primary/75">{t('admin.analytics.peakDay')}</span>
                        <strong className="text-sm font-bold tabular-nums text-primary">
                            {peakEntry ? `${formatNumber(peakEntry.total)} (${peakEntry.date})` : '—'}
                        </strong>
                    </div>
                </div>

                <div className="p-6">
                    <TrendChart
                        mode={dailyMode}
                        labels={data.daily.map(d => shortDate(d.date))}
                        ariaLabel={t('admin.analytics.dailyAria', {from: shortDate(data.from), to: shortDate(data.to)})}
                        series={[
                            {key: 'completed', label: t('admin.analytics.completed'), color: seriesColors.blue, values: data.daily.map(d => d.completed)},
                            {key: 'failed', label: t('admin.analytics.failed'), color: seriesColors.red, dashed: true, values: data.daily.map(d => d.failed)},
                        ]}
                    />
                </div>
            </section>}

            {/* 3. MISSION STATUS BREAKDOWN */}
            {missionsVisible && <section className="min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.statusTitle')}</h2>
                    <span className="rounded-badge bg-uav-red-light px-2 py-0.5 text-xs font-bold text-primary">
                        {status.reduce((s, i) => s + i.value, 0)} nhiệm vụ
                    </span>
                </header>
                <div className="p-6"><SegmentBar items={status} ariaLabel={t('admin.analytics.statusTitle')}/></div>
            </section>}

            {/* 4. FLIGHT HOURS BY STATION */}
            {missionsVisible && <section className="min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.stationTitle')}</h2>
                    <span className="rounded-badge bg-uav-red-light px-2 py-0.5 text-xs font-bold text-primary">
                        {data.flightHoursByStation.length} trạm
                    </span>
                </header>
                <div className="p-6">{data.flightHoursByStation.length ?
                    <BarList items={data.flightHoursByStation.map(s => ({label: s.name, value: s.value}))}
                             format={v => t('admin.analytics.hours', {value: v})}/> :
                    <p className="m-0 text-[13px] text-primary/70">{t('admin.analytics.noFlights')}</p>}</div>
            </section>}

            {/* 5. FLEET BREAKDOWN */}
            {fleetTotal > 0 && <section className="min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.fleetTitle')}</h2>
                    <span className="rounded-badge bg-primary px-2.5 py-0.5 text-xs font-bold text-white">{t('admin.analytics.fleetTotal', {count: fleetTotal})}</span>
                </header>
                <ul className="m-0 flex list-none flex-col gap-3 px-[18px] pb-4 pt-2.5">{Object.entries(data.fleet).map(([state, count]) => <li key={state}>
                    <div className="mb-[5px] flex justify-between gap-2 text-[13px]"><span className="truncate text-primary/80">{displayLabel(state)}</span><strong className="text-primary">{count}/{fleetTotal}</strong></div>
                    <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-full bg-rose-50"><span className="rounded-panel" style={{width: `${count / fleetTotal * 100}%`, background: fleetColors[state] ?? seriesColors.gray}}/></span>
                </li>)}</ul>
            </section>}

            {/* 6. REVENUE COLUMN CHART */}
            {billingVisible && <section id="admin-revenue-quota" className="min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.revenueTitle')}</h2>
                    <Legend items={[{label: t('admin.analytics.paid'), color: seriesColors.blue},
                        {label: t('admin.analytics.outstanding'), color: seriesColors.orange}]}/>
                </header>
                <div className="p-6">
                    <ColumnChart ariaLabel={t('admin.analytics.revenueTitle')} format={v => `${money.format(v)} đ`}
                                 series={[{label: t('admin.analytics.paid'), color: seriesColors.blue}, {label: t('admin.analytics.outstanding'), color: seriesColors.orange}]}
                                 groups={data.revenueByMonth.map(m => ({label: `${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`, values: [m.paid, m.outstanding]}))}/>
                </div>
            </section>}

            {/* 7. QUOTA WARNINGS */}
            {billingVisible && <section className="min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.quotaTitle')}</h2>
                        {data.quotaWarnings.length > 0 && (
                            <span className="rounded-badge bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                                {data.quotaWarnings.length} cảnh báo
                            </span>
                        )}
                    </div>
                    <Link href="/admin/billing" className="text-[13px] font-bold text-primary hover:underline">{t('admin.analytics.manage')}</Link>
                </header>
                {data.quotaWarnings.length ? <ul className="m-0 flex list-none flex-col gap-3 px-[18px] pb-4 pt-2.5">{data.quotaWarnings.map(q => {
                    const ratio = Math.min(1, q.used / q.limit);
                    return <li key={q.username}>
                        <div className="mb-[5px] flex justify-between gap-2 text-[13px]"><span className="truncate font-medium text-primary">{q.username}</span><strong className="text-primary">{t('admin.analytics.quotaUsage', {used: q.used, limit: q.limit})}</strong></div>
                        <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-full bg-rose-50"><span className="rounded-panel" style={{width: `${ratio * 100}%`, background: ratio >= 1 ? '#c43a4a' : '#52525b'}}/></span>
                    </li>;
                })}</ul> : <p className="m-0 p-6 text-[13px] text-primary/70">{t('admin.analytics.quotaEmpty')}</p>}
            </section>}

            {/* 8. WEBHOOKS */}
            {can('USER_MANAGE') && <section className="min-w-0 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5">
                    <h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.analytics.webhookTitle')}</h2>
                    <Link href="/admin/webhooks" className="text-[13px] font-bold text-primary hover:underline">{t('admin.analytics.manage')}</Link>
                </header>
                {data.webhooks.length ? <ul className="m-0 flex list-none flex-col gap-3 px-[18px] pb-4 pt-2.5">{data.webhooks.map(w => {
                    const total = w.success + w.failed;
                    return <li key={w.name}>
                        <div className="mb-[5px] flex justify-between gap-2 text-[13px]"><span className="truncate text-primary/80">{w.name}</span><strong className="text-primary">{t('admin.analytics.webhookRate', {rate: Math.round(w.success / total * 100), total})}</strong></div>
                        <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-panel bg-rose-50"><span style={{flexGrow: w.success, background: '#52525b'}}/><span style={{flexGrow: w.failed, background: '#c43a4a'}}/></span>
                    </li>;
                })}</ul> : <p className="m-0 p-6 text-[13px] text-primary/70">{t('admin.analytics.webhookEmpty')}</p>}
            </section>}
        </div>
    </>;
}
