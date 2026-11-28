'use client';

import {Boxes, Clock, Edit3, MapPin, PauseCircle, PlayCircle, Trash2} from 'lucide-react';
import {IllustrativeBadge} from '@/components/marketplace/provider/IllustrativeDisclaimer';
import {formatVndCompact, sanitizeMarketplaceText} from '@/forms/marketplace-forms';
import {useI18n} from '@/providers/I18nContext';
import type {MarketplaceListing} from '@/types/marketplace.types';

interface ProviderListingGridProps {
    listings: MarketplaceListing[];
    onEdit: (item: MarketplaceListing) => void;
    onTogglePause: (id: number) => void;
    onDelete: (id: number) => void;
}

export function ProviderListingGrid({
    listings,
    onEdit,
    onTogglePause,
    onDelete,
}: ProviderListingGridProps) {
    const {t} = useI18n();

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-base font-semibold text-slate-900">
                    {t('opsMarketplace.listings.myListingsTitle')} ({listings.length})
                </h2>
            </div>

            {listings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <Boxes size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
                    <p className="m-0 mt-2 text-sm text-slate-600">{t('opsMarketplace.listings.empty')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {listings.map(item => (
                        <article
                            key={item.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                        >
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-slate-700">
                                        {t(`opsMarketplace.listings.types.${item.listingType}`)}
                                    </span>
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                            item.moderationStatus === 'PUBLISHED'
                                                ? 'bg-slate-900 text-white'
                                                : item.moderationStatus === 'PENDING_REVIEW'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : item.moderationStatus === 'REJECTED'
                                                    ? 'bg-rose-100 text-danger'
                                                    : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {t(`opsMarketplace.listings.status.${item.moderationStatus}`)}
                                    </span>
                                </div>

                                <h3 className="m-0 line-clamp-2 text-base font-semibold text-slate-900">
                                    {sanitizeMarketplaceText(item.title)}
                                </h3>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                        <MapPin size={13} className="text-primary" aria-hidden="true"/>
                                        {item.province} · {item.serviceRadiusKm} km
                                    </span>
                                    {item.deliverySlaHours != null && (
                                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                            <Clock size={13} aria-hidden="true"/>
                                            {item.deliverySlaHours}h
                                        </span>
                                    )}
                                    <span className="whitespace-nowrap">
                                        {t('opsMarketplace.listings.actions.bookings', {count: item.bookingCount})}
                                    </span>
                                </div>

                                {item.moderationNote && (
                                    <p className="m-0 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                                        {t('opsMarketplace.listings.actions.moderationNote', {
                                            note: item.moderationNote,
                                        })}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <strong className="text-base font-bold text-primary tabular-nums">
                                        {formatVndCompact(item.basePriceVnd)}
                                    </strong>
                                    <span className="text-xs text-slate-500">
                                        / {t(`opsMarketplace.listings.pricing.${item.pricingModel}`)}
                                    </span>
                                    <IllustrativeBadge/>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(item)}
                                        className="inline-flex min-h-9 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:border-primary hover:text-primary"
                                    >
                                        <Edit3 size={13} aria-hidden="true"/>
                                        {t('opsMarketplace.listings.actions.edit')}
                                    </button>
                                    {(item.moderationStatus === 'PUBLISHED' || item.moderationStatus === 'PAUSED') && (
                                        <button
                                            type="button"
                                            onClick={() => onTogglePause(item.id)}
                                            className="inline-flex min-h-9 items-center gap-1 rounded-control border border-slate-200 px-2.5 text-xs font-semibold whitespace-nowrap text-slate-700 hover:bg-slate-50"
                                        >
                                            {item.moderationStatus === 'PUBLISHED' ? (
                                                <>
                                                    <PauseCircle size={13} aria-hidden="true"/>
                                                    {t('opsMarketplace.listings.actions.pause')}
                                                </>
                                            ) : (
                                                <>
                                                    <PlayCircle size={13} aria-hidden="true"/>
                                                    {t('opsMarketplace.listings.actions.resume')}
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onDelete(item.id)}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-control text-slate-400 hover:bg-rose-50 hover:text-danger"
                                        aria-label={t('opsMarketplace.listings.actions.delete')}
                                    >
                                        <Trash2 size={14} aria-hidden="true"/>
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
