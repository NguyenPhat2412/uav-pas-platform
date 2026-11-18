'use client';

import Link from 'next/link';
import {
    BarChart3,
    Boxes,
    CheckCircle2,
    ClipboardList,
    Clock,
    PlaneTakeoff,
    Radio,
    ReceiptText,
    RefreshCw,
    Store,
    Wallet,
} from 'lucide-react';
import {BarList, SegmentBar, seriesColors} from '@/components/dashboard/analytics/AdminCharts';
import {Button, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import {IllustrativeTag, MarketplaceErrorPanel} from '@/components/marketplace/MarketplaceShared';
import {formatMarketplaceVnd} from '@/forms/marketplace/admin-marketplace-form';
import {useAdminMarketplaceRealtime, useAdminMarketplaceStats} from '@/hooks/marketplace/useAdminMarketplace';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';

function StatsSkeleton() {
    const {t} = useI18n();
    return (
        <div role="status" aria-busy="true" aria-label={t('opsShared.state.loadingData')} className="space-y-4">
            <span className="sr-only">{t('opsShared.state.loadingData')}</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({length: 8}).map((_, idx) => (
                    <div key={idx} className="space-y-2 rounded-panel border border-border bg-card p-4">
                        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100"/>
                        <div className="h-3.5 w-20 animate-pulse rounded-control bg-slate-100"/>
                        <div className="h-6 w-24 animate-pulse rounded-control bg-slate-100"/>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="h-64 animate-pulse rounded-panel border border-border bg-slate-100"/>
                <div className="h-64 animate-pulse rounded-panel border border-border bg-slate-100"/>
            </div>
        </div>
    );
}

export function AdminMarketplaceStats() {
    const {t, formatNumber} = useI18n();
    const {wsConnected} = useAdminMarketplaceRealtime();
    const query = useAdminMarketplaceStats();
    const s = query.data;

    const shortcuts = [
        {href: '/admin/marketplace/dispatch', label: t('adminNav.marketplaceDispatch'), icon: PlaneTakeoff},
        {href: '/admin/marketplace/orders', label: t('adminNav.marketplaceOrders'), icon: ClipboardList},
        {href: '/admin/marketplace/providers', label: t('adminNav.marketplaceProviders'), icon: Store},
        {href: '/admin/marketplace/listings', label: t('adminNav.marketplaceListings'), icon: Boxes},
        {href: '/admin/billing/payouts', label: t('adminNav.billingPayouts'), icon: Wallet},
    ];

    const kpis = s
        ? [
              {key: 'total', label: t('adminCommerce.marketplace.stats.kpiTotalOrders'), value: formatNumber(s.totalOrders), icon: ClipboardList, illustrative: false},
              {key: 'pendingDispatch', label: t('adminCommerce.marketplace.stats.kpiPendingDispatch'), value: formatNumber(s.pendingDispatchCount), icon: Clock, illustrative: false},
              {key: 'inFlight', label: t('adminCommerce.marketplace.stats.kpiInFlight'), value: formatNumber(s.inFlightCount), icon: PlaneTakeoff, illustrative: false},
              {key: 'completed', label: t('adminCommerce.marketplace.stats.kpiCompleted'), value: formatNumber((s.deliveredCount ?? 0) + (s.reviewedCount ?? 0)), icon: CheckCircle2, illustrative: false},
              {key: 'providers', label: t('adminCommerce.marketplace.stats.kpiActiveProviders'), value: formatNumber(s.activeProvidersCount), icon: Store, illustrative: false},
              {key: 'listings', label: t('adminCommerce.marketplace.stats.kpiPublishedListings'), value: formatNumber(s.publishedListingsCount), icon: Boxes, illustrative: false},
              {key: 'gross', label: t('adminCommerce.marketplace.stats.kpiGrossRevenue'), value: formatMarketplaceVnd(Number(s.illustrativeGrossRevenueVnd ?? 0)), icon: Wallet, illustrative: true},
              {key: 'fee', label: t('adminCommerce.marketplace.stats.kpiPlatformFee'), value: formatMarketplaceVnd(Number(s.illustrativePlatformFeeVnd ?? 0)), icon: ReceiptText, illustrative: true},
          ]
        : [];

    const statusSegments = s
        ? [
              {label: displayLabel('PENDING_DISPATCH'), value: s.pendingDispatchCount ?? 0, color: seriesColors.blue},
              {label: displayLabel('PENDING_PROVIDER'), value: s.pendingProviderCount ?? 0, color: seriesColors.orange},
              {label: displayLabel('CONFIRMED'), value: s.scheduledCount ?? 0, color: seriesColors.aqua},
              {label: displayLabel('IN_PROGRESS'), value: s.inFlightCount ?? 0, color: seriesColors.red},
              {label: displayLabel('COMPLETED'), value: (s.deliveredCount ?? 0) + (s.reviewedCount ?? 0), color: seriesColors.yellow},
              {label: displayLabel('CANCELLED'), value: s.cancelledCount ?? 0, color: seriesColors.violet},
          ]
        : [];

    const revenueBars = s
        ? [
              {label: t('adminCommerce.marketplace.stats.kpiGrossRevenue'), value: Number(s.illustrativeGrossRevenueVnd ?? 0)},
              {label: t('adminCommerce.marketplace.stats.kpiPlatformFee'), value: Number(s.illustrativePlatformFeeVnd ?? 0)},
          ]
        : [];

    const supplyBars = s
        ? [
              {label: t('adminCommerce.marketplace.stats.kpiActiveProviders'), value: s.activeProvidersCount ?? 0},
              {label: t('adminCommerce.marketplace.providerStatus.PENDING_REVIEW'), value: s.pendingProvidersCount ?? 0},
              {label: t('adminCommerce.marketplace.stats.kpiPublishedListings'), value: s.publishedListingsCount ?? 0},
              {label: t('adminCommerce.marketplace.listingStatus.PENDING_REVIEW'), value: s.pendingListingsCount ?? 0},
          ]
        : [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <BarChart3 size={20} className="shrink-0 text-primary" aria-hidden="true"/>
                            <span className="truncate">{t('adminCommerce.marketplace.stats.pageTitle')}</span>
                            <IllustrativeTag/>
                        </CardTitle>
                        <p className="m-0 mt-1 text-xs text-muted">{t('adminCommerce.marketplace.stats.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-badge border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                                wsConnected
                                    ? 'border-slate-300 bg-slate-900 text-white'
                                    : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                        >
                            <Radio size={12} aria-hidden="true"/>
                            {wsConnected
                                ? t('adminCommerce.marketplace.dispatch.liveConnected')
                                : t('adminCommerce.marketplace.dispatch.liveReconnecting')}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void query.refetch()}
                            leftIcon={<RefreshCw size={13} aria-hidden="true"/>}
                            className="whitespace-nowrap"
                        >
                            {t('adminCommerce.marketplace.refresh')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="border-t border-border px-5 py-3.5">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                        {shortcuts.map(item => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex min-h-11 items-center gap-2.5 rounded-control border border-border bg-surface-container-low px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:border-slate-400"
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--uav-color-primary-light)] text-primary">
                                        <Icon size={14} aria-hidden="true"/>
                                    </span>
                                    <span className="truncate whitespace-nowrap">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {query.isLoading ? (
                <StatsSkeleton/>
            ) : query.isError ? (
                <Card>
                    <MarketplaceErrorPanel
                        message={t('adminCommerce.marketplace.stats.loadError')}
                        error={query.error}
                        onRetry={() => void query.refetch()}
                    />
                </Card>
            ) : s ? (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {kpis.map(kpi => {
                            const Icon = kpi.icon;
                            return (
                                <article key={kpi.key} className="space-y-2 rounded-panel border border-border bg-card p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--uav-color-primary-light)] text-primary">
                                            <Icon size={17} aria-hidden="true"/>
                                        </span>
                                        {kpi.illustrative && <IllustrativeTag/>}
                                    </div>
                                    <span className="block truncate text-xs font-medium whitespace-nowrap text-muted">
                                        {kpi.label}
                                    </span>
                                    <strong className="block truncate text-lg font-bold text-on-surface tabular-nums">
                                        {kpi.value}
                                    </strong>
                                </article>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="px-5 py-4">
                                <CardTitle className="text-sm font-semibold">
                                    {t('adminCommerce.marketplace.stats.statusChartTitle')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-5 pb-5">
                                {s.totalOrders === 0 ? (
                                    <p className="m-0 py-6 text-center text-xs text-muted">
                                        {t('adminCommerce.marketplace.stats.emptyChart')}
                                    </p>
                                ) : (
                                    <SegmentBar
                                        items={statusSegments}
                                        ariaLabel={t('adminCommerce.marketplace.stats.statusChartTitle')}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between gap-2 px-5 py-4">
                                <CardTitle className="text-sm font-semibold">
                                    {t('adminCommerce.marketplace.stats.revenueChartTitle')}
                                </CardTitle>
                                <IllustrativeTag/>
                            </CardHeader>
                            <CardContent className="space-y-5 px-5 pb-5">
                                <BarList items={revenueBars} format={v => formatMarketplaceVnd(v)} color={seriesColors.blue}/>
                                <div className="border-t border-border pt-4">
                                    <h4 className="m-0 mb-3 text-xs font-semibold text-muted">
                                        {t('adminCommerce.marketplace.stats.categoryChartTitle')}
                                    </h4>
                                    <BarList items={supplyBars} format={v => formatNumber(v)} color={seriesColors.orange}/>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : null}
        </div>
    );
}
