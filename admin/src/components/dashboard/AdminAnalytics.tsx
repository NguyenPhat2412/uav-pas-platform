'use client';

import {useMemo, useState} from 'react';
import {BarChart3, Grid2x2, MapPin, TrendingUp} from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    KpiCard,
} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {
    Delta,
    Legend,
    seriesColors,
    TrendChart,
    type TrendViewMode,
} from '@/components/dashboard/AdminCharts';
import {AdminAnalyticsMapSection} from '@/components/dashboard/AdminAnalyticsMapSection';
import {AdminAnalyticsBreakdowns} from '@/components/dashboard/AdminAnalyticsBreakdowns';
import {AdminPaymentStatistics} from '@/components/dashboard/AdminPaymentStatistics';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {useAdminAnalytics} from '@/hooks/dashboard/useAdminDashboard';
import type {AdminAnalytics as Analytics} from '@/types/admin';

const ranges = [7, 30, 90] as const;

export function AdminAnalytics() {
    const {can} = useAuth();
    const {t, locale} = useI18n();
    const [days, setDays] = useState<number>(30);
    const query = useAdminAnalytics(days);
    const numberLocale = locale === 'vi' ? 'vi-VN' : locale === 'ja' ? 'ja-JP' : 'en-US';
    const money = useMemo(
        () => new Intl.NumberFormat(numberLocale, {notation: 'compact', maximumFractionDigits: 1}),
        [numberLocale],
    );
    if (!can('DASHBOARD_VIEW')) return null;

    return (
        <section className="space-y-5">
            <Card className="flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="primary"
                        icon={<MapPin size={12} aria-hidden="true" />}
                        className="bg-primary text-white"
                    >
                        Bản đồ & Thống kê Điều hành
                    </Badge>
                    <a
                        href="#admin-mission-map"
                        className="rounded-control border border-rose-200 bg-uav-red-light px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
                    >
                        Bản đồ Nhiệm vụ ({query.data?.missionLocations.length ?? 0})
                    </a>
                    <a
                        href="#admin-daily-trend"
                        className="rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light"
                    >
                        Biểu đồ Xu hướng
                    </a>
                    <a
                        href="#admin-revenue-quota"
                        className="rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light"
                    >
                        Doanh thu & Quota ({query.data?.quotaWarnings.length ?? 0})
                    </a>
                    {can('USER_MANAGE') && (
                        <a
                            href="#admin-payments"
                            className="rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light"
                        >
                            {t('adminCommerce.payments.anchor')}
                        </a>
                    )}
                </div>
                <div
                    className="inline-flex gap-1 rounded-panel border border-rose-200 bg-rose-50/60 p-1"
                    role="group"
                    aria-label={t('admin.analytics.range')}
                >
                    {ranges.map(range => (
                        <Button
                            key={range}
                            type="button"
                            size="sm"
                            variant={days === range ? 'primary' : 'ghost'}
                            aria-pressed={days === range}
                            className="h-7 px-3 text-xs"
                            onClick={() => setDays(range)}
                        >
                            {t('admin.analytics.days', {count: range})}
                        </Button>
                    ))}
                </div>
            </Card>
            <QueryState query={query}>
                {query.data && <AnalyticsBody data={query.data} money={money} />}
            </QueryState>
            <AdminPaymentStatistics days={days} money={money} />
        </section>
    );
}

