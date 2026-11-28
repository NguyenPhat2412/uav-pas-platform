'use client';

import {
    Boxes,
    CheckCircle2,
    Clock,
    Eye,
    MapPin,
    PauseCircle,
    Sparkles,
    Store,
    XCircle,
} from 'lucide-react';
import {Button, OptionalMark} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {formatMarketplaceVnd, sanitizeMarketplaceText} from '@/forms/admin-marketplace-form';
import {useI18n} from '@/providers/I18nContext';
import type {AdminMarketplaceListing, ListingModerationStatus} from '@/types/marketplace.types';

export function ListingModerationRow({
    item,
    noteValue,
    isFeatured,
    canModerate,
    isPending,
    onNoteChange,
    onFeaturedChange,
    onInspect,
    onModerate,
}: {
    item: AdminMarketplaceListing;
    noteValue: string;
    isFeatured: boolean;
    canModerate: boolean;
    isPending: boolean;
    onNoteChange: (val: string) => void;
    onFeaturedChange: (val: boolean) => void;
    onInspect: () => void;
    onModerate: (status: ListingModerationStatus) => void;
}) {
    const {t} = useI18n();
    const hasCover = Boolean(item.coverImageUrl && /^https?:\/\/|^\//i.test(item.coverImageUrl));

    return (
        <div className="space-y-3 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <div className="hidden aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-control border border-border bg-[var(--uav-color-primary-light)] sm:flex sm:items-center sm:justify-center">
                        {hasCover && item.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.coverImageUrl} alt={item.title} className="h-full w-full object-cover"/>
                        ) : (
                            <Boxes size={22} className="text-primary" aria-hidden="true"/>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <strong className="line-clamp-2 text-base font-semibold text-on-surface">
                                {sanitizeMarketplaceText(item.title)}
                            </strong>
                            <span className="rounded-badge bg-surface-container-low px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-on-surface">
                                {t(`adminCommerce.marketplace.listingType.${item.listingType}`)}
                            </span>
                            <span
                                className={`rounded-badge px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                                    item.moderationStatus === 'PUBLISHED'
                                        ? 'bg-slate-900 text-white'
                                        : item.moderationStatus === 'PENDING_REVIEW'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-danger'
                                }`}
                            >
                                {t(`adminCommerce.marketplace.listingStatus.${item.moderationStatus}`)}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <Store size={13} aria-hidden="true"/>
                                <strong className="text-on-surface">{sanitizeMarketplaceText(item.providerDisplayName)}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <MapPin size={13} aria-hidden="true"/>
                                {item.province || '—'} · {t('adminCommerce.marketplace.providers.radiusKm', {km: item.serviceRadiusKm ?? 0})}
                            </span>
                            {item.deliverySlaHours != null && (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                    <Clock size={13} aria-hidden="true"/>
                                    {t('adminCommerce.marketplace.listings.deliveryHours', {hours: item.deliverySlaHours})}
                                </span>
                            )}
                            <span className="whitespace-nowrap">
                                {t('adminCommerce.marketplace.listings.bookingsCount', {count: item.bookingCount})}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 tabular-nums sm:justify-end">
                    <div className="text-left sm:text-right">
                        <div className="flex items-center gap-1.5 sm:justify-end">
                            <strong className="text-base font-bold text-primary whitespace-nowrap">
                                {formatMarketplaceVnd(Number(item.basePriceVnd))}
                            </strong>
                            <IllustrativeTag/>
                        </div>
                        <span className="block text-xs text-muted whitespace-nowrap">
                            {t(`adminCommerce.marketplace.pricingModel.${item.pricingModel}`)}
                        </span>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        leftIcon={<Eye size={14} aria-hidden="true"/>}
                        onClick={onInspect}
                        className="whitespace-nowrap"
                    >
                        {t('adminCommerce.marketplace.listings.inspectBtn')}
                    </Button>
                </div>
            </div>

            {canModerate && (
                <div className="uav-bezel">
                    <div className="uav-bezel-core flex flex-wrap items-end justify-between gap-3 p-3.5">
                        <div className="flex flex-1 flex-wrap items-end gap-3">
                            <label className="min-w-[200px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                <span className="block">
                                    {t('adminCommerce.marketplace.listings.noteLabel')}
                                    <OptionalMark/>
                                </span>
                                <input
                                    type="text"
                                    aria-label={`${t('adminCommerce.marketplace.listings.noteLabel')} ${item.title}`}
                                    value={noteValue}
                                    onChange={e => onNoteChange(e.target.value)}
                                    placeholder={t('adminCommerce.marketplace.listings.notePlaceholder')}
                                    className="h-9 w-full rounded-control border border-border-input bg-card px-3 text-xs font-normal"
                                />
                            </label>
                            <label className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-on-surface">
                                <input
                                    type="checkbox"
                                    checked={isFeatured}
                                    onChange={e => onFeaturedChange(e.target.checked)}
                                    className="h-4 w-4 accent-primary"
                                />
                                <Sparkles size={13} className="text-amber-500" aria-hidden="true"/>
                                {t('adminCommerce.marketplace.listings.featuredLabel')}
                            </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                disabled={isPending}
                                leftIcon={<CheckCircle2 size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('PUBLISHED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.listings.publishBtn')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isPending}
                                leftIcon={<PauseCircle size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('PAUSED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.listings.pauseBtn')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                disabled={isPending}
                                leftIcon={<XCircle size={14} aria-hidden="true"/>}
                                onClick={() => onModerate('REJECTED')}
                                className="whitespace-nowrap"
                            >
                                {t('adminCommerce.marketplace.listings.rejectBtn')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
