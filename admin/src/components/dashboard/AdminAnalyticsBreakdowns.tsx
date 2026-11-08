'use client';

import Link from 'next/link';
import {Badge, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {BarList, ColumnChart, Legend, SegmentBar, seriesColors} from '@/components/dashboard/AdminCharts';
import {statusGroups} from '@/components/dashboard/AdminAnalyticsMapSection';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {AdminAnalytics as Analytics} from '@/types/admin';

const fleetColors: Record<string, string> = {
    AVAILABLE: '#3f3f46',
    ASSIGNED: '#71717a',
    IN_USE: '#c43a4a',
    MAINTENANCE: '#a1a1aa',
    INACTIVE: '#fecaca',
};

export interface AdminAnalyticsBreakdownsProps {
    data: Analytics;
    money: Intl.NumberFormat;
    missionsVisible: boolean;
    billingVisible: boolean;
    webhooksVisible: boolean;
}

export function AdminAnalyticsBreakdowns({
    data,
    money,
    missionsVisible,
    billingVisible,
    webhooksVisible,
}: AdminAnalyticsBreakdownsProps) {
    const {t} = useI18n();
    const status = statusGroups.map(group => ({
        key: group.key,
        label: t(`admin.analytics.status.${group.key}`),
        color: group.color,
        value: group.states.reduce((sum, state) => sum + (data.statusBreakdown[state] ?? 0), 0),
    }));
    const fleetTotal = Object.values(data.fleet).reduce((a, b) => a + b, 0);

    return (
        <>
            {missionsVisible && (
                <Card className="min-w-0 rounded-none border-0 bg-white">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                        <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                            {t('admin.analytics.statusTitle')}
                        </CardTitle>
                        <Badge variant="primary" size="sm">
                            {status.reduce((s, i) => s + i.value, 0)} nhiệm vụ
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                        <SegmentBar items={status} ariaLabel={t('admin.analytics.statusTitle')} />
                    </CardContent>
                </Card>
            )}

            {missionsVisible && (
                <Card className="min-w-0 rounded-none border-0 bg-white">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                        <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                            {t('admin.analytics.stationTitle')}
                        </CardTitle>
                        <Badge variant="primary" size="sm">
                            {data.flightHoursByStation.length} trạm
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                        {data.flightHoursByStation.length ? (
                            <BarList
                                items={data.flightHoursByStation.map(s => ({label: s.name, value: s.value}))}
                                format={v => t('admin.analytics.hours', {value: v})}
                            />
                        ) : (
                            <p className="m-0 text-[13px] text-primary/70">{t('admin.analytics.noFlights')}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {fleetTotal > 0 && (
                <Card className="min-w-0 rounded-none border-0 bg-white">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                        <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                            {t('admin.analytics.fleetTitle')}
                        </CardTitle>
                        <Badge variant="primary" size="sm" className="bg-primary text-white">
                            {t('admin.analytics.fleetTotal', {count: fleetTotal})}
                        </Badge>
                    </CardHeader>
                    <CardContent className="px-[18px] pt-2.5 pb-4">
                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                            {Object.entries(data.fleet).map(([state, count]) => (
                                <li key={state}>
                                    <div className="mb-[5px] flex justify-between gap-2 text-[13px]">
                                        <span className="truncate text-primary/80">{displayLabel(state)}</span>
                                        <strong className="tabular-nums text-primary">
                                            {count}/{fleetTotal}
                                        </strong>
                                    </div>
                                    <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-full bg-rose-50">
                                        <span
                                            className="rounded-panel"
                                            style={{
                                                width: `${(count / fleetTotal) * 100}%`,
                                                background: fleetColors[state] ?? seriesColors.gray,
                                            }}
                                        />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {billingVisible && (
                <Card id="admin-revenue-quota" className="min-w-0 rounded-none border-0 bg-white">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                        <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                            {t('admin.analytics.revenueTitle')}
                        </CardTitle>
                        <Legend
                            items={[
                                {label: t('admin.analytics.paid'), color: seriesColors.blue},
                                {label: t('admin.analytics.outstanding'), color: seriesColors.orange},
                            ]}
                        />
                    </CardHeader>
                    <CardContent className="p-6">
                        <ColumnChart
                            ariaLabel={t('admin.analytics.revenueTitle')}
                            format={v => `${money.format(v)} đ`}
                            series={[
                                {label: t('admin.analytics.paid'), color: seriesColors.blue},
                                {label: t('admin.analytics.outstanding'), color: seriesColors.orange},
                            ]}
                            groups={data.revenueByMonth.map(m => ({
                                label: `${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`,
                                values: [m.paid, m.outstanding],
                            }))}
                        />
                    </CardContent>
                </Card>
            )}

            {billingVisible && (
                <Card className="min-w-0 rounded-none border-0 bg-white">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                                {t('admin.analytics.quotaTitle')}
                            </CardTitle>
                            {data.quotaWarnings.length > 0 && (
                                <Badge variant="primary" size="sm" className="bg-primary text-white">
                                    {data.quotaWarnings.length} cảnh báo
                                </Badge>
                            )}
                        </div>
                        <Link href="/admin/billing" className="text-[13px] font-bold text-primary hover:underline">
                            {t('admin.analytics.manage')}
                        </Link>
                    </CardHeader>
                    <CardContent className="px-[18px] pt-2.5 pb-4">
                        {data.quotaWarnings.length ? (
                            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                                {data.quotaWarnings.map(q => {
                                    const ratio = Math.min(1, q.used / q.limit);
                                    return (
                                        <li key={q.username}>
                                            <div className="mb-[5px] flex justify-between gap-2 text-[13px]">
                                                <span className="truncate font-medium text-primary">{q.username}</span>
                                                <strong className="tabular-nums text-primary">
                                                    {t('admin.analytics.quotaUsage', {used: q.used, limit: q.limit})}
                                                </strong>
                                            </div>
                                            <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-full bg-rose-50">
                                                <span
                                                    className="rounded-panel"
                                                    style={{
                                                        width: `${ratio * 100}%`,
                                                        background: ratio >= 1 ? '#c43a4a' : '#52525b',
                                                    }}
                                                />
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="m-0 py-3 text-[13px] text-primary/70">{t('admin.analytics.quotaEmpty')}</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {webhooksVisible && (
                <Card className="min-w-0 rounded-none border-0 bg-white">
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                        <CardTitle className="text-[15px] font-bold tracking-tight text-primary">
                            {t('admin.analytics.webhookTitle')}
                        </CardTitle>
                        <Link href="/admin/webhooks" className="text-[13px] font-bold text-primary hover:underline">
                            {t('admin.analytics.manage')}
                        </Link>
                    </CardHeader>
                    <CardContent className="px-[18px] pt-2.5 pb-4">
                        {data.webhooks.length ? (
                            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                                {data.webhooks.map(w => {
                                    const total = w.success + w.failed;
                                    return (
                                        <li key={w.name}>
                                            <div className="mb-[5px] flex justify-between gap-2 text-[13px]">
                                                <span className="truncate text-primary/80">{w.name}</span>
                                                <strong className="tabular-nums text-primary">
                                                    {t('admin.analytics.webhookRate', {
                                                        rate: Math.round((w.success / Math.max(1, total)) * 100),
                                                        total,
                                                    })}
                                                </strong>
                                            </div>
                                            <span className="flex h-[7px] gap-0.5 overflow-hidden rounded-panel bg-rose-50">
                                                <span style={{flexGrow: w.success, background: '#52525b'}} />
                                                <span style={{flexGrow: w.failed, background: '#c43a4a'}} />
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="m-0 py-3 text-[13px] text-primary/70">{t('admin.analytics.webhookEmpty')}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </>
    );
}
