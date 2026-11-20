'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
    BarChart3,
    CloudSun,
    CreditCard,
    FolderKanban,
    PackageSearch,
    Plane,
    PlaneTakeoff,
    ReceiptText,
    Search,
    Store,
    type LucideIcon,
} from 'lucide-react';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {CustomerShopHeroBanner} from '@/components/marketplace/shop/CustomerShopHeroBanner';
import {OrderStatusBar} from '@/components/mission/customer/OrderStatusBar';
import {Alert, Button} from '@/components/ui';
import {summarizeOrdersFromMissions} from '@/forms/project/project-form';
import {usePublicListings} from '@/hooks/marketplace/useMarketplace';
import {useMissions} from '@/hooks/mission/useCustomerMissions';
import {useCustomerProjects, useOrderSummary} from '@/hooks/project/useCustomerProjects';
import {useForecastTimeline} from '@/hooks/weather/useWeather';
import {useMapConfig} from '@/lib/map-config';
import {useI18n} from '@/providers/I18nContext';
import {weatherTimelineForDay} from '@/utils/weather/flight-window';

export default function CustomerShopeeHome() {
    return (
        <PageGuard>
            <CustomerShopeeHomeBody/>
        </PageGuard>
    );
}

function CustomerShopeeHomeBody() {
    const {t} = useI18n();
    const router = useRouter();
    const {config} = useMapConfig();
    const [searchText, setSearchText] = useState('');
    const [baseDate] = useState(() => new Date());

    const times = weatherTimelineForDay(0, baseDate).slice(0, 1);
    const point = {
        lat: Math.round(config.defaultCenter[0] * 1e4) / 1e4,
        lng: Math.round(config.defaultCenter[1] * 1e4) / 1e4,
    };
    const weatherSlot = useForecastTimeline(point, times)[0];
    const weatherData = weatherSlot?.data;

    const orderSummaryQuery = useOrderSummary();
    const missionsQuery = useMissions('', 0);
    const projectsQuery = useCustomerProjects(0, '', 20);
    const featuredQuery = usePublicListings({sortBy: 'featured', page: 0, size: 4});

    const fallbackSummary = summarizeOrdersFromMissions(missionsQuery.data?.content ?? []);
    const inFlightCount = orderSummaryQuery.isSuccess
        ? orderSummaryQuery.data.inFlight
        : fallbackSummary.inFlight;
    const projectCount = projectsQuery.isSuccess ? projectsQuery.data.totalElements : null;
    const featured = featuredQuery.data?.content ?? [];

    const flyable = weatherData?.clearance === 'GO';
    const weatherTemp =
        weatherData?.temperatureC != null ? `${Math.round(weatherData.temperatureC)}°` : '';
    const weatherStatus = weatherData
        ? flyable
            ? t('marketplaceShop.homeFlyable')
            : t('marketplaceShop.homeCaution')
        : '—';

    const quickItems: { href: string; label: string; icon: LucideIcon }[] = [
        {href: '/customer/services', label: t('marketplaceShop.homeShop'), icon: Store},
        {href: '/customer/projects', label: t('marketplaceShop.homeProjects'), icon: FolderKanban},
        {href: '/customer/missions', label: t('marketplaceShop.homeOrders'), icon: ReceiptText},
        {href: '/customer/weather', label: t('marketplaceShop.homeWeather'), icon: CloudSun},
        {href: '/customer/billing', label: t('marketplaceShop.homeBilling'), icon: CreditCard},
        {href: '/customer/dashboard/analytics', label: t('marketplaceShop.homeViewDetails'), icon: BarChart3},
    ];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchText.trim();
        router.push(q ? `/customer/services?q=${encodeURIComponent(q)}` : '/customer/services');
    };

    return (
        <div className="flex flex-1 flex-col gap-4 bg-background p-3.5 sm:p-5">
            {/* Search Bar + Single Primary CTA */}
            <form
                onSubmit={handleSearch}
                className="flex flex-wrap items-center gap-2.5 rounded-panel border border-slate-200 bg-card p-3"
            >
                <label className="relative min-w-[200px] flex-1">
                    <span className="sr-only">{t('common.search')}</span>
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"/>
                    <input
                        type="search"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        placeholder={t('marketplaceShop.searchPlaceholder')}
                        className="h-11 w-full rounded-control border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-900 outline-none focus:border-primary"
                    />
                </label>
                <Link
                    href="/customer/services"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                    {t('marketplaceShop.subscribeForProject')}
                </Link>
            </form>

            {/* 3 Compact Live Icon Widgets: Weather · Active Flights · Projects */}
            <section className="grid grid-cols-3 gap-2 sm:gap-3">
                <Link
                    href="/customer/weather"
                    className="flex min-w-0 flex-col justify-between gap-1.5 rounded-panel border border-slate-200 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-slate-50 sm:p-4"
                >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary">
                        {flyable ? <PlaneTakeoff size={16} aria-hidden="true"/> : <CloudSun size={16} aria-hidden="true"/>}
                    </span>
                    {weatherSlot?.isPending ? (
                        <span className="mt-1 h-5 w-16 animate-pulse rounded bg-slate-100"/>
                    ) : (
                        <span className="mt-1 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 tabular-nums">
                            {weatherTemp && (
                                <strong className="text-lg leading-none font-extrabold text-slate-900 sm:text-xl">
                                    {weatherTemp}
                                </strong>
                            )}
                            <span className="text-xs leading-tight font-bold text-slate-800 sm:text-sm">
                                {weatherStatus}
                            </span>
                        </span>
                    )}
                    <span className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-500 sm:text-xs">
                        {t('marketplaceShop.homeWeather')}
                    </span>
                </Link>

                <Link
                    href="/customer/missions?group=IN_FLIGHT"
                    className="flex min-w-0 flex-col justify-between gap-1.5 rounded-panel border border-slate-200 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-slate-50 sm:p-4"
                >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary">
                        <Plane size={16} aria-hidden="true"/>
                    </span>
                    {missionsQuery.isLoading && orderSummaryQuery.isLoading ? (
                        <span className="mt-1 h-5 w-10 animate-pulse rounded bg-slate-100"/>
                    ) : (
                        <strong className="mt-1 block text-xl leading-none font-extrabold text-primary tabular-nums sm:text-2xl">
                            {inFlightCount}
                        </strong>
                    )}
                    <span className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-500 sm:text-xs">
                        {t('marketplaceShop.homeActiveFlights')}
                    </span>
                </Link>

                <Link
                    href="/customer/projects"
                    className="flex min-w-0 flex-col justify-between gap-1.5 rounded-panel border border-slate-200 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-slate-50 sm:p-4"
                >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary">
                        <FolderKanban size={16} aria-hidden="true"/>
                    </span>
                    {projectsQuery.isLoading ? (
                        <span className="mt-1 h-5 w-10 animate-pulse rounded bg-slate-100"/>
                    ) : (
                        <strong className="mt-1 block text-xl leading-none font-extrabold text-slate-900 tabular-nums sm:text-2xl">
                            {projectCount != null ? projectCount : '—'}
                        </strong>
                    )}
                    <span className="line-clamp-2 text-[11px] leading-tight font-medium text-slate-500 sm:text-xs">
                        {t('marketplaceShop.homeProjects')}
                    </span>
                </Link>
            </section>

            {/* Shopee 5-Icon Order Status Strip */}
            <OrderStatusBar linkMode/>

            {/* Hero Carousel + Project Subscription Card */}
            <CustomerShopHeroBanner/>

            {/* 6-Icon Quick Access Grid */}
            <section className="grid grid-cols-3 gap-2 rounded-panel border border-slate-200 bg-card p-3 sm:grid-cols-6">
                {quickItems.map(item => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className="group flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-control px-1 py-1.5 text-center transition-transform duration-150 hover:bg-slate-50 active:scale-[0.97] motion-reduce:transition-none"
                        >
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                <Icon size={19} strokeWidth={1.85} aria-hidden="true"/>
                            </span>
                            <span className="line-clamp-2 text-center text-[11px] leading-tight font-medium text-slate-700 sm:text-xs sm:leading-4">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </section>

            {/* Featured Services Grid (4 States) */}
            <section className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-0.5">
                    <h2 className="m-0 whitespace-nowrap text-base font-semibold text-slate-900">
                        {t('marketplaceShop.homeFeaturedTitle')}
                    </h2>
                    <Link
                        href="/customer/services"
                        className="text-xs font-bold whitespace-nowrap text-primary hover:underline"
                    >
                        {t('dashboard.viewAll')}
                    </Link>
                </div>

                {featuredQuery.isLoading ? (
                    <div role="status" aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[0, 1, 2, 3].map(idx => (
                            <div key={idx} className="overflow-hidden rounded-panel border border-slate-200 bg-card">
                                <div className="aspect-[4/3] w-full animate-pulse bg-slate-100"/>
                                <div className="space-y-2 p-3.5">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100"/>
                                    <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100"/>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : featuredQuery.isError ? (
                    <Alert variant="error" role="alert" className="flex flex-wrap items-center justify-between gap-3">
                        <span>{t('errorPage.detail')}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => void featuredQuery.refetch()}>
                            {t('common.retry')}
                        </Button>
                    </Alert>
                ) : featured.length === 0 ? (
                    <div role="status" className="flex flex-col items-center justify-center gap-2 rounded-panel border border-slate-200 bg-card p-8 text-center">
                        <PackageSearch size={24} className="text-primary" aria-hidden="true"/>
                        <p className="m-0 text-xs text-slate-500">{t('publicSite.catalog.emptyDefault')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {featured.map(item => (
                            <MarketplaceListingCard key={item.id} item={item} mode="portal"/>
                        ))}
                    </div>
                )}
            </section>

            <p className="m-0 pt-1 text-center text-xs text-slate-500">
                {t('marketplaceShop.illustrativeFooterNote')}
            </p>
        </div>
    );
}