function AnalyticsBody({data, money}: {data: Analytics; money: Intl.NumberFormat}) {
    const {t, formatNumber} = useI18n();
    const {can} = useAuth();
    const [dailyMode, setDailyMode] = useState<TrendViewMode>('bars');
    const vs = t('admin.analytics.vsPrevious');
    const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
    const missionsVisible = can('MISSION_VIEW_ALL');
    const billingVisible = can('USER_PERMISSION_MANAGE');
    const webhooksVisible = can('USER_MANAGE');

    const totalDailyCompleted = data.daily.reduce((sum, d) => sum + d.completed, 0);
    const totalDailyFailed = data.daily.reduce((sum, d) => sum + d.failed, 0);
    const totalDailyMissions = totalDailyCompleted + totalDailyFailed;
    const activeDaysCount = data.daily.filter(d => d.completed + d.failed > 0).length;
    const avgDaily =
        data.daily.length > 0 ? Math.round((totalDailyMissions / data.daily.length) * 10) / 10 : 0;
    const peakEntry = data.daily.reduce<{date: string; total: number} | null>((best, d) => {
        const total = d.completed + d.failed;
        if (total <= 0) return best;
        return !best || total > best.total ? {date: shortDate(d.date), total} : best;
    }, null);

    const kpis = [
        {
            key: 'completed',
            value: String(data.current.completedMissions),
            delta: <Delta current={data.current.completedMissions} previous={data.previous.completedMissions} label={vs} />,
            show: missionsVisible,
        },
        {
            key: 'successRate',
            value: `${data.current.successRate}%`,
            delta: <Delta current={data.current.successRate} previous={data.previous.successRate} suffix={t('admin.analytics.points')} label={vs} />,
            show: missionsVisible,
        },
        {
            key: 'flightHours',
            value: t('admin.analytics.hours', {value: data.current.flightHours}),
            delta: <Delta current={data.current.flightHours} previous={data.previous.flightHours} label={vs} />,
            show: missionsVisible,
        },
        {
            key: 'revenue',
            value: `${money.format(data.current.revenue)} đ`,
            delta: <Delta current={data.current.revenue} previous={data.previous.revenue} label={vs} />,
            show: billingVisible,
        },
        {
            key: 'newUsers',
            value: String(data.current.newUsers),
            delta: <Delta current={data.current.newUsers} previous={data.previous.newUsers} label={vs} />,
            show: can('USER_VIEW'),
        },
    ].filter(k => k.show);

    return (
        <>
            {kpis.length > 0 && (
                <Card className="border-rose-200 bg-white">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] divide-x divide-y divide-rose-200">
                        {kpis.map(kpi => (
                            <div key={kpi.key} className="flex flex-col justify-between bg-white">
                                <KpiCard
                                    label={t(`admin.analytics.kpi.${kpi.key}`)}
                                    value={kpi.value}
                                    tone="red"
                                />
                                <div className="-mt-2 px-4 pb-3.5">{kpi.delta}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-px border border-rose-200 bg-rose-200 [&>*]:border-0 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-full">
                {missionsVisible && <AdminAnalyticsMapSection locations={data.missionLocations} />}

                {missionsVisible && (
                    <Card id="admin-daily-trend" className="col-span-full min-w-0 rounded-none border-0 bg-white">
                        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                            <div className="flex flex-wrap items-center gap-3">
                                <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                                    {t('admin.analytics.dailyTitle')}
                                </CardTitle>
                                <Badge variant="primary" size="sm" className="tabular-nums">
                                    {shortDate(data.from)} – {shortDate(data.to)}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Legend
                                    items={[
                                        {label: t('admin.analytics.completed'), color: seriesColors.blue},
                                        {label: t('admin.analytics.failed'), color: seriesColors.red, dashed: dailyMode === 'area'},
                                    ]}
                                />
                                <div
                                    className="inline-flex items-center gap-1 rounded-control border border-rose-200 bg-rose-50/80 p-0.5"
                                    role="group"
                                    aria-label={t('admin.analytics.viewMode')}
                                >
                                    {(
                                        [
                                            {id: 'bars', label: t('admin.analytics.viewBars'), Icon: BarChart3},
                                            {id: 'area', label: t('admin.analytics.viewArea'), Icon: TrendingUp},
                                            {id: 'matrix', label: t('admin.analytics.viewMatrix'), Icon: Grid2x2},
                                        ] as const
                                    ).map(({id, label, Icon}) => (
                                        <Button
                                            key={id}
                                            type="button"
                                            size="sm"
                                            variant={dailyMode === id ? 'primary' : 'ghost'}
                                            aria-pressed={dailyMode === id}
                                            onClick={() => setDailyMode(id)}
                                            leftIcon={<Icon size={13} aria-hidden="true" />}
                                            className="h-7 px-2.5 py-1 text-[11.5px]"
                                        >
                                            {label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>

                        <div className="grid grid-cols-2 divide-x divide-y divide-rose-200/80 border-b border-rose-200/80 bg-rose-50/40 sm:grid-cols-4 sm:divide-y-0">
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                                <span className="text-xs font-medium text-primary/75">{t('admin.analytics.completed')}</span>
                                <strong className="text-sm font-bold tabular-nums text-primary">{formatNumber(totalDailyCompleted)}</strong>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                                <span className="text-xs font-medium text-primary/75">{t('admin.analytics.failed')}</span>
                                <Badge variant="primary" size="sm" className="bg-primary text-white tabular-nums">
                                    {formatNumber(totalDailyFailed)}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                                <span className="text-xs font-medium text-primary/75">{t('admin.analytics.dailyAvg')}</span>
                                <strong className="text-sm font-bold tabular-nums text-primary">
                                    {formatNumber(avgDaily)}{' '}
                                    <small className="font-normal text-primary/65">
                                        ({activeDaysCount}/{data.daily.length}d)
                                    </small>
                                </strong>
                            </div>
                            <div className="flex items-center justify-between gap-2 px-4 py-2.5">
                                <span className="text-xs font-medium text-primary/75">{t('admin.analytics.peakDay')}</span>
                                <strong className="text-sm font-bold tabular-nums text-primary">
                                    {peakEntry ? `${formatNumber(peakEntry.total)} (${peakEntry.date})` : '—'}
                                </strong>
                            </div>
                        </div>

                        <CardContent className="p-6">
                            <TrendChart
                                mode={dailyMode}
                                labels={data.daily.map(d => shortDate(d.date))}
                                ariaLabel={t('admin.analytics.dailyAria', {
                                    from: shortDate(data.from),
                                    to: shortDate(data.to),
                                })}
                                series={[
                                    {key: 'completed', label: t('admin.analytics.completed'), color: seriesColors.blue, values: data.daily.map(d => d.completed)},
                                    {key: 'failed', label: t('admin.analytics.failed'), color: seriesColors.red, dashed: true, values: data.daily.map(d => d.failed)},
                                ]}
                            />
                        </CardContent>
                    </Card>
                )}

                <AdminAnalyticsBreakdowns
                    data={data}
                    money={money}
                    missionsVisible={missionsVisible}
                    billingVisible={billingVisible}
                    webhooksVisible={webhooksVisible}
                />
            </div>
        </>
    );
}
