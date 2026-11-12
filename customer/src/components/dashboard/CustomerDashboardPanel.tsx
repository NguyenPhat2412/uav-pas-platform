'use client';
import Link from 'next/link';
import {PageGuard} from "@/components/customer/CustomerLayout";
import {Panel, Status} from "@/components/customer/CustomerUi";
import {
    CustomerAnalytics,
    CustomerOperationalInsights,
    CustomerUpcomingStrip,
} from "@/components/dashboard/CustomerAnalytics";
import {useCustomerAnalytics} from '@/hooks/dashboard/useCustomerAnalytics';
import {Delta} from "@/components/dashboard/AdminCharts";
import {useMissions, useServices} from '@/hooks/mission/useCustomerMissions';
import {formatShortDate} from "@/lib/format";
import {toMissionSlug} from "@/lib/url-slugs";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Clock,
    FolderCheck,
    Plane,
    Wallet,
} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {HomeWeatherWidget} from '@/components/weather/HomeWeatherWidget';

const TILE_TONES = {
    red: {accent: 'border-t-primary', icon: 'bg-uav-red-light text-primary'},
    blue: {accent: 'border-t-uav-blue', icon: 'bg-uav-blue-light text-uav-blue'},
    amber: {accent: 'border-t-amber-500', icon: 'bg-amber-50 text-amber-600'},
} as const;

/**
 * One KPI cell. The title area is always two lines tall (1-line titles leave a gap, longer ones clamp),
 * so the value lands on the same row in every cell whatever the title or hint length.
 */
function KpiTile({label, icon, tone, value, children}: {
    label: string;
    icon: React.ReactNode;
    tone: keyof typeof TILE_TONES;
    value: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <article className={`flex flex-col gap-2.5 border-t-2 bg-white p-4 ${TILE_TONES[tone].accent}`}>
            <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 min-h-[2lh] text-xs font-semibold leading-5 text-muted">{label}</span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-panel ${TILE_TONES[tone].icon}`}>{icon}</span>
            </div>
            <strong className="block text-2xl font-extrabold leading-none tabular-nums tracking-tight text-slate-900">{value}</strong>
            <div className="text-[11.5px] font-medium leading-5 text-slate-500">{children}</div>
        </article>
    );
}

export default function DashboardPage() {
    return <PageGuard><Dashboard/></PageGuard>;
}

