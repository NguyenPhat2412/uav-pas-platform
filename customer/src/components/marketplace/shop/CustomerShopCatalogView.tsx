'use client';

import {useEffect, useState} from 'react';
import {ArrowUpDown, MapPin, PackageSearch, RotateCcw, Search} from 'lucide-react';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {CustomerShopCategoryStrip} from '@/components/marketplace/shop/CustomerShopCategoryStrip';
import {CustomerShopHeroBanner} from '@/components/marketplace/shop/CustomerShopHeroBanner';
import {Alert, Button} from '@/components/ui';
import {usePublicListings} from '@/hooks/marketplace/useMarketplace';
import {useI18n} from '@/providers/I18nContext';
import type {ListingSortOption} from '@/types/marketplace/marketplace.types';
import type {MissionType} from '@/types/mission/mission.types';

export function CustomerShopCatalogView() {
    const {t} = useI18n();
    const [searchInput, setSearchInput] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [missionType, setMissionType] = useState<MissionType | ''>('');
    const [province, setProvince] = useState('');
    const [sortBy, setSortBy] = useState<ListingSortOption>('featured');
    const [page, setPage] = useState(0);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedQuery(searchInput.trim());
            setPage(0);
        }, 250);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const query = usePublicListings({
        keyword: debouncedQuery,
        q: debouncedQuery,
        missionType,
        category: missionType || undefined,
        province: province.trim() || undefined,
        sortBy,
        page,
        size: 12,
    });

    const listings = query.data?.content ?? [];
    const totalElements = query.data?.totalElements ?? 0;
    const totalPages = query.data?.totalPages ?? 0;
    const hasFilters = Boolean(searchInput.trim() || missionType || province.trim() || sortBy !== 'featured');

    const resetAll = () => {
        setSearchInput('');
        setDebouncedQuery('');
        setMissionType('');
        setProvince('');
        setSortBy('featured');
        setPage(0);
    };

    const sortOptions: { value: ListingSortOption; label: string }[] = [
        {value: 'featured', label: t('publicSite.catalog.sortFeatured')},
        {value: 'rating', label: t('publicSite.catalog.sortRating')},
        {value: 'price_asc', label: t('publicSite.catalog.sortPriceAsc')},
        {value: 'price_desc', label: t('publicSite.catalog.sortPriceDesc')},
    ];

    return (
        <div className="flex flex-1 flex-col gap-4 bg-background p-3.5 sm:p-5">
            {/* Search & Province Filter Bar */}
            <div className="grid grid-cols-1 gap-2.5 rounded-panel border border-slate-200 bg-card p-3 sm:grid-cols-12">
                <label className="relative sm:col-span-6">
                    <span className="sr-only">{t('common.search')}</span>
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"/>
                    <input
                        type="search"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder={t('marketplaceShop.searchPlaceholder')}
                        className="h-11 w-full rounded-control border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-900 outline-none focus:border-primary"
                    />
                </label>

                <label className="relative sm:col-span-3">
                    <span className="sr-only">{t('publicSite.catalog.provincePlaceholder')}</span>
                    <MapPin size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                    <input
                        type="text"
                        value={province}
                        onChange={e => {
                            setProvince(e.target.value);
                            setPage(0);
                        }}
                        placeholder={t('publicSite.catalog.provincePlaceholder')}
                        className="h-11 w-full rounded-control border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none focus:border-primary"
                    />
                </label>

                <label className="relative sm:col-span-3">
                    <span className="sr-only">{t('publicSite.catalog.sortBy')}</span>
                    <ArrowUpDown size={14} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                    <select
                        value={sortBy}
                        aria-label={t('publicSite.catalog.sortBy')}
                        onChange={e => {
                            setSortBy(e.target.value as ListingSortOption);
                            setPage(0);
                        }}
                        className="h-11 w-full rounded-control border border-slate-200 bg-white pr-3 pl-8 text-xs font-semibold text-slate-800 outline-none focus:border-primary"
                    >
                        {sortOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <CustomerShopHeroBanner/>

            <CustomerShopCategoryStrip
                active={missionType}
                onSelect={val => {
                    setMissionType(val);
                    setPage(0);
                }}
            />

            {/* Section Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-2">
                    <h2 className="m-0 whitespace-nowrap text-base font-semibold text-slate-900">
                        {t('marketplaceShop.recommendedTitle')}
                    </h2>
                    <span className="rounded-badge bg-uav-red-light px-2 py-0.5 text-xs font-bold whitespace-nowrap tabular-nums text-primary">
                        {totalElements}
                    </span>
                </div>
                {hasFilters && (
                    <button
                        type="button"
                        onClick={resetAll}
                        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold whitespace-nowrap text-primary transition-colors hover:bg-slate-50"
                    >
                        <RotateCcw size={13} aria-hidden="true"/>
                        <span>{t('publicSite.catalog.resetFilters')}</span>
                    </button>
                )}
            </div>

            {/* 4-State Grid: Loading · Error · Empty · Data */}
            {query.isLoading ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label={t('common.loading')}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {[0, 1, 2, 3].map(idx => (
                        <div key={idx} className="overflow-hidden rounded-panel border border-slate-200 bg-card">
                            <div className="aspect-[4/3] w-full animate-pulse bg-slate-100"/>
                            <div className="space-y-2.5 p-3.5">
                                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100"/>
                                <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100"/>
                                <div className="h-5 w-2/5 animate-pulse rounded bg-slate-100"/>
                                <div className="h-9 w-full animate-pulse rounded-control bg-slate-100"/>
                            </div>
                        </div>
                    ))}
                </div>
            ) : query.isError ? (
                <Alert variant="error" role="alert" className="flex flex-wrap items-center justify-between gap-3">
                    <span>{t('errorPage.detail')}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
                        {t('common.retry')}
                    </Button>
                </Alert>
            ) : listings.length === 0 ? (
                <div role="status" className="flex flex-col items-center justify-center gap-3 rounded-panel border border-slate-200 bg-card px-5 py-12 text-center">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-uav-red-light text-primary">
                        <PackageSearch size={24} aria-hidden="true"/>
                    </span>
                    <p className="m-0 max-w-md text-sm font-medium text-slate-700">
                        {hasFilters ? t('publicSite.catalog.emptyFiltered') : t('publicSite.catalog.emptyDefault')}
                    </p>
                    {hasFilters && (
                        <Button type="button" variant="outline" size="sm" onClick={resetAll}>
                            {t('publicSite.catalog.resetFilters')}
                        </Button>
                    )}
                </div>
            ) : (
                <div
                    className={`grid grid-cols-1 gap-4 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-4 ${
                        query.isPlaceholderData ? 'opacity-65' : 'opacity-100'
                    }`}
                >
                    {listings.map(item => (
                        <MarketplaceListingCard key={item.id} item={item} mode="portal"/>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <nav
                    aria-label={t('missions.pagination')}
                    className="flex items-center justify-center gap-2.5 pt-2 tabular-nums"
                >
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page <= 0 || query.isFetching}
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                    >
                        {t('publicSite.catalog.prevPage')}
                    </Button>
                    <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
                        {page + 1} / {totalPages}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page + 1 >= totalPages || query.isFetching}
                        onClick={() => setPage(p => p + 1)}
                    >
                        {t('publicSite.catalog.nextPage')}
                    </Button>
                </nav>
            )}
        </div>
    );
}
