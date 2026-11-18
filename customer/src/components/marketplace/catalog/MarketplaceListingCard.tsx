'use client';

import Link from 'next/link';
import {CheckCircle2, Clock3, MapPin, ShieldCheck, Star} from 'lucide-react';
import {scenes} from '@/components/marketing/UavPhoto';
import {formatVndCompact} from '@/forms/marketplace/marketplace-forms';
import {resolveListingBadge} from '@/forms/project/project-form';
import {useI18n} from '@/providers/I18nContext';
import type {ListingType, MarketplaceListing, PricingModel} from '@/types/marketplace/marketplace.types';

const MISSION_FALLBACK_PHOTOS: Record<string, { src: string; alt: string }> = {
    UAV_RENTAL: scenes.rentalFleet,
    AREA_INSPECTION: scenes.inspectionGrid,
    AERIAL_RECORDING: scenes.recordingCinema,
    DATA_COLLECTION: scenes.dataCorridor,
    SEARCH_AND_RESCUE: scenes.sarResponse,
};

export function resolveListingPhoto(listing: Pick<MarketplaceListing, 'coverImageUrl' | 'missionType' | 'title'>) {
    const customUrl = listing.coverImageUrl?.trim();
    if (customUrl && /^https?:\/\//i.test(customUrl)) {
        return {src: customUrl, alt: listing.title};
    }
    return MISSION_FALLBACK_PHOTOS[listing.missionType] ?? scenes.rentalFleet;
}

export function MarketplaceListingCard({
    item,
    mode = 'public',
}: {
    item: MarketplaceListing;
    mode?: 'public' | 'portal';
}) {
    const {t} = useI18n();
    const photo = resolveListingPhoto(item);
    const badge = resolveListingBadge(item);
    const detailHref = mode === 'portal' ? `/customer/services/${item.slug}` : `/services/${item.slug}`;
    const createHref = `/customer/services/${encodeURIComponent(item.slug)}?subscribe=1`;

    const typeText = (type: ListingType) => {
        if (type === 'WET_LEASE') return t('publicSite.catalog.typeWetLease');
        if (type === 'DRY_LEASE') return t('publicSite.catalog.typeDryLease');
        return t('publicSite.catalog.typeFlightService');
    };

    const unitText = (model: PricingModel) => {
        if (model === 'PER_DAY') return t('publicSite.catalog.unitDay');
        if (model === 'PER_HECTARE') return t('publicSite.catalog.unitHectare');
        if (model === 'PER_PACKAGE') return t('publicSite.catalog.unitPackage');
        return t('publicSite.catalog.unitHour');
    };

    const cleanTitle = item.title;

    return (
        <article className="group flex flex-col justify-between overflow-hidden rounded-panel border border-slate-200 bg-white shadow-2xs transition-shadow duration-200 hover:shadow-md">
            <div>
                <Link
                    href={detailHref}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-900"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent"/>
                    <div className="absolute top-2.5 right-2.5 left-2.5 flex flex-wrap items-center justify-between gap-1.5">
                        <span className="rounded-badge bg-slate-950/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                            {typeText(item.listingType)}
                        </span>
                        {badge.verified && (
                            <span className="inline-flex items-center gap-1 rounded-control bg-primary px-2 py-0.5 text-[11px] font-semibold text-white shadow-2xs">
                                <ShieldCheck size={12} aria-hidden="true"/>
                                {t('publicSite.catalog.verifiedPartner')}
                            </span>
                        )}
                    </div>
                </Link>

                <div className="space-y-2 p-3.5 pb-2.5">
                    <h3 className="m-0 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">
                        <Link href={detailHref} className="transition-colors hover:text-primary">
                            {cleanTitle}
                        </Link>
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                            <MapPin size={13} className="shrink-0 text-slate-400" aria-hidden="true"/>
                            {item.province}
                        </span>
                        {item.deliverySlaHours != null && (
                            <span className="inline-flex items-center gap-1">
                                <Clock3 size={13} className="shrink-0 text-slate-400" aria-hidden="true"/>
                                {item.deliverySlaHours}h
                            </span>
                        )}
                    </div>

                    <div className="flex items-baseline justify-between gap-2 pt-0.5 tabular-nums">
                        <div>
                            <span className="text-base font-bold text-primary">
                                {formatVndCompact(item.basePriceVnd)}
                            </span>
                            <span className="ml-1 text-[11px] text-slate-500">
                                / {unitText(item.pricingModel)} · {t('marketplaceShop.illustrative')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1 rounded-badge bg-uav-red-light px-2 py-0.5 text-[11px] font-semibold text-primary">
                            <CheckCircle2 size={12} aria-hidden="true"/>
                            {t('publicSite.catalog.verifiedPartner')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                            <Star size={12} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                            {badge.reviewCount > 0
                                ? `${badge.ratingAvg.toFixed(1)} (${badge.reviewCount})`
                                : t('publicSite.catalog.newListing')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100 px-3.5 pt-2.5 pb-3.5">
                <Link
                    href={mode === 'portal' ? detailHref : createHref}
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-control bg-primary px-3 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                    {t('marketplaceShop.subscribeForProject')}
                </Link>
            </div>
        </article>
    );
}
