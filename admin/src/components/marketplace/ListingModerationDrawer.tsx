'use client';

import {
    Boxes,
    CheckCircle2,
    Clock,
    MapPin,
    PackageCheck,
    PauseCircle,
    ShieldCheck,
    Sparkles,
    Store,
    Wrench,
    XCircle,
} from 'lucide-react';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {Alert, Button, OptionalMark} from '@/components/ui';
import {IllustrativeTag} from '@/components/marketplace/MarketplaceShared';
import {formatMarketplaceVnd, sanitizeMarketplaceText} from '@/forms/marketplace/admin-marketplace-form';
import {useI18n} from '@/providers/I18nContext';
import type {AdminMarketplaceListing, ListingModerationStatus} from '@/types/marketplace/marketplace.types';

export function ListingModerationDrawer({
    listing,
    noteValue,
    isFeatured,
    canModerate,
    isPending,
    onNoteChange,
    onFeaturedChange,
    onModerate,
    onClose,
}: {
    listing: AdminMarketplaceListing;
    noteValue: string;
    isFeatured: boolean;
    canModerate: boolean;
    isPending: boolean;
    onNoteChange: (val: string) => void;
    onFeaturedChange: (val: boolean) => void;
    onModerate: (status: ListingModerationStatus) => void;
    onClose: () => void;
}) {
    const {t} = useI18n();
    const hasCover = Boolean(listing.coverImageUrl && /^https?:\/\/|^\//i.test(listing.coverImageUrl));

    return (
        <Drawer
            wide
            title={t('adminCommerce.marketplace.listings.drawerTitle', {title: sanitizeMarketplaceText(listing.title)})}
            onClose={onClose}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="aspect-[4/3] overflow-hidden rounded-panel border border-border bg-[var(--uav-color-primary-light)]">
                    {hasCover && listing.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={listing.coverImageUrl}
                            alt={sanitizeMarketplaceText(listing.title)}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary">
                            <Boxes size={32} aria-hidden="true"/>
                        </div>
                    )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-badge bg-slate-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-on-surface">
                            {t(`adminCommerce.marketplace.listingType.${listing.listingType}`)}
                        </span>
                        <span className="rounded-badge bg-slate-900 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-white">
                            {t(`adminCommerce.marketplace.listingStatus.${listing.moderationStatus}`)}
                        </span>
                    </div>
                    <h3 className="m-0 text-base font-semibold text-on-surface">{sanitizeMarketplaceText(listing.title)}</h3>
                    {listing.summary && <p className="m-0 text-xs text-muted">{sanitizeMarketplaceText(listing.summary)}</p>}
                    <div className="flex flex-wrap items-center gap-2 pt-1 tabular-nums">
                        <strong className="text-lg font-bold text-primary">
                            {formatMarketplaceVnd(Number(listing.basePriceVnd))}
                        </strong>
                        <span className="text-xs text-muted whitespace-nowrap">
                            / {t(`adminCommerce.marketplace.pricingModel.${listing.pricingModel}`)}
                        </span>
                        <IllustrativeTag/>
                    </div>
                </div>
            </div>

            <Alert variant="info" icon={<ShieldCheck size={15} aria-hidden="true"/>} className="text-xs">
                {t('adminCommerce.marketplace.listings.customerMaskHint')}
            </Alert>

            <Metadata
                items={[
                    [
                        t('adminCommerce.marketplace.listings.providerLabel'),
                        <span key="provider" className="inline-flex items-center gap-1.5">
                            <Store size={13} className="text-muted" aria-hidden="true"/>
                            <span>{sanitizeMarketplaceText(listing.providerDisplayName)}</span>
                        </span>,
                    ],
                    [
                        t('adminCommerce.marketplace.providers.area'),
                        <span key="area" className="inline-flex items-center gap-1">
                            <MapPin size={13} className="text-muted" aria-hidden="true"/>
                            {listing.province} ({t('adminCommerce.marketplace.providers.radiusKm', {km: listing.serviceRadiusKm})})
                        </span>,
                    ],
                    [
                        t('adminCommerce.marketplace.listings.depositLabel'),
                        <span key="dep" className="inline-flex items-center gap-1.5 tabular-nums">
                            <span>{formatMarketplaceVnd(Number(listing.securityDepositVnd ?? 0))}</span>
                            <IllustrativeTag/>
                        </span>,
                    ],
                    [
                        t('adminCommerce.marketplace.listings.deliverablesLabel'),
                        listing.deliverySlaHours ? (
                            <span key="turnaround" className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                                <Clock size={13} className="text-muted" aria-hidden="true"/>
                                {t('adminCommerce.marketplace.listings.deliveryHours', {hours: listing.deliverySlaHours})}
                            </span>
                        ) : (
                            t('adminCommerce.marketplace.listings.minUnits', {units: listing.minBookingUnits})
                        ),
                    ],
                ]}
            />

            {(listing.equipmentSpecs || listing.deliverablesSummary || listing.description) && (
                <section className="space-y-2.5 rounded-panel border border-border bg-slate-50/70 p-4 text-xs">
                    {listing.equipmentSpecs && (
                        <div className="flex items-start gap-2">
                            <Wrench size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true"/>
                            <div>
                                <strong className="text-on-surface">{t('adminCommerce.marketplace.listings.equipmentLabel')}: </strong>
                                <span className="text-muted">{sanitizeMarketplaceText(listing.equipmentSpecs)}</span>
                            </div>
                        </div>
                    )}
                    {listing.deliverablesSummary && (
                        <div className="flex items-start gap-2">
                            <PackageCheck size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true"/>
                            <div>
                                <strong className="text-on-surface">{t('adminCommerce.marketplace.listings.deliverablesLabel')}: </strong>
                                <span className="text-muted">{sanitizeMarketplaceText(listing.deliverablesSummary)}</span>
                            </div>
                        </div>
                    )}
                    {listing.description && (
                        <p className="m-0 pt-1 text-muted whitespace-pre-line">{sanitizeMarketplaceText(listing.description)}</p>
                    )}
                </section>
            )}

            {canModerate && (
                <section className="uav-bezel">
                    <div className="uav-bezel-core space-y-3 p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="min-w-[200px] flex-1 space-y-1 text-xs font-semibold text-on-surface">
                                <span className="block">
                                    {t('adminCommerce.marketplace.listings.noteLabel')}
                                    <OptionalMark/>
                                </span>
                                <input
                                    type="text"
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
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
                </section>
            )}
        </Drawer>
    );
}
