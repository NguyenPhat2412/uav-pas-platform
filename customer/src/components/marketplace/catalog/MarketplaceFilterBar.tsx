'use client';

import {ArrowUpDown, Search} from 'lucide-react';
import {
    LISTING_SORT_OPTIONS,
    LISTING_TYPE_OPTIONS,
    PRICING_MODEL_OPTIONS,
} from '@/forms/marketplace/marketplace-forms';
import {missionTypes} from '@/forms/mission/mission-form';
import {displayLabel} from '@/lib/presentation';
import type {ListingSortOption, ListingType, PricingModel} from '@/types/marketplace/marketplace.types';
import type {MissionType} from '@/types/mission/mission.types';

export function MarketplaceFilterBar({
    totalElements,
    keyword,
    listingType,
    missionType,
    pricingModel,
    province,
    sortBy,
    onKeywordChange,
    onListingTypeChange,
    onMissionTypeChange,
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
    onKeywordChange: (val: string) => void;
    onListingTypeChange: (val: ListingType | '') => void;
    onMissionTypeChange: (val: MissionType | '') => void;
    onPricingModelChange: (val: PricingModel | '') => void;
    onProvinceChange: (val: string) => void;
    onSortByChange: (val: ListingSortOption) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chọn nhanh hình thức thuê">
                    <button
                        type="button"
                        onClick={() => onListingTypeChange('')}
                        className={`h-8 rounded-full px-3.5 text-xs font-bold transition-colors ${
                            listingType === '' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                        }`}
                    >
                        Tất cả gói ({totalElements})
                    </button>
                    {LISTING_TYPE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onListingTypeChange(opt.value)}
                            className={`h-8 rounded-full px-3.5 text-xs font-bold transition-colors ${
                                listingType === opt.value ? 'bg-primary text-primary-foreground' : 'border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <ArrowUpDown size={13} className="text-slate-400" aria-hidden="true"/>
                    <span>Sắp xếp:</span>
                    <select
                        aria-label="Sắp xếp kết quả"
                        value={sortBy}
                        onChange={e => onSortByChange(e.target.value as ListingSortOption)}
                        className="h-8 rounded-control border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-primary"
                    >
                        {LISTING_SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 sm:grid-cols-2 lg:grid-cols-6">
                <label className="relative lg:col-span-2">
                    <span className="sr-only">Tìm kiếm dịch vụ hoặc thiết bị UAV</span>
                    <Search size={15} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"/>
                    <input
                        type="search"
                        value={keyword}
                        onChange={e => onKeywordChange(e.target.value)}
                        placeholder="Tìm LiDAR, RTK, quay 4K, phun/khảo sát..."
                        className="h-10 w-full rounded-control border border-slate-200 bg-white pr-3 pl-9 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                    />
                </label>
                <select
                    aria-label="Hình thức thuê"
                    value={listingType}
                    onChange={e => onListingTypeChange(e.target.value as ListingType | '')}
                    className="h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                >
                    <option value="">Tất cả hình thức thuê</option>
                    {LISTING_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select
                    aria-label="Nhóm nhiệm vụ"
                    value={missionType}
                    onChange={e => onMissionTypeChange(e.target.value as MissionType | '')}
                    className="h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                >
                    <option value="">Tất cả nhóm nhiệm vụ</option>
                    {missionTypes.map(type => <option key={type} value={type}>{displayLabel(type)}</option>)}
                </select>
                <select
                    aria-label="Cách tính phí"
                    value={pricingModel}
                    onChange={e => onPricingModelChange(e.target.value as PricingModel | '')}
                    className="h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-primary"
                >
                    <option value="">Tất cả đơn vị tính</option>
                    {PRICING_MODEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <input
                    type="text"
                    aria-label="Khu vực tỉnh thành"
                    value={province}
                    onChange={e => onProvinceChange(e.target.value)}
                    placeholder="Tỉnh / Thành phố..."
                    className="h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-primary"
                />
            </div>
        </div>
    );
}
