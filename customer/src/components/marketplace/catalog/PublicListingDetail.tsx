'use client';

import {useState} from 'react';
import Link from 'next/link';
import {CheckCircle2, Lock, MapPin, ShieldCheck, Star} from 'lucide-react';
import {ListingBookingCalculator} from '@/components/marketplace/catalog/ListingBookingCalculator';
import {
    localizeOfficialListingTitle,
    resolveListingPhoto,
} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {ServiceCategoryIcon} from '@/components/marketplace/shop/ServiceCategoryIcon';
import {usePublicListingDetail} from '@/hooks/marketplace/useMarketplace';
import {resolveListingBadge, sanitizeMarketplaceText} from '@/forms/project/project-form';
import {iconNameForMissionType} from '@/lib/marketplace/service-categories';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {ListingType} from '@/types/marketplace/marketplace.types';

export function PublicListingDetail({slug}: { slug: string }) {
    const {t, locale} = useI18n();
    const [imgFailed, setImgFailed] = useState(false);
    const query = usePublicListingDetail(slug);
    const listing = query.data?.listing;
    const reviews = query.data?.reviews ?? [];

    const typeText = (type: ListingType) => {
        if (type === 'WET_LEASE') return t('publicSite.catalog.typeWetLease');
        if (type === 'DRY_LEASE') return t('publicSite.catalog.typeDryLease');
        return t('publicSite.catalog.typeFlightService');
    };

    const escrowSteps = [
        t('marketplaceShop.pubEscrowStep1'),
        t('marketplaceShop.pubEscrowStep2'),
        t('marketplaceShop.pubEscrowStep3'),
        t('marketplaceShop.pubEscrowStep4'),
    ];

    if (query.isLoading) {
        return (
            <div className="mx-auto max-w-[1200px] space-y-6 px-5 py-12 sm:px-8" role="status" aria-label={t('common.loading')}>
                <div className="h-8 w-1/3 animate-pulse rounded-lg bg-slate-200"/>
                <div className="h-64 animate-pulse rounded-3xl bg-slate-100"/>
                <div className="h-44 animate-pulse rounded-2xl bg-slate-100"/>
            </div>
        );
    }

    if (query.isError || !listing) {
        return (
            <div className="mx-auto max-w-[900px] px-5 py-16 text-center" role="alert">
                <h1 className="text-2xl font-black text-slate-900">{t('marketplaceShop.notFoundTitle')}</h1>
                <p className="mt-2 text-sm text-slate-600">{t('marketplaceShop.notFoundDesc')}</p>
                <Link
                    href="/services"
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-5 text-xs font-semibold whitespace-nowrap text-primary-foreground"
                >
                    {t('marketplaceShop.pubBackCatalog')}
                </Link>
            </div>
        );
    }

    const photo = resolveListingPhoto(listing, true);
    const badge = resolveListingBadge(listing);
    const displayTitle = localizeOfficialListingTitle(listing.title, locale);
    const listingReviewCount = reviews.length;
    const providerReviewCount = badge.reviewCount;

    return (
        <div className="bg-slate-50/60 py-10 sm:py-14">
            <div className="mx-auto max-w-[1260px] space-y-8 px-5 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                    <Link href="/services" className="whitespace-nowrap hover:text-primary">
                        {t('marketplaceShop.pubBackCatalog')}
                    </Link>
                    <span className="whitespace-nowrap">
                        {t('marketplaceShop.pubCategoryCode', {name: displayLabel(listing.missionType)})}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="space-y-6 lg:col-span-8">
                        <section className="overflow-hidden rounded-panel border border-slate-200 bg-card shadow-xs">
                            <div className="relative aspect-[21/9] w-full overflow-hidden bg-uav-red-light">
                                {!imgFailed && photo?.src ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.src}
                                            alt={photo.alt}
                                            onError={() => setImgFailed(true)}
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent"/>
                                    </>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-uav-red-light text-primary">
                                        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/85 shadow-2xs ring-1 ring-primary/15">
                                            <ServiceCategoryIcon name={iconNameForMissionType(listing.missionType)} size={34}/>
                                        </span>
                                    </div>
                                )}
                                <div className="absolute right-5 bottom-4 left-5 flex flex-wrap items-center justify-between gap-2">
                                    <span className="rounded-badge bg-slate-950/75 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white backdrop-blur-xs">
                                        {typeText(listing.listingType)}
                                    </span>
                                    {listing.featured ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold whitespace-nowrap text-white">
                                            <ShieldCheck size={14} aria-hidden="true"/>
                                            {t('publicSite.catalog.featuredPartner')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white ring-1 ring-white/20 backdrop-blur-xs">
                                            <CheckCircle2 size={14} aria-hidden="true"/>
                                            {t('publicSite.catalog.verifiedPartner')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 sm:p-8">
                                <h1 className="m-0 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                                    {displayTitle}
                                </h1>
                                {listing.summary && (
                                    <p className="mt-2 text-sm font-normal leading-relaxed text-muted">
                                        {sanitizeMarketplaceText(listing.summary)}
                                    </p>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-xs text-muted tabular-nums">
                                    <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-on-surface">
                                        <ShieldCheck size={15} className="text-primary" aria-hidden="true"/>
                                        {t('publicSite.catalog.verifiedPartner')}
                                    </span>
                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                        <MapPin size={14} aria-hidden="true"/>
                                        {listing.province} · {listing.serviceRadiusKm} km
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-amber-600">
                                        <Star size={14} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                        {listingReviewCount > 0
                                            ? `${badge.ratingAvg.toFixed(1)} (${listingReviewCount})`
                                            : providerReviewCount > 0
                                                ? t('marketplaceShop.providerRatingBadge', {
                                                      rating: badge.ratingAvg.toFixed(1),
                                                      count: providerReviewCount,
                                                  })
                                                : t('publicSite.catalog.newListing')}
                                    </span>
                                </div>

                                <div className="uav-bezel mt-5">
                                    <ol className="uav-bezel-core m-0 grid list-none grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                                        {escrowSteps.map(step => (
                                            <li key={step} className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-on-surface">
                                                <Lock size={13} className="shrink-0 text-on-surface" aria-hidden="true"/>
                                                <span className="line-clamp-2 leading-tight">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>

                                {listing.description && (
                                    <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
                                        <h2 className="text-sm font-semibold text-on-surface">
                                            {t('marketplaceShop.pubScopeHeading')}
                                        </h2>
                                        <p className="whitespace-pre-line text-sm leading-relaxed text-on-surface">
                                            {sanitizeMarketplaceText(listing.description)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-panel border border-slate-200 bg-card p-5">
                                <h2 className="text-sm font-semibold text-on-surface">{t('marketplaceShop.pubEquipmentHeading')}</h2>
                                <p className="mt-2 text-xs leading-relaxed text-muted">
                                    {listing.equipmentSpecs
                                        ? sanitizeMarketplaceText(listing.equipmentSpecs)
                                        : t('marketplaceShop.pubEquipmentDefault')}
                                </p>
                            </div>
                            <div className="rounded-panel border border-slate-200 bg-card p-5">
                                <h2 className="text-sm font-semibold text-on-surface">{t('marketplaceShop.deliverablesHeading')}</h2>
                                <p className="mt-2 text-xs leading-relaxed text-muted">
                                    {listing.deliverablesSummary
                                        ? sanitizeMarketplaceText(listing.deliverablesSummary)
                                        : t('marketplaceShop.pubDefaultDeliverable')}
                                </p>
                            </div>
                        </section>

                        <section className="rounded-panel border border-slate-200 bg-card p-6">
                            <h2 className="text-base font-semibold text-on-surface tabular-nums">
                                {t('marketplaceShop.reviewsHeading')} ({reviews.length})
                            </h2>
                            {reviews.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-500">
                                    {providerReviewCount > 0
                                        ? t('marketplaceShop.reviewsEmptyWithProviderRating', {
                                              rating: badge.ratingAvg.toFixed(1),
                                              count: providerReviewCount,
                                          })
                                        : t('marketplaceShop.reviewsEmpty')}
                                </p>
                            ) : (
                                <div className="mt-4 divide-y divide-slate-100">
                                    {reviews.map(rev => (
                                        <article key={rev.id} className="py-3.5 first:pt-0 last:pb-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <strong className="text-xs font-bold text-slate-900">{rev.customerName}</strong>
                                                <span className="inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap text-amber-600 tabular-nums">
                                                    <Star size={13} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                                    {rev.overallRating ?? 5}/5
                                                </span>
                                            </div>
                                            {rev.comment && (
                                                <p className="m-0 mt-1.5 text-xs leading-relaxed text-slate-600">
                                                    {sanitizeMarketplaceText(rev.comment)}
                                                </p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    <ListingBookingCalculator listing={listing}/>
                </div>
            </div>
        </div>
    );
}
