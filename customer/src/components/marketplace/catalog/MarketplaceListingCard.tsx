'use client';

import Link from 'next/link';
import {Building2, CheckCircle2, MapPin, ShieldCheck, Star} from 'lucide-react';
import {scenes} from '@/components/marketing/UavPhoto';
import {
    formatVndCompact,
    listingTypeLabel,
    pricingUnitLabel,
} from '@/forms/marketplace/marketplace-forms';
import type {MarketplaceListing} from '@/types/marketplace/marketplace.types';

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

export function MarketplaceListingCard({item}: { item: MarketplaceListing }) {
    const photo = resolveListingPhoto(item);
    const createHref = `/customer/missions/create?listing=${encodeURIComponent(item.slug)}`;

    return (
        <article className="group flex flex-col justify-between overflow-hidden rounded-panel border border-slate-200 bg-card shadow-xs transition-shadow duration-200 hover:shadow-md">
            <div>
                <Link
                    href={`/services/${item.slug}`}
                    className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-900"
                >
                    <img
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent"/>
                    <div className="absolute top-3 right-3 left-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-badge bg-slate-950/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                            {listingTypeLabel(item.listingType)}
                        </span>
                        {item.officialPlatformListing ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-xs">
                                <ShieldCheck size={13} aria-hidden="true"/>
                                Đội bay UAV PAS
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-xs">
                                <CheckCircle2 size={13} aria-hidden="true"/>
                                Đối tác xác minh KYC
                            </span>
                        )}
                    </div>
                    <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-2 text-white tabular-nums">
                        <div>
                            <span className="text-lg font-bold tracking-tight text-white">
                                {formatVndCompact(item.basePriceVnd)}
                            </span>
                            <span className="ml-1 text-xs font-medium text-slate-200">
                                / {pricingUnitLabel(item.pricingModel)}
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 px-2.5 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-xs">
                            <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true"/>
                            {item.reviewCount > 0 ? `${Number(item.ratingAvg).toFixed(1)} (${item.reviewCount})` : 'Mới'}
                        </span>
                    </div>
                </Link>

                <div className="space-y-3 p-5 pb-3">
                    <div>
                        <h3 className="m-0 text-base font-semibold leading-snug text-on-surface">
                            <Link href={`/services/${item.slug}`} className="hover:text-primary">
                                {item.title}
                            </Link>
                        </h3>
                        {item.summary && (
                            <p className="m-0 mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                                {item.summary}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                        {item.providerSlug ? (
                            <Link
                                href={`/providers/${item.providerSlug}`}
                                className="inline-flex items-center gap-1 font-semibold text-on-surface hover:text-primary"
                            >
                                <Building2 size={13} aria-hidden="true"/>
                                {item.providerDisplayName}
                            </Link>
                        ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                                <Building2 size={13} aria-hidden="true"/>
                                {item.providerDisplayName}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <MapPin size={13} aria-hidden="true"/>
                            {item.province} · {item.serviceRadiusKm} km
                        </span>
                    </div>

                    {item.equipmentSpecs && (
                        <p className="m-0 line-clamp-1 rounded-control bg-surface-container-low px-3 py-2 text-xs text-muted">
                            <strong className="font-semibold text-on-surface">Thiết bị:</strong> {item.equipmentSpecs}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 px-5 pt-3 pb-5">
                <div className="flex items-center justify-between text-xs text-muted tabular-nums">
                    <span>Tối thiểu {item.minBookingUnits} {pricingUnitLabel(item.pricingModel)}</span>
                    <span>Đã nhận {item.bookingCount} đơn</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        href={createHref}
                        className="inline-flex min-h-9 items-center justify-center rounded-control bg-primary px-3 text-xs font-semibold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                        Đặt thuê ngay
                    </Link>
                    <Link
                        href={`/services/${item.slug}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-control border border-slate-200 bg-card px-3 text-xs font-semibold whitespace-nowrap text-on-surface transition-colors hover:bg-surface-container-low"
                    >
                        Xem chi tiết
                    </Link>
                </div>
            </div>
        </article>
    );
}
