'use client';

import {useState} from 'react';
import {ArrowUpDown, Search, SlidersHorizontal, X} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import type {ListingSortOption, ListingType, PricingModel} from '@/types/marketplace.types';
import type {MissionType} from '@/types/mission.types';

export function MarketplaceFilterBar({
    totalElements,
    keyword,
    listingType,
    missionType,
    pricingModel,
    province,
    sortBy,
    compactMobileDrawer = false,
    onKeywordChange,
    onListingTypeChange,
    onPricingModelChange,
    onProvinceChange,
    onSortByChange,
}: {
    totalElements: number;
    keyword: string;
    listingType: ListingType | '';
    missionType: MissionType | '';
    pricingModel: PricingModel | '';
    province: string;
    sortBy: ListingSortOption;
    compactMobileDrawer?: boolean;
    onKeywordChange: (val: string) => void;
    onListingTypeChange: (val: ListingType | '') => void;
    onMissionTypeChange?: (val: MissionType | '') => void;
    onPricingModelChange: (val: PricingModel | '') => void;
    onProvinceChange: (val: string) => void;
    onSortByChange: (val: ListingSortOption) => void;
}) {
    const {t} = useI18n();
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const activeFilterCount = [
        listingType,
        missionType,
        pricingModel,
        province.trim(),
        sortBy !== 'featured' ? sortBy : '',
    ].filter(Boolean).length;

    const listingTypes: {value: ListingType; label: string}[] = [
        {value: 'FLIGHT_SERVICE', label: t('publicSite.catalog.typeFlightService')},
        {value: 'WET_LEASE', label: t('publicSite.catalog.typeWetLease')},
        {value: 'DRY_LEASE', label: t('publicSite.catalog.typeDryLease')},
    ];

    const pricingModels: {value: PricingModel; label: string}[] = [
        {value: 'PER_HOUR', label: t('publicSite.catalog.unitHour')},
        {value: 'PER_DAY', label: t('publicSite.catalog.unitDay')},
        {value: 'PER_HECTARE', label: t('publicSite.catalog.unitHectare')},
        {value: 'PER_PACKAGE', label: t('publicSite.catalog.unitPackage')},
    ];

    const sortOptions: {value: ListingSortOption; label: string}[] = [
        {value: 'featured', label: t('publicSite.catalog.sortFeatured')},
        {value: 'rating', label: t('publicSite.catalog.sortRating')},
        {value: 'price_asc', label: t('publicSite.catalog.sortPriceAsc')},
        {value: 'price_desc', label: t('publicSite.catalog.sortPriceDesc')},
    ];

    const hideOnMobile = compactMobileDrawer && !mobileFiltersOpen;

    return (
        <div className="space-y-3">
            {compactMobileDrawer && (
                <div className="flex items-center gap-2 sm:hidden">
                    <label className="relative flex-1">
                        <span className="sr-only">{t('common.search')}</span>
                        <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                        <input
                            type="search"
                            value={keyword}
                            onChange={e => onKeywordChange(e.target.value)}
                            placeholder={t('publicSite.catalog.searchPlaceholder')}
                            className="h-10 w-full rounded-control border border-slate-200 bg-white pr-3 pl-9 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                        />
                    </label>
                    <button
                        type="button"
                        aria-expanded={mobileFiltersOpen}
                        aria-controls="marketplace-filter-drawer-panel"
                        onClick={() => setMobileFiltersOpen(prev => !prev)}
                        className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-control border px-3 text-xs font-bold whitespace-nowrap transition-colors ${
                            mobileFiltersOpen || activeFilterCount > 0
                                ? 'border-primary bg-uav-red-light text-primary'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-primary'
                        }`}
                    >
                        {mobileFiltersOpen ? <X size={14} aria-hidden="true"/> : <SlidersHorizontal size={14} aria-hidden="true"/>}
                        <span>{t('marketplaceShop.mobileFilterToggle')}</span>
                        {activeFilterCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white tabular-nums">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

            <div
                id="marketplace-filter-drawer-panel"
                className={hideOnMobile ? 'hidden space-y-3 sm:block' : 'space-y-3'}
            >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('publicSite.catalog.allListingTypes')}>
                        <button
                            type="button"
                            onClick={() => onListingTypeChange('')}
                            className={`h-8 cursor-pointer rounded-control px-3.5 text-xs font-bold transition-colors ${
                                listingType === '' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                            }`}
                        >
                            {t('publicSite.catalog.allPackages', {count: totalElements})}
                        </button>
                        {listingTypes.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onListingTypeChange(opt.value)}
                                className={`h-8 cursor-pointer rounded-control px-3.5 text-xs font-bold transition-colors ${
                                    listingType === opt.value ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <ArrowUpDown size={13} className="text-slate-400" aria-hidden="true"/>
                        <span>{t('publicSite.catalog.sortBy')}</span>
                        <select
                            aria-label={t('publicSite.catalog.sortBy')}
                            value={sortBy}
                            onChange={e => onSortByChange(e.target.value as ListingSortOption)}
                            className="h-8 rounded-control border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-panel border border-slate-200 bg-slate-50/80 p-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    <label className={`relative lg:col-span-2 ${compactMobileDrawer ? 'hidden sm:block' : ''}`}>
                        <span className="sr-only">{t('common.search')}</span>
                        <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                        <input
                            type="search"
                            value={keyword}
                            onChange={e => onKeywordChange(e.target.value)}
                            placeholder={t('publicSite.catalog.searchPlaceholder')}
                            className="h-10 w-full rounded-control border border-slate-200 bg-white pr-3 pl-9 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                        />
                    </label>
                    <select
                        aria-label={t('publicSite.catalog.allPricingModels')}
                        value={pricingModel}
                        onChange={e => onPricingModelChange(e.target.value as PricingModel | '')}
                        className="h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                    >
                        <option value="">{t('publicSite.catalog.allPricingModels')}</option>
                        {pricingModels.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <input
                        type="text"
                        value={province}
                        onChange={e => onProvinceChange(e.target.value)}
                        placeholder={t('publicSite.catalog.provincePlaceholder')}
                        aria-label={t('publicSite.catalog.provincePlaceholder')}
                        className="h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                    />
                    {compactMobileDrawer && mobileFiltersOpen && (
                        <button
                            type="button"
                            onClick={() => setMobileFiltersOpen(false)}
                            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-control bg-primary px-4 text-xs font-bold text-primary-foreground sm:hidden"
                        >
                            {t('marketplaceShop.mobileFilterApply', {count: totalElements})}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
