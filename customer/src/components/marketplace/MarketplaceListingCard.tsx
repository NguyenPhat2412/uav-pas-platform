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
import type {MissionType} from '@/types/mission/mission.types';

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
        <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md">
            <div>
                <Link
                    href={`/services/${item.slug}`}
                    className="relative block aspect-[16/10] w-full overflow-hidden bg-slate-900"
                >
                    <img
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="
                        pointer-events-none absolute inset-0
                        bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent
                    "/>
                    <div className="absolute top-3 right-3 left-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-slate-950/75 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                            {listingTypeLabel(item.listingType)}
                        </span>
                        {item.officialPlatformListing ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-600/95 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                                <ShieldCheck size={13} aria-hidden="true"/>
                                Đội bay UAV PAS
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2.5 py-1 text-xs font-bold text-white shadow-xs">
                                <CheckCircle2 size={13} aria-hidden="true"/>
                                Đối tác xác minh KYC
                            </span>
                        )}
                    </div>
                    <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between gap-2 text-white">
                        <div>
                            <span className="text-lg font-black tracking-tight text-white">
                                {formatVndCompact(item.basePriceVnd)}
                            </span>
                            <span className="ml-1 text-xs font-medium text-slate-200">
                                / {pricingUnitLabel(item.pricingModel)}
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-xs">
                            <Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true"/>
                            {item.reviewCount > 0 ? `${Number(item.ratingAvg).toFixed(1)} (${item.reviewCount})` : 'Mới'}
                        </span>
                    </div>
                </Link>

                <div className="space-y-3 p-5 pb-3">
                    <div>
                        <h3 className="m-0 text-base font-extrabold leading-snug text-slate-900">
                            <Link href={`/services/${item.slug}`} className="hover:text-primary">
                                {item.title}
                            </Link>
                        </h3>
                        {item.summary && (
                            <p className="m-0 mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                {item.summary}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {item.providerSlug ? (
                            <Link
                                href={`/providers/${item.providerSlug}`}
                                className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-primary"
                            >
                                <Building2 size={13} aria-hidden="true"/>
                                {item.providerDisplayName}
                            </Link>
                        ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
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
                        <p className="m-0 line-clamp-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <strong className="font-bold text-slate-800">Thiết bị:</strong> {item.equipmentSpecs}
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2.5 border-t border-slate-100 px-5 pt-3 pb-5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Tối thiểu {item.minBookingUnits} {pricingUnitLabel(item.pricingModel)}</span>
                    <span>Đã nhận {item.bookingCount} đơn</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Link
                        href={createHref}
                        className="inline-flex h-9 items-center justify-center rounded-control bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                        Đặt thuê ngay
                    </Link>
                    <Link
                        href={`/services/${item.slug}`}
                        className="inline-flex h-9 items-center justify-center rounded-control border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                    >
                        Xem chi tiết
                    </Link>
                </div>
            </div>
        </article>
    );
}
