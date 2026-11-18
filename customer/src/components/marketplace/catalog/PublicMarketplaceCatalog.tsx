'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {CheckCircle2, Lock, ShieldCheck, Sparkles} from 'lucide-react';
import {MarketplaceFilterBar} from '@/components/marketplace/catalog/MarketplaceFilterBar';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {usePublicListings} from '@/hooks/marketplace/useMarketplace';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';
import type {ListingSortOption, ListingType, PricingModel} from '@/types/marketplace/marketplace.types';
import type {MissionType} from '@/types/mission/mission.types';

export function PublicMarketplaceCatalog({mode = 'public'}: { mode?: 'public' | 'portal' }) {
    const {t} = useI18n();
    const {rfqEnabled, invoiceDueDays} = useSiteInfo();
    const [keyword, setKeyword] = useState('');
    const [listingType, setListingType] = useState<ListingType | ''>('');
    const [missionType, setMissionType] = useState<MissionType | ''>('');
    const [pricingModel, setPricingModel] = useState<PricingModel | ''>('');
    const [province, setProvince] = useState('');
    const [sortBy, setSortBy] = useState<ListingSortOption>('featured');
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const type = params.get('type') as ListingType | null;
        const mission = params.get('mission') as MissionType | null;
        const pricing = params.get('pricing') as PricingModel | null;
        const prov = params.get('province');
        const sort = params.get('sort') as ListingSortOption | null;
        if (q) setKeyword(q);
        if (type) setListingType(type);
        if (mission) setMissionType(mission);
        if (pricing) setPricingModel(pricing);
        if (prov) setProvince(prov);
        if (sort) setSortBy(sort);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const sync = (k: string, v: string) => (v ? params.set(k, v) : params.delete(k));
        sync('q', keyword);
        sync('type', listingType);
        sync('mission', missionType);
        sync('pricing', pricingModel);
        sync('province', province);
        sync('sort', sortBy === 'featured' ? '' : sortBy);
        const qs = params.toString();
        window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    }, [keyword, listingType, missionType, pricingModel, province, sortBy]);

    const query = usePublicListings({keyword, listingType, missionType, pricingModel, province, sortBy, page, size: 12});
    const listings = query.data?.content ?? [];
    const totalElements = query.data?.totalElements ?? 0;
    const totalPages = query.data?.totalPages ?? 0;
    const hasFilters = Boolean(keyword || listingType || missionType || pricingModel || province || sortBy !== 'featured');

    const resetFilters = () => {
        setKeyword('');
        setListingType('');
        setMissionType('');
        setPricingModel('');
        setProvince('');
        setSortBy('featured');
        setPage(0);
    };

    return (
        <section className={mode === 'public' ? 'border-b border-slate-200 bg-white py-14 sm:py-18' : 'border-b border-slate-200 bg-white p-4 sm:p-5'}>
            <div className={mode === 'public' ? 'mx-auto w-full max-w-[1380px] space-y-6 px-5 sm:px-8 lg:px-12' : 'space-y-5'}>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-3xl space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                            <Sparkles size={14} aria-hidden="true"/>
                            {t('publicSite.catalog.eyebrow')}
                        </span>
                        <h2 className="m-0 text-xl font-black tracking-tight text-slate-900 sm:text-3xl">
                            {t('publicSite.catalog.title')}
                        </h2>
                        <p className="m-0 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {t('publicSite.catalog.subtitle')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                        {rfqEnabled && (
                            <Link
                                href="/customer/missions/create?rfq=1"
                                className="inline-flex min-h-10 items-center justify-center rounded-control border border-slate-300 bg-white px-4 text-xs font-bold whitespace-nowrap text-slate-800 transition-colors hover:bg-slate-50"
                            >
                                {t('publicSite.catalog.rfqButton')}
                            </Link>
                        )}
                        <Link
                            href="/customer/provider/onboarding"
                            className="inline-flex min-h-10 items-center justify-center rounded-control bg-slate-900 px-4 text-xs font-bold whitespace-nowrap text-white transition-colors hover:bg-slate-800"
                        >
                            {t('publicSite.catalog.becomeSellerButton')}
                        </Link>
                    </div>
                </div>

                <div className="uav-bezel">
                    <div className="uav-bezel-core grid grid-cols-1 gap-2.5 px-4 py-3 text-xs text-slate-800 tabular-nums sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                            <Lock size={15} className="shrink-0 text-slate-900" aria-hidden="true"/>
                            <span><strong>{t('publicSite.catalog.escrowPillStrong')}</strong> {t('publicSite.catalog.escrowPillText')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0 text-slate-900" aria-hidden="true"/>
                            <span><strong>{t('publicSite.catalog.kycPillStrong')}</strong> {t('publicSite.catalog.kycPillText')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                            <span><strong>{t('publicSite.catalog.slaPillStrong')}</strong> {t('publicSite.catalog.slaPillText', {days: invoiceDueDays})}</span>
                        </div>
                    </div>
                </div>

                <MarketplaceFilterBar
                    totalElements={totalElements}
                    keyword={keyword}
                    listingType={listingType}
                    missionType={missionType}
                    pricingModel={pricingModel}
                    province={province}
                    sortBy={sortBy}
                    onKeywordChange={val => { setKeyword(val); setPage(0); }}
                    onListingTypeChange={val => { setListingType(val); setPage(0); }}
                    onMissionTypeChange={val => { setMissionType(val); setPage(0); }}
                    onPricingModelChange={val => { setPricingModel(val); setPage(0); }}
                    onProvinceChange={val => { setProvince(val); setPage(0); }}
                    onSortByChange={val => { setSortBy(val); setPage(0); }}
                />

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 tabular-nums">
                    <span>
                        {t('publicSite.catalog.pageIndicator', {page: Math.min(page + 1, Math.max(1, totalPages)), total: Math.max(1, totalPages), count: totalElements})}
                    </span>
                    {hasFilters && (
                        <button type="button" onClick={resetFilters} className="cursor-pointer font-bold text-primary hover:underline">
                            {t('publicSite.catalog.resetFilters')}
                        </button>
                    )}
                </div>

                {query.isLoading ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label={t('common.loading')}>
                        {[0, 1, 2].map(idx => (
                            <div key={idx} className="h-80 animate-pulse rounded-panel border border-slate-200 bg-slate-100/70"/>
                        ))}
                    </div>
                ) : query.isError ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-rose-200 bg-rose-50 p-4 text-xs text-danger" role="alert">
                        <span>{t('errorPage.detail')}</span>
                        <button type="button" onClick={() => void query.refetch()} className="min-h-8 cursor-pointer rounded-control border border-rose-300 bg-white px-3 py-1.5 font-semibold whitespace-nowrap text-danger">
                            {t('common.retry')}
                        </button>
                    </div>
                ) : listings.length === 0 ? (
                    <div className="uav-bezel" role="status">
                        <div className="uav-bezel-core p-8 text-center">
                            <p className="m-0 text-sm font-semibold text-slate-900">
                                {hasFilters ? t('publicSite.catalog.emptyFiltered') : t('publicSite.catalog.emptyDefault')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {listings.map(item => <MarketplaceListingCard key={item.id} item={item} mode={mode}/>)}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2 tabular-nums">
                        <button
                            type="button"
                            disabled={page <= 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="min-h-9 cursor-pointer rounded-control border border-slate-200 bg-white px-3.5 text-xs font-semibold whitespace-nowrap text-slate-800 disabled:opacity-40"
                        >
                            {t('publicSite.catalog.prevPage')}
                        </button>
                        <span className="text-xs font-semibold text-slate-600">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page + 1 >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="min-h-9 cursor-pointer rounded-control border border-slate-200 bg-white px-3.5 text-xs font-semibold whitespace-nowrap text-slate-800 disabled:opacity-40"
                        >
                            {t('publicSite.catalog.nextPage')}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
