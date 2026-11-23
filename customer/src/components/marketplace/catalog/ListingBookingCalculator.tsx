'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Clock3} from 'lucide-react';
import {openAuthModal} from '@/components/auth/modal/AuthModalPopup';
import {localizeOfficialListingTitle} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {RequiredMark} from '@/components/ui';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {estimateBookingSubtotal, formatVndCompact} from '@/forms/marketplace/marketplace-forms';
import {trackAbEvent, useAbExperiment} from '@/lib/experiments/ab-experiments';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import type {MarketplaceListing, PricingModel} from '@/types/marketplace/marketplace.types';

export function ListingBookingCalculator({listing}: { listing: MarketplaceListing }) {
    const {t, locale} = useI18n();
    const {user} = useAuth();
    const {invoiceDueDays, rfqEnabled} = useSiteInfo();
    const authVariant = useAbExperiment('in_place_booking_auth');
    const [unitsInput, setUnitsInput] = useState<string>('');

    const unitTextOf = (model: PricingModel) => {
        if (model === 'PER_DAY') return t('publicSite.catalog.unitDay');
        if (model === 'PER_HECTARE') return t('publicSite.catalog.unitHectare');
        if (model === 'PER_PACKAGE') return t('publicSite.catalog.unitPackage');
        return t('publicSite.catalog.unitHour');
    };

    const minUnits = Number(listing.minBookingUnits || 1);
    const parsedUnits = unitsInput === '' ? minUnits : Number(unitsInput);
    const subtotal = estimateBookingSubtotal(Number(listing.basePriceVnd), parsedUnits, minUnits);
    const deposit = Number(listing.securityDepositVnd || 0);
    const unitText = unitTextOf(listing.pricingModel);

    return (
        <aside className="lg:col-span-4" aria-label={t('marketplaceShop.pubCalcAria')}>
            <div className="uav-bezel sticky top-20">
                <div className="uav-bezel-core space-y-4 p-6">
                    <div>
                        <span className="text-xs font-semibold text-muted">
                            {t('marketplaceShop.illustrativePriceNote')}
                        </span>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 tabular-nums">
                            <span className="text-2xl font-bold text-primary">
                                {formatVndCompact(listing.basePriceVnd)}
                            </span>
                            <span className="text-xs font-medium text-muted">/ {unitText}</span>
                            <span className="rounded-badge bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                {t('marketplaceShop.illustrative')}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block space-y-1.5 text-xs font-semibold text-on-surface">
                            <span>
                                {t('marketplaceShop.unitsLabel')} ({unitText})<RequiredMark/>
                            </span>
                            <input
                                type="number"
                                min={minUnits}
                                step="0.5"
                                value={unitsInput === '' ? String(minUnits) : unitsInput}
                                onChange={e => setUnitsInput(e.target.value)}
                                className="h-10 w-full rounded-control border border-border-input bg-card px-3 text-sm font-semibold text-on-surface tabular-nums outline-none focus:outline-2 focus:outline-ring"
                            />
                            <span className="block text-xs font-normal text-muted tabular-nums">
                                {t('marketplaceShop.pubMinUnitsHint', {min: minUnits, unit: unitText})}
                            </span>
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('marketplaceShop.unitsLabel')}>
                            {[1, 2, 5, 10].map(mult => {
                                const val = Math.round(minUnits * mult * 10) / 10;
                                const active = Math.abs((parsedUnits || minUnits) - val) < 0.01;
                                return (
                                    <button
                                        key={mult}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setUnitsInput(String(val))}
                                        className={`min-h-8 cursor-pointer rounded-badge px-2.5 py-1 text-xs font-semibold whitespace-nowrap tabular-nums transition-colors ${
                                            active
                                                ? 'bg-slate-900 text-white'
                                                : 'border border-slate-200 bg-surface-container-low text-on-surface hover:border-slate-400'
                                        }`}
                                    >
                                        {mult === 1
                                            ? t('marketplaceShop.pubMinPreset', {val})
                                            : `${val} ${unitText}`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <dl className="space-y-2 rounded-panel bg-surface-container-low p-4 text-xs tabular-nums">
                        <div className="flex items-center justify-between gap-2">
                            <dt className="text-muted">{t('marketplaceShop.pubSubtotal')}</dt>
                            <dd className="m-0 font-semibold whitespace-nowrap text-on-surface">{formatVndCompact(subtotal)}</dd>
                        </div>
                        {deposit > 0 && (
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-muted">{t('marketplaceShop.pubDeposit')}</dt>
                                <dd className="m-0 font-semibold whitespace-nowrap text-on-surface">{formatVndCompact(deposit)}</dd>
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
                            <dt className="font-semibold text-on-surface">{t('marketplaceShop.pubEscrowTotal')}</dt>
                            <dd className="m-0 text-sm font-bold whitespace-nowrap text-primary">{formatVndCompact(subtotal + deposit)}</dd>
                        </div>
                    </dl>

                    <div className="grid gap-2 text-xs text-muted tabular-nums">
                        {listing.onSiteSlaHours != null && (
                            <div className="flex items-center gap-2">
                                <Clock3 size={14} className="shrink-0 text-on-surface" aria-hidden="true"/>
                                <span>{t('marketplaceShop.pubOnSiteHours', {hours: listing.onSiteSlaHours})}</span>
                            </div>
                        )}
                        {listing.deliverySlaHours != null && (
                            <div className="flex items-center gap-2">
                                <Clock3 size={14} className="shrink-0 text-uav-blue" aria-hidden="true"/>
                                <span>{t('marketplaceShop.pubDeliveryHours', {hours: listing.deliverySlaHours})}</span>
                            </div>
                        )}
                    </div>

                    {!user && authVariant === 'treatment' ? (
                        <button
                            type="button"
                            onClick={() => {
                                const effectiveUnits = Math.max(parsedUnits || minUnits, minUnits);
                                const nextHref = `/customer/services/${encodeURIComponent(listing.slug)}?subscribe=1&units=${encodeURIComponent(String(effectiveUnits))}`;
                                trackAbEvent('in_place_booking_auth', 'treatment', 'click_subscribe_cta', {
                                    slug: listing.slug,
                                    units: effectiveUnits,
                                });
                                openAuthModal('login', nextHref, {
                                    title: localizeOfficialListingTitle(listing.title, locale),
                                    unitsSummary: `${effectiveUnits} ${unitText}`,
                                    totalFormatted: formatVndCompact(subtotal + deposit),
                                    escrowDays: invoiceDueDays,
                                });
                            }}
                            className="group inline-flex min-h-11 w-full cursor-pointer items-center justify-between rounded-control bg-primary pr-3 pl-5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-xs transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-hover active:scale-[0.985]"
                        >
                            <span>{t('marketplaceShop.subscribeForProject')}</span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                                <ArrowUpRight size={14} aria-hidden="true"/>
                            </span>
                        </button>
                    ) : (
                        <Link
                            href={`/customer/services/${encodeURIComponent(listing.slug)}?subscribe=1&units=${encodeURIComponent(String(Math.max(parsedUnits || minUnits, minUnits)))}`}
                            onClick={() =>
                                trackAbEvent('in_place_booking_auth', authVariant, 'click_subscribe_cta', {
                                    slug: listing.slug,
                                    units: Math.max(parsedUnits || minUnits, minUnits),
                                })
                            }
                            className="group inline-flex min-h-11 w-full items-center justify-between rounded-control bg-primary pr-3 pl-5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-xs transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-hover active:scale-[0.985]"
                        >
                            <span>{t('marketplaceShop.subscribeForProject')}</span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                                <ArrowUpRight size={14} aria-hidden="true"/>
                            </span>
                        </Link>
                    )}

                    {rfqEnabled && (
                        <Link
                            href="/contact"
                            className="block text-center text-xs font-semibold text-muted hover:text-on-surface hover:underline"
                        >
                            {t('marketplaceShop.pubOpenRfqLink')}
                        </Link>
                    )}

                    <p className="m-0 rounded-panel border border-slate-200 bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface tabular-nums">
                        {t('marketplaceShop.pubEscrowNote', {days: invoiceDueDays})}
                    </p>
                </div>
            </div>
        </aside>
    );
}
