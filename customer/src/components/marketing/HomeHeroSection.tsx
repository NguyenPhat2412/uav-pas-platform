'use client';

import {useEffect, useState, type FormEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight, CheckCircle2, Lock, Search, ShieldCheck} from 'lucide-react';
import {customerUrl} from '@/content/marketing/origins';
import {trackAbEvent, useAbExperiment} from '@/lib/experiments/ab-experiments';
import {useI18n} from '@/providers/I18nContext';

const HERO_SLIDES = [
    '/images/hero-slides/uav-hero-1.webp',
    '/images/hero-slides/uav-hero-2.webp',
    '/images/hero-slides/uav-hero-3.webp',
] as const;

export function HomeHeroSection() {
    const {t} = useI18n();
    const router = useRouter();
    const heroTrustVariant = useAbExperiment('hero_trust_strip');
    const [query, setQuery] = useState('');
    const [slideIdx, setSlideIdx] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setSlideIdx(prev => (prev + 1) % HERO_SLIDES.length);
        }, 5500);
        return () => window.clearInterval(timer);
    }, []);

    const onSearch = (event: FormEvent) => {
        event.preventDefault();
        const trimmed = query.trim();
        router.push(trimmed ? `/services?q=${encodeURIComponent(trimmed)}` : '/services');
    };

    return (
        <section className="border-b border-slate-200 bg-white py-8 sm:py-12">
            <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-center gap-7 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
                <div className="space-y-4 lg:col-span-7">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-uav-red-light px-3 py-1 text-xs font-bold text-primary">
                        <ShieldCheck size={14} aria-hidden="true"/>
                        {t('publicSite.homeRedesign.heroEyebrow')}
                    </span>

                    <h1 className="m-0 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[40px] lg:leading-[1.14]">
                        {t('publicSite.homeRedesign.heroTitle')}
                    </h1>

                    <p className="m-0 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                        {t('publicSite.homeRedesign.heroSubtitle')}
                    </p>

                    <form
                        onSubmit={onSearch}
                        role="search"
                        aria-label={t('publicSite.homeRedesign.searchAria')}
                        className="flex flex-col gap-2 rounded-panel border border-slate-200 bg-slate-50/80 p-1.5 sm:flex-row sm:items-center"
                    >
                        <label className="relative flex-1">
                            <span className="sr-only">{t('common.search')}</span>
                            <Search
                                size={17}
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="search"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={t('publicSite.homeRedesign.searchPlaceholder')}
                                className="h-11 w-full rounded-control border border-transparent bg-white pr-3 pl-10 text-sm text-slate-900 outline-none focus:border-primary"
                            />
                        </label>
                        <button
                            type="submit"
                            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-5 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                            <Search size={14} aria-hidden="true"/>
                            <span>{t('common.search')}</span>
                        </button>
                    </form>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <Link
                            href="/services"
                            onClick={() => trackAbEvent('hero_trust_strip', heroTrustVariant, 'hero_cta_click', {target: '/services'})}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-primary px-5 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover sm:text-sm"
                        >
                            <span>{t('publicSite.homeRedesign.heroPrimaryCta')}</span>
                            <ArrowRight size={15} aria-hidden="true"/>
                        </Link>
                        <Link
                            href={`${customerUrl}/provider/onboarding`}
                            onClick={() => trackAbEvent('hero_trust_strip', heroTrustVariant, 'hero_secondary_cta_click', {target: '/customer/provider/onboarding'})}
                            className="inline-flex min-h-11 items-center justify-center rounded-control border border-slate-300 bg-white px-5 text-xs font-bold whitespace-nowrap text-slate-800 transition-colors hover:border-primary hover:text-primary sm:text-sm"
                        >
                            {t('publicSite.homeRedesign.heroSecondaryCta')}
                        </Link>
                    </div>

                    {heroTrustVariant === 'treatment' && (
                        <ul className="m-0 flex list-none flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 p-0 text-xs font-medium text-slate-600">
                            <li className="inline-flex items-center gap-1.5">
                                <Lock size={13} className="shrink-0 text-slate-800" aria-hidden="true"/>
                                <span>{t('marketplaceShop.heroTrustEscrow')}</span>
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="shrink-0 text-primary" aria-hidden="true"/>
                                <span>{t('marketplaceShop.heroTrustKyc')}</span>
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <ShieldCheck size={13} className="shrink-0 text-slate-800" aria-hidden="true"/>
                                <span>{t('marketplaceShop.heroTrustWorkflow')}</span>
                            </li>
                        </ul>
                    )}
                </div>

                <div className="lg:col-span-5">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-uav-red-light shadow-sm">
                        <Image
                            src={HERO_SLIDES[slideIdx]}
                            alt={t('publicSite.homeRedesign.heroImageAlt')}
                            fill
                            priority
                            sizes="(max-width: 1024px) 100vw, 480px"
                            className="object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent"/>
                        <div
                            className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-slate-950/60 px-2.5 py-1.5 backdrop-blur-xs"
                            role="tablist"
                            aria-label={t('publicSite.homeRedesign.heroImageAlt')}
                        >
                            {HERO_SLIDES.map((src, idx) => (
                                <button
                                    key={src}
                                    type="button"
                                    role="tab"
                                    aria-selected={slideIdx === idx}
                                    aria-label={t('publicSite.header.slideAria', {index: idx + 1})}
                                    onClick={() => setSlideIdx(idx)}
                                    className={`h-2 cursor-pointer rounded-full transition-[width,background-color] duration-200 ${
                                        slideIdx === idx ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
