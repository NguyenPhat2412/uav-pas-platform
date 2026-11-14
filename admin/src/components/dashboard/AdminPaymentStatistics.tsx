'use client';

import Link from 'next/link';
import {AlertTriangle, ArrowRight, Wallet} from 'lucide-react';
import {Badge, Card, CardContent, CardHeader, CardTitle, KpiCard} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {BarList, ColumnChart, Delta, Legend, SegmentBar, seriesColors} from '@/components/dashboard/AdminCharts';
import {useAdminPaymentStatistics} from '@/hooks/dashboard/useAdminDashboard';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {PaymentStatistics, PaymentStatsSlice} from '@/types/billing/billing-admin.types';

const P = 'adminCommerce.payments';
const statusColors: Record<string, string> = {
    PAID: seriesColors.blue,
    PENDING: seriesColors.orange,
    EXPIRED: seriesColors.yellow,
    CANCELLED: seriesColors.violet,
    FAILED: seriesColors.red,
};

/** Local calendar day as yyyy-MM-dd (toISOString would shift it to UTC). */
function isoDay(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Payments, revenue and spending for the same day range as the analytics above it. */
export function AdminPaymentStatistics({days, money}: {days: number; money: Intl.NumberFormat}) {
    const {can} = useAuth();
    const today = new Date();
    const to = isoDay(today);
    const from = isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)));
    const query = useAdminPaymentStatistics(from, to);
    if (!can('USER_MANAGE')) return null;
    return (
        <section id="admin-payments" className="space-y-px">
            <QueryState query={query}>
                {query.data && <PaymentBody data={query.data} money={money} />}
            </QueryState>
        </section>
    );
}

