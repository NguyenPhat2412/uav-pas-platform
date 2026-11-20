'use client';

import {Suspense} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, Sparkles} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {scenes} from '@/components/marketing/UavPhoto';
import {customerUrl} from '@/content/marketing/origins';
import {PublicMarketplaceCatalog} from '@/components/marketplace/catalog/PublicMarketplaceCatalog';
import {MarketplaceDiptychCta, MarketplaceTrustBar} from '@/components/marketplace/catalog/MarketplaceSections';
import {useI18n} from '@/providers/I18nContext';

export function ServicesPageView() {
    const {t, locale} = useI18n();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);
    const heroPhoto = scenes.inspectionGrid;

    return (
        <div className="bg-card text-foreground">
            <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
                <div className="absolute inset-0">
                    <Image
                        src={heroPhoto.src}
                        alt={heroPhoto.alt}
                        fill
                        sizes="100vw"
                        className="object-cover object-center opacity-50"
                        preload
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/35"/>
                </div>

                <div className="relative mx-auto flex min-h-[300px] w-full max-w-[1380px] flex-col justify-end px-4 py-10 sm:min-h-[340px] sm:px-6 sm:py-12 lg:px-8">
                    <div className="max-w-2xl space-y-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur-xs">
                            <Sparkles size={13} aria-hidden="true"/>
                            {t('publicSite.servicesPage.eyebrow')}
                        </span>
                        <h1 className="m-0 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                            {shapeVi(t('publicSite.servicesPage.title'))}
                        </h1>
                        <p className="m-0 text-sm leading-relaxed text-slate-200">
                            {t('publicSite.servicesPage.subtitle')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            <Link
                                href={`${customerUrl}/services`}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                            >
                                <span>{t('publicSite.servicesPage.primaryCta')}</span>
                                <ArrowUpRight size={14} aria-hidden="true"/>
                            </Link>
                            <Link
                                href={`${customerUrl}/provider/onboarding`}
                                className="inline-flex min-h-10 items-center justify-center rounded-control border border-white/25 bg-white/10 px-4 text-xs font-bold whitespace-nowrap text-white backdrop-blur-xs transition-colors hover:bg-white/20"
                            >
                                {t('publicSite.servicesPage.secondaryCta')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <Suspense fallback={null}>
                <PublicMarketplaceCatalog/>
            </Suspense>

            <section className="mx-auto w-full max-w-[1380px] space-y-10 px-4 py-10 sm:px-6 lg:px-8">
                <MarketplaceTrustBar/>
                <MarketplaceDiptychCta/>
            </section>
        </div>
    );
}
