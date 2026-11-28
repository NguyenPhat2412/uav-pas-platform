'use client';

import Link from 'next/link';
import {ArrowRight, PackageSearch} from 'lucide-react';
import {MarketplaceListingCard} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {Alert, Button} from '@/components/ui';
import {usePublicListings} from '@/hooks/useMarketplace';
import {useI18n} from '@/providers/I18nContext';

export function HomeFeaturedServicesSection() {
    const {t} = useI18n();
    const query = usePublicListings({sortBy: 'featured', page: 0, size: 4});
    const listings = query.data?.content ?? [];

    return (
        <section
            aria-labelledby="home-featured-heading"
            className="border-b border-slate-200 bg-white py-9 sm:py-11"
        >
            <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div className="space-y-1">
                        <h2 id="home-featured-heading" className="m-0 text-lg font-extrabold text-slate-900 sm:text-2xl">
                            {t('publicSite.homeRedesign.featuredTitle')}
                        </h2>
                        <p className="m-0 text-xs text-slate-600 sm:text-sm">
                            {t('publicSite.homeRedesign.featuredSubtitle')}
                        </p>
                    </div>
                    <Link
                        href="/services"
                        className="inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap text-primary hover:underline sm:text-sm"
                    >
                        <span>{t('publicSite.homeRedesign.featuredViewAll')}</span>
                        <ArrowRight size={14} aria-hidden="true"/>
                    </Link>
                </div>

                {query.isLoading ? (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label={t('common.loading')}
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        {[0, 1, 2, 3].map(idx => (
                            <div key={idx} className="overflow-hidden rounded-panel border border-slate-200 bg-white">
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
                    <div role="status" className="flex flex-col items-center justify-center gap-2.5 rounded-panel border border-slate-200 bg-slate-50 px-5 py-10 text-center">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-uav-red-light text-primary">
                            <PackageSearch size={22} aria-hidden="true"/>
                        </span>
                        <p className="m-0 text-sm font-medium text-slate-700">{t('publicSite.catalog.emptyDefault')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {listings.map(item => (
                            <MarketplaceListingCard key={item.id} item={item} mode="public"/>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