function PaymentBody({data, money}: {data: PaymentStatistics; money: Intl.NumberFormat}) {
    const {t, formatNumber} = useI18n();
    const vnd = (value: number) => `${money.format(value)} đ`;
    const vs = t('admin.analytics.vsPrevious');
    const short = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
    const label = (group: string, key: string) => {
        const text = t(`${group}.${key}`);
        return text === `${group}.${key}` ? key : text;
    };
    const {period, previous, outstanding, review} = data;

    const kpis = [
        {key: 'collected', value: vnd(period.collected), delta: <Delta current={period.collected} previous={previous.collected} label={vs} />},
        {key: 'issued', value: vnd(period.issued), sub: t(`${P}.invoices`, {count: period.issuedCount})},
        {
            key: 'collectionRate',
            value: `${formatNumber(period.collectionRate)}%`,
            delta: <Delta current={period.collectionRate} previous={previous.collectionRate} suffix={t('admin.analytics.points')} label={vs} />,
        },
        {
            key: 'avgDaysToPay',
            value: t(`${P}.days`, {value: formatNumber(period.avgDaysToPay)}),
            delta: <Delta current={period.avgDaysToPay} previous={previous.avgDaysToPay} higherIsBetter={false} label={vs} />,
        },
        {key: 'outstanding', value: vnd(outstanding.pendingAmount), sub: t(`${P}.invoices`, {count: outstanding.pendingCount})},
        {key: 'overdue', value: vnd(outstanding.overdueAmount), sub: t(`${P}.invoices`, {count: outstanding.overdueCount}), alert: outstanding.overdueCount > 0},
        {key: 'refunded', value: vnd(period.refunded), sub: t(`${P}.invoices`, {count: review.refundedCount})},
        {key: 'payingCustomers', value: formatNumber(period.payingCustomers), sub: `${t(`${P}.kpi.averageInvoice`)}: ${vnd(period.averageInvoice)}`},
    ];

    const moneyBars = (slices: PaymentStatsSlice[], group: string) =>
        slices.map(s => ({label: `${label(group, s.key)} · ${s.count}`, value: s.amount}));

    return (
        <>
            <Card className="flex flex-wrap items-center justify-between gap-3 border-rose-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary" icon={<Wallet size={12} aria-hidden="true" />} className="bg-primary text-white">
                        {t(`${P}.title`)}
                    </Badge>
                    <Badge variant="primary" size="sm" className="tabular-nums">
                        {t(`${P}.range`, {from: short(data.from), to: short(data.to)})}
                    </Badge>
                </div>
                <Link
                    href="/admin/billing/transactions"
                    className="inline-flex items-center gap-1 rounded-control border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-uav-red-light"
                >
                    {t(`${P}.review.open`)}
                    <ArrowRight size={12} aria-hidden="true" />
                </Link>
            </Card>

            <Card className="border-rose-200 bg-white">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] divide-x divide-y divide-rose-200">
                    {kpis.map(kpi => (
                        <div key={kpi.key} className="flex flex-col justify-between bg-white">
                            <KpiCard label={t(`${P}.kpi.${kpi.key}`)} value={kpi.value} tone="red" />
                            <div className="-mt-2 px-4 pb-3.5 text-xs text-primary/70">
                                {kpi.delta ?? (
                                    <span className={kpi.alert ? 'inline-flex items-center gap-1 font-semibold text-primary' : undefined}>
                                        {kpi.alert && <AlertTriangle size={12} aria-hidden="true" />}
                                        {kpi.sub}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-px border border-rose-200 bg-rose-200 [&>*]:border-0 xl:grid-cols-2">
                <Panel title={t(`${P}.trendTitle`)} wide
                       aside={<Legend items={[
                           {label: t(`${P}.issuedSeries`), color: seriesColors.orange},
                           {label: t(`${P}.collectedSeries`), color: seriesColors.blue},
                           {label: t(`${P}.refundedSeries`), color: seriesColors.yellow},
                       ]} />}>
                    <ColumnChart
                        ariaLabel={t(`${P}.trendTitle`)}
                        format={vnd}
                        series={[
                            {label: t(`${P}.issuedSeries`), color: seriesColors.orange},
                            {label: t(`${P}.collectedSeries`), color: seriesColors.blue},
                            {label: t(`${P}.refundedSeries`), color: seriesColors.yellow},
                        ]}
                        groups={data.monthly.map(m => ({
                            label: `${Number(m.month.slice(5))}/${m.month.slice(2, 4)}`,
                            values: [m.issued, m.collected, m.refunded],
                        }))}
                    />
                </Panel>

                <Panel title={t(`${P}.gatewayTitle`)}>
                    <Bars items={moneyBars(data.byGateway, 'adminCommerce.gateway')} format={vnd} />
                </Panel>
                <Panel title={t(`${P}.sourceTitle`)}>
                    <Bars items={moneyBars(data.bySource, `${P}.source`)} format={vnd} />
                </Panel>
                <Panel title={t(`${P}.planTitle`)}>
                    <Bars items={data.byPlan.map(s => ({label: `${s.key} · ${s.count}`, value: s.amount}))} format={vnd} />
                </Panel>
                <Panel title={t(`${P}.statusTitle`)}>
                    <SegmentBar
                        ariaLabel={t(`${P}.statusTitle`)}
                        items={data.byStatus.map(s => ({
                            label: label('billingPage.status', s.key),
                            value: s.count,
                            color: statusColors[s.key] ?? seriesColors.gray,
                        }))}
                    />
                </Panel>
                <Panel title={t(`${P}.agingTitle`)}>
                    <Bars items={moneyBars(data.aging, `${P}.aging`)} format={vnd} />
                </Panel>
                <Panel title={t(`${P}.reviewTitle`)}
                       aside={review.pendingCount > 0 ? <Badge variant="primary" size="sm" className="bg-primary text-white">{review.pendingCount}</Badge> : undefined}>
                    {review.pendingCount === 0 && review.refundedCount === 0 ? (
                        <p className="text-sm text-primary/70">{t(`${P}.noReview`)}</p>
                    ) : (
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                            <Stat term={t(`${P}.review.pending`)} value={`${review.pendingCount} · ${vnd(review.pendingAmount)}`} strong />
                            <Stat term={t(`${P}.review.refunded`)} value={`${review.refundedCount} · ${vnd(review.refundedAmount)}`} />
                            <Stat term={t(`${P}.review.mismatch`)} value={String(review.mismatchCount)} />
                            <Stat term={t(`${P}.review.unmatched`)} value={String(review.unmatchedCount)} />
                        </dl>
                    )}
                </Panel>

                <Panel title={t(`${P}.topTitle`)} wide>
                    {data.topCustomers.length === 0 ? (
                        <p className="text-sm text-primary/70">{t(`${P}.empty`)}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[420px] text-left text-[13px]">
                                <thead className="text-xs text-primary/70">
                                    <tr className="border-b border-rose-200">
                                        <th className="py-2 font-semibold">{t(`${P}.col.customer`)}</th>
                                        <th className="py-2 text-right font-semibold">{t(`${P}.col.count`)}</th>
                                        <th className="py-2 text-right font-semibold">{t(`${P}.col.paid`)}</th>
                                        <th className="py-2 text-right font-semibold">{t(`${P}.col.outstanding`)}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topCustomers.map(c => (
                                        <tr key={c.userId} className="border-b border-dashed border-rose-100 last:border-0">
                                            <td className="py-2 text-primary">{c.name}</td>
                                            <td className="py-2 text-right tabular-nums text-primary/80">{c.paidCount}</td>
                                            <td className="py-2 text-right font-semibold tabular-nums text-primary">{vnd(c.paid)}</td>
                                            <td className="py-2 text-right tabular-nums text-primary/80">{c.outstanding > 0 ? vnd(c.outstanding) : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>
            <p className="px-1 pt-2 text-xs leading-relaxed text-primary/60">{t(`${P}.definitions`)}</p>
        </>
    );
}

function Panel({title, aside, wide, children}: {title: string; aside?: React.ReactNode; wide?: boolean; children: React.ReactNode}) {
    return (
        <Card className={`min-w-0 rounded-none border-0 bg-white${wide ? ' col-span-full' : ''}`}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 border-b border-rose-200 px-[18px] py-3.5">
                <CardTitle className="text-[15px] font-bold tracking-tight text-primary">{title}</CardTitle>
                {aside}
            </CardHeader>
            <CardContent className="p-6">{children}</CardContent>
        </Card>
    );
}

function Bars({items, format}: {items: {label: string; value: number}[]; format: (value: number) => string}) {
    const {t} = useI18n();
    if (items.every(i => i.value === 0)) return <p className="text-sm text-primary/70">{t(`${P}.empty`)}</p>;
    return <BarList items={items} format={format} />;
}

function Stat({term, value, strong}: {term: string; value: string; strong?: boolean}) {
    return (
        <div>
            <dt className="text-xs text-primary/70">{term}</dt>
            <dd className={`m-0 tabular-nums text-primary ${strong ? 'font-bold' : 'font-medium'}`}>{value}</dd>
        </div>
    );
}