function Dashboard() {
    const {t, formatDate, formatCurrency, formatNumber} = useI18n();
    const shortDate = (value?: string) => formatShortDate(value, formatDate);
    const missions = useMissions();
    const services = useServices();
    const analyticsQuery = useCustomerAnalytics();
    const analytics = analyticsQuery.data;

    const rows = missions.data?.content ?? [];
    const totalMissions = missions.data?.totalElements ?? 0;
    const inProgressMissions = rows.filter(m => ['PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(m.status)).length;
    const openServices = services.data?.length ?? 0;
    const vs = t('dashboard.analytics.vsLastMonth');
    const finishedCount = analytics
        ? analytics.outcomes.completed + analytics.outcomes.failed + analytics.outcomes.cancelled + analytics.outcomes.rejected
        : 0;

    return (
        <div className="flex flex-1 flex-col bg-white">
            {(missions.isError || services.isError) &&
                <div role="alert" className="border-b border-red-200 bg-danger/10 px-4 py-3 text-[13px] text-danger">{t('dashboard.loadError')}</div>}

            {/* Toolbar: quick links and primary action */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border bg-card px-4 py-3 sm:px-5">
                <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                    {t('dashboard.openServices')}: <strong className="font-bold text-slate-800 tabular-nums">{openServices}</strong>
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <Link
                        href="/customer/training"
                        className="inline-flex min-h-9 items-center justify-center rounded-control border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-primary"
                    >
                        {t('nav.training')}
                    </Link>
                    <Link
                        href="/customer/services"
                        className="inline-flex min-h-9 items-center justify-center rounded-control border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-primary"
                    >
                        {t('dashboard.exploreServices')}
                    </Link>
                    <Link
                        href="/customer/billing"
                        className="inline-flex min-h-9 items-center justify-center rounded-control border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-primary"
                    >
                        {t('dashboard.manageBilling')}
                    </Link>
                    <Link
                        href="/customer/missions/create"
                        className="inline-flex min-h-9 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover"
                    >
                        {t('dashboard.bookService')}
                    </Link>
                </div>
            </div>

            {/* Pending Invoices Alert Strip */}
            {analytics && analytics.pendingInvoices.count > 0 && (
                <div className="flex items-center gap-2.5 rounded-panel border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800 sm:px-5" role="status">
                    <AlertTriangle size={17} aria-hidden="true" className="shrink-0"/>
                    <span className="flex-1">
                        {t('dashboard.analytics.pendingInvoices', {
                            count: analytics.pendingInvoices.count,
                            amount: formatCurrency(analytics.pendingInvoices.amount),
                        })}
                        {analytics.pendingInvoices.nextDue &&
                            ` · ${t('dashboard.analytics.nextDue', {date: formatDate(analytics.pendingInvoices.nextDue, {dateStyle: 'short'})})}`}
                    </span>
                    <Link href="/customer/billing" className="inline-flex items-center gap-0.5 whitespace-nowrap text-[12.5px] font-semibold hover:underline">
                        {t('dashboard.analytics.payNow')}
                        <ChevronRight size={14} aria-hidden="true"/>
                    </Link>
                </div>
            )}

            <HomeWeatherWidget detailsHref="/customer/weather"/>

            {/* 6-card KPI strip: every title area is two lines tall, so all six numbers sit on one row. */}
            <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-3 xl:grid-cols-6">
                <KpiTile label={t('dashboard.totalMissions')} icon={<Activity size={15}/>} tone="red" value={totalMissions}>
                    {t('dashboard.totalMissionsHint')}
                </KpiTile>
                <KpiTile label={t('dashboard.inProgress')} icon={<Plane size={15}/>} tone="blue" value={inProgressMissions}>
                    {t('dashboard.inProgressHint')}
                </KpiTile>
                <KpiTile label={t('dashboard.analytics.kpi.flightHours')} icon={<Clock size={15}/>} tone="blue"
                         value={analytics ? t('dashboard.analytics.hours', {value: formatNumber(analytics.thisMonth.flightHours)}) : '—'}>
                    {analytics
                        ? <Delta current={analytics.thisMonth.flightHours} previous={analytics.lastMonth.flightHours} label={vs}/>
                        : <span className="inline-block h-4 w-24 animate-pulse bg-slate-100"/>}
                </KpiTile>
                <KpiTile label={t('dashboard.analytics.kpi.spend')} icon={<Wallet size={15}/>} tone="amber"
                         value={analytics ? formatCurrency(analytics.thisMonth.spend) : '—'}>
                    {analytics
                        ? <Delta current={analytics.thisMonth.spend} previous={analytics.lastMonth.spend} higherIsBetter={false} label={vs}/>
                        : <span className="inline-block h-4 w-24 animate-pulse bg-slate-100"/>}
                </KpiTile>
                <KpiTile label={t('dashboard.analytics.kpi.successRate')} icon={<CheckCircle2 size={15}/>} tone="blue"
                         value={analytics ? (finishedCount ? `${formatNumber(analytics.outcomes.successRate)}%` : '—') : '—'}>
                    {analytics ? t('dashboard.analytics.finishedCount', {count: finishedCount}) : '—'}
                </KpiTile>
                <KpiTile label={t('dashboard.analytics.kpi.media')} icon={<FolderCheck size={15}/>} tone="red"
                         value={analytics ? analytics.mediaFiles : '—'}>
                    {t('dashboard.analytics.mediaHint')}
                </KpiTile>
            </div>

            {/* Above-the-Fold Operational Workspace: Recent Missions + Upcoming | Quota + Pipeline + Turnaround */}
            <div className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] [&>*]:border-0">
                {/* Left Operational Column: Recent Missions Table + Upcoming Schedule */}
                <div className="flex h-full flex-col bg-white">
                    <Panel
                        title={t('dashboard.recentMissions')}
                        action={<Link href="/customer/missions" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">{t('dashboard.viewAll')}</Link>}
                        className="flex-1 border-0 [&>div]:p-0"
                    >
                        <div className="overflow-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                <tr className="border-b border-border bg-slate-50/70 text-left text-[11px] font-bold text-muted">
                                    <th className="px-4 py-3">{t('dashboard.missionCode')}</th>
                                    <th className="px-4 py-3">{t('dashboard.time')}</th>
                                    <th className="px-4 py-3 text-right">{t('common.status')}</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-border text-[13px]">
                                {!rows.length && <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-muted">{missions.isPending ? t('dashboard.loadingMissions') : t('dashboard.noMissions')}</td>
                                </tr>}
                                {rows.slice(0, 5).map(m => (
                                    <tr key={m.id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-4 py-3 align-middle">
                                            <Link className="tabular-nums font-bold text-slate-900 hover:text-primary" href={`/customer/missions/${toMissionSlug(m)}`}>
                                                {m.code}
                                            </Link>
                                            <div className="mt-0.5 text-xs text-muted">{m.title}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 align-middle tabular-nums text-xs text-slate-500">
                                            {shortDate(m.startTime)}
                                        </td>
                                        <td className="px-4 py-3 text-right align-middle">
                                            <Status value={m.status}/>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </Panel>
                    <CustomerUpcomingStrip data={analytics} isPending={analyticsQuery.isPending}/>
                </div>

                {/* Right Operational Column: Combined Quota + Pipeline + Turnaround SLA */}
                <CustomerOperationalInsights data={analytics} isPending={analyticsQuery.isPending}/>
            </div>

            {/* Deep Analytics Section: Paired Monthly Charts, Outcomes, Services & Map */}
            <CustomerAnalytics/>
        </div>
    );
}
