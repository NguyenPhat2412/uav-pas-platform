'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ChevronLeft, ChevronRight, FolderKanban, ShieldCheck} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

const HERO_SLIDES = [
    {
        src: '/images/hero-slides/uav-hero-1.webp',
        altKey: 'publicSite.catalog.title',
        eyebrowKey: 'publicSite.catalog.verifiedPartner',
    },
    {
        src: '/images/hero-slides/uav-hero-2.webp',
        altKey: 'marketplaceShop.projectBannerTitle',
        eyebrowKey: 'marketplaceShop.projectBannerEyebrow',
    },
    {
        src: '/images/hero-slides/uav-hero-3.webp',
        altKey: 'marketplaceShop.recommendedTitle',
        eyebrowKey: 'publicSite.catalog.eyebrow',
    },
] as const;

export function CustomerShopHeroBanner() {
    const {t} = useI18n();
    const [index, setIndex] = useState(0);
    const slide = HERO_SLIDES[index] ?? HERO_SLIDES[0];

    const prev = () => setIndex(curr => (curr - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
    const next = () => setIndex(curr => (curr + 1) % HERO_SLIDES.length);

    return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="relative overflow-hidden rounded-panel border border-slate-200 bg-slate-900 lg:col-span-8">
                <div className="relative aspect-[16/7] min-h-[168px] w-full sm:min-h-[196px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={slide.src}
                        alt={t(slide.altKey)}
                        className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent"/>
                    <div className="absolute inset-x-4 bottom-3.5 flex items-end justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                            <span className="inline-flex max-w-full items-center gap-1 rounded-badge bg-primary px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">
                                <ShieldCheck size={12} className="shrink-0" aria-hidden="true"/>
                                <span className="truncate">{t(slide.eyebrowKey)}</span>
                            </span>
                            <h1 className="m-0 line-clamp-2 text-base font-bold text-white sm:text-xl">
                                {t(slide.altKey)}
                            </h1>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <button
                                type="button"
                                onClick={prev}
                                aria-label={t('publicSite.catalog.prevPage')}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xs transition-colors hover:bg-white/25"
                            >
                                <ChevronLeft size={16} aria-hidden="true"/>
                            </button>
                            <button
                                type="button"
                                onClick={next}
                                aria-label={t('publicSite.catalog.nextPage')}
                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xs transition-colors hover:bg-white/25"
                            >
                                <ChevronRight size={16} aria-hidden="true"/>
                            </button>
                        </div>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1" aria-hidden="true">
                        {HERO_SLIDES.map((s, idx) => (
                            <span
                                key={s.src}
                                className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${
                                    idx === index ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-panel border border-slate-200 bg-card p-4 lg:col-span-4">
                <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary">
                        <FolderKanban size={22} aria-hidden="true"/>
                    </span>
                    <div className="min-w-0 space-y-1">
                        <span className="block truncate whitespace-nowrap text-xs font-bold text-primary">
                            {t('marketplaceShop.projectBannerEyebrow')}
                        </span>
                        <h2 className="m-0 line-clamp-2 text-base font-semibold text-slate-900">
                            {t('marketplaceShop.projectBannerTitle')}
                        </h2>
                        <p className="m-0 line-clamp-2 text-[13px] leading-snug text-slate-600">
                            {t('marketplaceShop.projectBannerDesc')}
                        </p>
                    </div>
                </div>
                <Link
                    href="/customer/projects"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                    <span className="truncate">{t('marketplaceShop.projectBannerAction')}</span>
                </Link>
            </div>
        </div>
    );
}
