'use client';

import {useState} from 'react';
import Link from 'next/link';
import {CheckCircle2, Clock3, MapPin, Star} from 'lucide-react';
import {ServiceCategoryIcon} from '@/components/marketplace/shop/ServiceCategoryIcon';
import {formatVndCompact} from '@/forms/marketplace-forms';
import {resolveListingBadge, sanitizeMarketplaceName} from '@/forms/project-form';
import {trackAbEvent, useAbExperiment} from '@/lib/experiments/ab-experiments';
import {iconNameForMissionType} from '@/lib/marketplace/service-categories';
import {useI18n} from '@/providers/I18nContext';
import type {ListingType, MarketplaceListing, PricingModel} from '@/types/marketplace.types';

const BANNED_LOGO_IMAGE_PATTERN =
    /usgs-plum-island-team|data-collection-corridor|managed-ops-command|step-01-select-service|usgs-yosemite-preflight/i;

const OFFICIAL_TITLE_I18N: Record<string, {vi: string; ja: string}> = {
    'data collection': {vi: 'Thu thập dữ liệu địa không gian UAV', ja: 'UAV地理空間データ収集'},
    'aerial video recording': {vi: 'Ghi hình UAV trên không độ phân giải cao', ja: '高解像度UAV空撮動画'},
    'area inspection': {vi: 'Khảo sát & kiểm tra khu vực bằng UAV', ja: 'UAVエリア点検・測量'},
    '3d mapping': {vi: 'Lập bản đồ 3D & bình đồ trực giao UAV', ja: 'UAV 3Dマッピング・オルソ作成'},
    'equipment rental': {vi: 'Cho thuê thiết bị bay UAV chuyên dụng', ja: '業務用UAV機材レンタル'},
    'basic uav rental': {vi: 'Cho thuê thiết bị bay UAV tiêu chuẩn', ja: '標準UAV機材レンタル'},
};

const MISSION_FALLBACK_PHOTO: Record<string, string> = {
    AREA_INSPECTION: '/images/services/aerial-inspection-grid.webp',
    AERIAL_RECORDING: '/images/services/aerial-recording-cinema.webp',
    DATA_COLLECTION: '/images/solutions/infra-3d-survey.webp',
    EMERGENCY_SAR: '/images/solutions/sar-emergency-response.webp',
    AGRICULTURE_SPRAY: '/images/hero-slides/uav-hero-3.webp',
};

/** Localizes known English-only official platform titles when rendering Vietnamese or Japanese UI. */
export function localizeOfficialListingTitle(rawTitle: string, locale: string): string {
    const clean = sanitizeMarketplaceName(rawTitle);
    const mapped = OFFICIAL_TITLE_I18N[clean.trim().toLowerCase()];
    if (!mapped) return clean;
    if (locale === 'vi') return mapped.vi;
    if (locale === 'ja') return mapped.ja;
    return clean;
}

/**
 * Resolves a listing's cover image when present and free of third-party organization logos.
 * When `useMissionFallback` is true (EXP-3 treatment), maps missing covers to curated mission photography.
 */
export function resolveListingPhoto(
    listing: Pick<MarketplaceListing, 'coverImageUrl' | 'missionType' | 'title'>,
    useMissionFallback = false,
): { src: string; alt: string } | null {
    const customUrl = listing.coverImageUrl?.trim();
    if (
        customUrl &&
        (/^https?:\/\//i.test(customUrl) || customUrl.startsWith('/')) &&
        !BANNED_LOGO_IMAGE_PATTERN.test(customUrl)
    ) {
        return {src: customUrl, alt: sanitizeMarketplaceName(listing.title)};
    }
    if (useMissionFallback) {
        const src = MISSION_FALLBACK_PHOTO[listing.missionType] ?? '/images/hero-slides/uav-hero-1.webp';
        return {src, alt: sanitizeMarketplaceName(listing.title)};
    }
    return null;
}

export function MarketplaceListingCard({
    item,
    mode = 'public',
}: {
    item: MarketplaceListing;
    mode?: 'public' | 'portal';
}) {
    const {t, locale} = useI18n();
    const [imgFailed, setImgFailed] = useState(false);
    const cardVariant = useAbExperiment('localized_catalog_cards');
    const mobileFilterVariant = useAbExperiment('mobile_compact_filter_drawer');
    const isEnhancedCard = cardVariant === 'treatment';
    const photo = resolveListingPhoto(item, isEnhancedCard);
    const badge = resolveListingBadge(item);
    const fallbackIconName = iconNameForMissionType(item.missionType);
    const encodedSlug = encodeURIComponent(item.slug);
    const detailHref = mode === 'portal' ? `/customer/services/${encodedSlug}` : `/services/${encodedSlug}`;
    const createHref = `/customer/services/${encodedSlug}?subscribe=1`;

    const handleCardClick = (source: 'image' | 'title' | 'cta') => {
        trackAbEvent('localized_catalog_cards', cardVariant, 'card_click', {slug: item.slug, source});
        trackAbEvent('mobile_compact_filter_drawer', mobileFilterVariant, 'card_click', {slug: item.slug, source});
    };

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

    const cleanTitle = isEnhancedCard
        ? localizeOfficialListingTitle(item.title, locale)
        : sanitizeMarketplaceName(item.title);

    return (
        <article className="group flex flex-col justify-between overflow-hidden rounded-panel border border-slate-200 bg-white shadow-2xs transition-shadow duration-200 hover:shadow-md">
            <div>
                <Link
                    href={detailHref}
                    onClick={() => handleCardClick('image')}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-uav-red-light"
                >
                    {!imgFailed && photo?.src ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.src}
                                alt={cleanTitle}
                                loading="lazy"
                                onError={() => setImgFailed(true)}
                                className="h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 motion-reduce:transition-none"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/5 to-transparent"/>
                        </>
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-uav-red-light text-primary">
                            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-2xs ring-1 ring-primary/15">
                                <ServiceCategoryIcon name={fallbackIconName} size={28} strokeWidth={1.75}/>
                            </span>
                        </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start">
                        <span className="rounded-badge bg-slate-950/80 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
                            {typeText(item.listingType)}
                        </span>
                    </div>
                </Link>

                <div className="space-y-2 p-3.5 pb-2.5">
                    <h3 className="m-0 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">
                        <Link
                            href={detailHref}
                            onClick={() => handleCardClick('title')}
                            className="line-clamp-2 block w-full transition-colors hover:text-primary"
                        >
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

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 tabular-nums">
                        <span className="text-base font-bold text-primary">
                            {formatVndCompact(item.basePriceVnd)}
                        </span>
                        <span className="text-[11px] text-slate-500">/ {unitText(item.pricingModel)}</span>
                        {!isEnhancedCard && (
                            <span className="rounded-badge bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                {t('marketplaceShop.illustrative')}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1 rounded-badge bg-uav-red-light px-2 py-0.5 text-[11px] leading-tight font-semibold text-primary">
                            <CheckCircle2 size={12} className="shrink-0" aria-hidden="true"/>
                            <span>{t('publicSite.catalog.verifiedPartner')}</span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold whitespace-nowrap text-slate-700">
                            <Star size={12} className="shrink-0 fill-amber-400 text-amber-500" aria-hidden="true"/>
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
                    onClick={() => handleCardClick('cta')}
                    className="inline-flex min-h-9 w-full items-center justify-center rounded-control bg-primary px-3 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                    {t('marketplaceShop.subscribeForProject')}
                </Link>
            </div>
        </article>
    );
}
