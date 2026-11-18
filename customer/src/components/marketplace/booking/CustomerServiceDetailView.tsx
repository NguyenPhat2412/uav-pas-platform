'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {CheckCircle2, ChevronLeft, ChevronRight, Clock3, Layers, MapPin, Navigation, ShieldCheck, Star} from 'lucide-react';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {resolveListingPhoto} from '@/components/marketplace/catalog/MarketplaceListingCard';
import {ProjectSubscriptionWizardDialog} from '@/components/marketplace/booking/ProjectSubscriptionWizardDialog';
import {Alert, Button} from '@/components/ui';
import {formatVndCompact, listingTypeLabel, pricingUnitLabel} from '@/forms/marketplace/marketplace-forms';
import {resolveListingBadge, sanitizeMarketplaceText} from '@/forms/project/project-form';
import {usePublicListingDetail} from '@/hooks/marketplace/useMarketplace';
import {useI18n} from '@/providers/I18nContext';

export default function CustomerServiceDetailPage({slug}: { slug: string }) {
    return (
        <PageGuard>
            <CustomerServiceDetailView slug={slug}/>
        </PageGuard>
    );
}

function CustomerServiceDetailView({slug}: { slug: string }) {
    const {t} = useI18n();
    const searchParams = useSearchParams();
    const initialSubscribe = searchParams.get('subscribe') === '1';
    const initialUnitsParam = Number(searchParams.get('units') || '');
    const preselectedProjectParam = Number(searchParams.get('projectId') || '');

    const query = usePublicListingDetail(slug);
    const listing = query.data?.listing;
    const reviews = query.data?.reviews ?? [];

    const [slideIdx, setSlideIdx] = useState(0);
    const [wizardOpen, setWizardOpen] = useState<boolean>(initialSubscribe);

    if (query.isLoading) {
        return (
            <div role="status" aria-busy="true" aria-label={t('common.loading')} className="space-y-4 p-4 sm:p-5">
                <div className="h-6 w-32 animate-pulse rounded bg-slate-100"/>
                <div className="aspect-[16/8] w-full animate-pulse rounded-panel bg-slate-100"/>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="h-16 animate-pulse rounded-panel bg-slate-100"/>
                    ))}
                </div>
                <div className="h-40 animate-pulse rounded-panel bg-slate-100"/>
            </div>
        );
    }

    if (query.isError) {
        return (
            <div className="p-4 sm:p-5">
                <Alert variant="error" role="alert" className="flex flex-wrap items-center justify-between gap-3">
                    <span>{t('errorPage.detail')}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
                        {t('common.retry')}
                    </Button>
                </Alert>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" role="status">
                <h1 className="m-0 text-xl font-bold text-slate-900">{t('marketplaceShop.notFoundTitle')}</h1>
                <p className="m-0 max-w-md text-sm text-slate-600">{t('marketplaceShop.notFoundDesc')}</p>
                <Link
                    href="/customer/services"
                    className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground"
                >
                    {t('marketplaceShop.backToShop')}
                </Link>
            </div>
        );
    }

    const cover = resolveListingPhoto(listing);
    const slides = [
        cover,
        {src: '/images/process/step-02-gis-planning.webp', alt: listing.title},
        {src: '/images/uav-people/uav-survey-team.webp', alt: listing.title},
    ];
    const activeSlide = slides[slideIdx % slides.length] ?? cover;
    const badge = resolveListingBadge(listing);
    const unitLabel = pricingUnitLabel(listing.pricingModel);

    const deliverableBullets = (
        listing.deliverablesSummary
            ? sanitizeMarketplaceText(listing.deliverablesSummary).split(/[,;•\n]+/).map(s => s.trim()).filter(Boolean)
            : []
    );
    const checklist = deliverableBullets.length > 0
        ? deliverableBullets
        : [
              t('marketplaceShop.deliverableRawData'),
              t('marketplaceShop.deliverableGeoMap'),
              t('marketplaceShop.deliverableFlightLog'),
              t('marketplaceShop.deliverableEscrow'),
          ];

    return (
        <div className="flex flex-1 flex-col bg-background pb-24">
            <div className="mx-auto w-full max-w-5xl space-y-4 p-3.5 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                    <Link
                        href="/customer/services"
                        className="inline-flex min-h-9 items-center text-xs font-bold whitespace-nowrap text-slate-600 hover:text-primary"
                    >
                        {t('marketplaceShop.backToShop')}
                    </Link>
                    <span className="rounded-badge bg-slate-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-slate-700">
                        {listingTypeLabel(listing.listingType)}
                    </span>
                </div>

                {/* Slideable Hero Photo Gallery */}
                <section
                    tabIndex={0}
                    aria-roledescription="carousel"
                    aria-label={sanitizeMarketplaceText(listing.title)}
                    onKeyDown={e => {
                        if (e.key === 'ArrowLeft') setSlideIdx(i => (i - 1 + slides.length) % slides.length);
                        else if (e.key === 'ArrowRight') setSlideIdx(i => (i + 1) % slides.length);
                    }}
                    className="overflow-hidden rounded-panel border border-slate-200 bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    <div className="relative aspect-[16/9] max-h-[360px] w-full overflow-hidden bg-uav-red-light">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeSlide.src} alt={sanitizeMarketplaceText(activeSlide.alt)} className="h-full w-full object-cover"/>
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent"/>
                        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 rounded-control bg-primary px-2.5 py-1 text-xs font-bold whitespace-nowrap text-white">
                                <ShieldCheck size={13} aria-hidden="true"/>
                                {t('publicSite.catalog.verifiedPartner')}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setSlideIdx(i => (i - 1 + slides.length) % slides.length)}
                                    aria-label={t('publicSite.catalog.prevPage')}
                                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                    <ChevronLeft size={18} aria-hidden="true"/>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSlideIdx(i => (i + 1) % slides.length)}
                                    aria-label={t('publicSite.catalog.nextPage')}
                                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                >
                                    <ChevronRight size={18} aria-hidden="true"/>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Title, Illustrative Price & Verified Rating */}
                    <div className="space-y-3 p-4 sm:p-5">
                        <h1 className="m-0 line-clamp-2 text-xl font-bold text-slate-900">
                            {sanitizeMarketplaceText(listing.title)}
                        </h1>
                        {listing.summary && (
                            <p className="m-0 text-sm leading-relaxed text-slate-600">{sanitizeMarketplaceText(listing.summary)}</p>
                        )}
                        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-slate-100 pt-3 tabular-nums">
                            <div>
                                <span className="text-2xl font-bold text-primary">
                                    {formatVndCompact(listing.basePriceVnd)}
                                </span>
                                <span className="ml-1.5 text-xs font-medium text-slate-500">
                                    / {unitLabel} · {t('marketplaceShop.illustrative')}
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-badge bg-amber-50 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-amber-700">
                                <Star size={13} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                {badge.reviewCount > 0
                                    ? `${badge.ratingAvg.toFixed(1)} (${badge.reviewCount})`
                                    : t('publicSite.catalog.newListing')}
                            </span>
                        </div>
                    </div>
                </section>

                {/* 4-Icon Spec Row */}
                <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                        {icon: MapPin, label: t('marketplaceShop.specProvince'), value: listing.province},
                        {icon: Navigation, label: t('marketplaceShop.specRadius'), value: `${listing.serviceRadiusKm} km`},
                        {
                            icon: Clock3,
                            label: t('marketplaceShop.specTurnaround'),
                            value: listing.deliverySlaHours != null ? `${listing.deliverySlaHours}h` : '—',
                        },
                        {
                            icon: Layers,
                            label: t('marketplaceShop.specMinUnits'),
                            value: `${listing.minBookingUnits || 1} ${unitLabel}`,
                        },
                    ].map(spec => {
                        const SpecIcon = spec.icon;
                        return (
                            <div key={spec.label} className="flex items-center gap-2.5 rounded-panel border border-slate-200 bg-card p-3">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                    <SpecIcon size={17} aria-hidden="true"/>
                                </span>
                                <div className="min-w-0 tabular-nums">
                                    <span className="block text-xs leading-tight text-slate-500">{spec.label}</span>
                                    <strong className="mt-0.5 block line-clamp-2 text-sm leading-tight font-semibold text-slate-900">{spec.value}</strong>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* "What You Get" Checklist */}
                <section className="rounded-panel border border-slate-200 bg-card p-4 sm:p-5">
                    <h2 className="m-0 text-base font-semibold text-slate-900">
                        {t('marketplaceShop.deliverablesHeading')}
                    </h2>
                    <ul className="m-0 mt-3 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2">
                        {checklist.map(line => (
                            <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Reviews */}
                <section className="rounded-panel border border-slate-200 bg-card p-4 sm:p-5">
                    <h2 className="m-0 text-base font-semibold text-slate-900 tabular-nums">
                        {t('marketplaceShop.reviewsHeading')} ({reviews.length})
                    </h2>
                    {reviews.length === 0 ? (
                        <p className="m-0 mt-2 text-xs text-slate-500">{t('marketplaceShop.reviewsEmpty')}</p>
                    ) : (
                        <div className="mt-3 divide-y divide-slate-100">
                            {reviews.map(rev => (
                                <article key={rev.id} className="py-3 first:pt-0 last:pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <strong className="truncate text-xs font-bold text-slate-900">{rev.customerName}</strong>
                                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold whitespace-nowrap text-amber-600 tabular-nums">
                                            <Star size={12} className="fill-amber-400 text-amber-500" aria-hidden="true"/>
                                            {rev.overallRating ?? 5}/5
                                        </span>
                                    </div>
                                    {rev.comment && (
                                        <p className="m-0 mt-1 text-xs leading-relaxed text-slate-600">{rev.comment}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Pinned Bottom CTA Bar */}
            <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xs lg:left-[220px]">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
                    <div className="min-w-0 tabular-nums">
                        <span className="block text-[11px] leading-tight text-slate-500 sm:text-xs">
                            {t('marketplaceShop.stickyPriceLabel')}
                        </span>
                        <strong className="mt-0.5 block text-sm leading-tight font-bold text-primary sm:text-base">
                            {formatVndCompact(listing.basePriceVnd)} / {unitLabel}
                        </strong>
                    </div>
                    <Button
                        type="button"
                        onClick={() => setWizardOpen(true)}
                        className="min-h-11 shrink-0 px-6 text-sm font-bold whitespace-nowrap"
                    >
                        {t('marketplaceShop.subscribeForProject')}
                    </Button>
                </div>
            </div>

            <ProjectSubscriptionWizardDialog
                open={wizardOpen}
                listing={listing}
                initialUnits={Number.isFinite(initialUnitsParam) && initialUnitsParam > 0 ? initialUnitsParam : undefined}
                preselectedProjectId={Number.isFinite(preselectedProjectParam) && preselectedProjectParam > 0 ? preselectedProjectParam : null}
                onClose={() => setWizardOpen(false)}
            />
        </div>
    );
}
