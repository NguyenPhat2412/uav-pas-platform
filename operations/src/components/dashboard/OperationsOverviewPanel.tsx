'use client';

import {useEffect} from 'react';
import Link from 'next/link';
import {
    ArrowUpRight,
    Boxes,
    CheckCircle2,
    ClipboardList,
    Clock,
    CloudSun,
    CreditCard,
    Crosshair,
    Gamepad2,
    MapPinned,
    PlaneTakeoff,
    ShieldCheck,
    Users,
    Wrench,
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {AppShell} from '@/components/layout/AppShell';
import {UavLoader} from '@/components/ui';
import {useAuth} from '@/providers/AuthContext';
import {useOperationsOverview} from '@/hooks/dashboard/useOperationsOverview';
import {
    useMyProviderFleet,
    useProviderOrders,
} from '@/hooks/marketplace/useMarketplace';
import {
    classifySellerOrderTab,
    normalizeUavStatusCardKey,
} from '@/forms/marketplace/marketplace-forms';
import {useCollection} from '@/hooks/useCollection';
import {useFleetTelemetry} from '@/hooks/uav/useTelemetry';
import {useI18n} from '@/providers/I18nContext';

const SHOP_SHORTCUTS = [
    {icon: ClipboardList, key: 'orders', href: '/operations/provider/orders'},
    {icon: PlaneTakeoff, key: 'fleet', href: '/operations/provider/fleet'},
    {icon: Users, key: 'pilots', href: '/operations/provider/pilots'},
    {icon: Boxes, key: 'listings', href: '/operations/provider/listings'},
    {icon: Gamepad2, key: 'simulation', href: '/operations/simulation', navKey: 'operationsNav.simulation'},
    {icon: CreditCard, key: 'wallet', href: '/operations/provider/wallet'},
    {icon: ShieldCheck, key: 'onboarding', href: '/operations/provider/onboarding'},
    {icon: CloudSun, key: 'weather', href: '/operations/weather', navKey: 'operationsNav.weather'},
    {icon: MapPinned, key: 'stations', href: '/operations/stations', navKey: 'operationsNav.stations'},
    {icon: Wrench, key: 'maintenance', href: '/operations/maintenance', navKey: 'operationsNav.maintenance'},
] as const;

export default function HomePage() {
    const router = useRouter();
    const {user, isAuthenticated, isLoading} = useAuth();
    const {t, formatNumber} = useI18n();
    const {summary, missions, error} = useOperationsOverview();

    const providerFleetQuery = useMyProviderFleet(isAuthenticated);
    const providerOrdersQuery = useProviderOrders(isAuthenticated);
    const uavsQuery = useCollection('uavs');
    const fleetTelemetry = useFleetTelemetry();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace('/operations/login');
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !isAuthenticated || !user) {
        return <UavLoader fullScreen label={t('opsMissions.overview.authenticating')}/>;
    }

    const providerOrders = providerOrdersQuery.data ?? [];
    const providerUavs = providerFleetQuery.data?.uavs ?? [];
    const internalUavs = uavsQuery.data ?? [];

    const todayIso = new Date().toISOString().slice(0, 10);
    const todayOrdersCount = providerOrders.length
        ? providerOrders.filter(o => (o.requestedDate ?? '').startsWith(todayIso)).length || providerOrders.length
        : (missions?.totalMissions ?? 0);

    const readyUavsCount = providerUavs.length
        ? providerUavs.filter(u => normalizeUavStatusCardKey(u.status) === 'READY').length
        : (summary?.availableUavs ?? internalUavs.filter(u => u.status === 'AVAILABLE').length);

    const inFlightOrdersCount = providerOrders.length
        ? providerOrders.filter(o => classifySellerOrderTab(o) === 'IN_FLIGHT').length
        : (missions?.inProgressMissions ?? internalUavs.filter(u => u.status === 'IN_USE').length);

    const pendingAcceptCount = providerOrders.length
        ? providerOrders.filter(o => classifySellerOrderTab(o) === 'PENDING_ACCEPT').length
        : (missions?.pendingMissions ?? 0);

    const fixes = fleetTelemetry.data ?? [];
    const activeFix = fixes.find(f => !f.stale) ?? fixes[0] ?? null;

    const topStats = [
        {
            label: t('opsMarketplace.home.todayOrders'),
            value: formatNumber(todayOrdersCount),
            icon: ClipboardList,
            href: '/operations/provider/orders',
            highlight: false,
        },
        {
            label: t('opsMarketplace.home.readyUavs'),
            value: formatNumber(readyUavsCount),
            icon: CheckCircle2,
            href: '/operations/provider/fleet',
            highlight: false,
        },
        {
            label: t('opsMarketplace.home.inFlightOrders'),
            value: formatNumber(inFlightOrdersCount),
            icon: PlaneTakeoff,
            href: '/operations/simulation',
            highlight: true,
        },
        {
            label: t('opsMarketplace.home.pendingAccept'),
            value: formatNumber(pendingAcceptCount),
            icon: Clock,
            href: '/operations/provider/orders',
            highlight: pendingAcceptCount > 0,
        },
    ];

    return (
        <AppShell activeResource="overview">
            <div className="flex w-full flex-col gap-5 p-4 sm:p-6">
                {error && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                        {t('opsMissions.overview.partialError')}
                    </div>
                )}

                {/* 4 Ô số liệu chính: Icon + Số -> Bấm sang trang chi tiết riêng */}
                <section
                    className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
                    aria-label={t('opsMissions.overview.summary.label')}
                >
                    {topStats.map(stat => {
                        const Icon = stat.icon;
                        return (
                            <Link
                                key={stat.label}
                                href={stat.href}
                                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-colors hover:border-primary"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                                            stat.highlight
                                                ? 'bg-primary text-white'
                                                : 'bg-uav-red-light text-primary'
                                        }`}
                                    >
                                        <Icon size={20} aria-hidden="true"/>
                                    </span>
                                    <ArrowUpRight
                                        size={16}
                                        className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="mt-3">
                                    <strong className="block text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                                        {stat.value}
                                    </strong>
                                    <span className="mt-0.5 block truncate text-xs font-semibold whitespace-nowrap text-slate-500">
                                        {stat.label}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </section>

                {/* Lưới Icon Thao tác nhanh kiểu Shopee (4-5 cột, nhãn 1-2 từ) */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <h2 className="m-0 text-base font-semibold text-slate-900">
                            {t('opsMarketplace.home.shortcutsTitle')}
                        </h2>
                        <Link
                            href="/operations/provider/orders"
                            className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-primary hover:underline"
                        >
                            <span>{t('opsMarketplace.home.viewDetails')}</span>
                            <ArrowUpRight size={13} aria-hidden="true"/>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {SHOP_SHORTCUTS.map(item => {
                            const Icon = item.icon;
                            const label = 'navKey' in item && item.navKey
                                ? t(item.navKey)
                                : t(`opsMarketplace.studio.tabs.${item.key}`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-center transition-colors hover:border-primary hover:bg-uav-red-light/50"
                                >
                                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-uav-red-light text-primary transition-transform group-hover:scale-105">
                                        <Icon size={20} aria-hidden="true"/>
                                    </span>
                                    <span className="max-w-full truncate text-xs font-semibold whitespace-nowrap text-slate-800 group-hover:text-primary">
                                        {label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* Khối tóm tắt Telemetry trực tiếp gọn nhẹ + liên kết sang trang chi tiết */}
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-uav-red-light text-primary">
                            <Crosshair size={20} aria-hidden="true"/>
                        </span>
                        <div>
                            <h3 className="m-0 text-sm font-semibold text-slate-900">
                                {t('opsMissions.overview.hud.liveCount')}:{' '}
                                <span className="tabular-nums text-primary">
                                    {formatNumber(fixes.filter(f => !f.stale).length)}
                                </span>
                            </h3>
                            <p className="m-0 mt-0.5 text-xs text-slate-500">
                                {activeFix
                                    ? `${t('opsMissions.overview.hud.battery')}: ${activeFix.batteryPct ?? '—'}% · ${t('opsMissions.overview.hud.gnss')}: ${activeFix.rtkStatus ?? '—'}`
                                    : t('opsMissions.overview.hud.noTelemetry')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/operations/simulation"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-primary px-4 text-xs font-semibold whitespace-nowrap text-white hover:bg-primary-hover"
                        >
                            <Gamepad2 size={15} aria-hidden="true"/>
                            {t('operationsNav.simulation')}
                        </Link>
                        <Link
                            href="/operations/uavs"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-slate-200 px-3.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                        >
                            {t('opsMissions.overview.hud.openFleet')}
                        </Link>
                    </div>
                </section>
            </div>
        </AppShell>
    );
}
