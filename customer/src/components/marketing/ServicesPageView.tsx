'use client';

import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, ShieldCheck, Sparkles} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {scenes, serviceScenes} from '@/components/marketing/UavPhoto';
import {customerUrl, services} from '@/content/marketing/site-content';
import {serviceDetails} from '@/content/marketing/service-details';
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
                        className="object-cover object-center opacity-55"
                        preload
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-transparent" />
                </div>

                <div className="relative mx-auto flex min-h-[420px] w-full max-w-[1380px] flex-col justify-end px-5 py-12 sm:min-h-[480px] sm:px-8 sm:py-16 lg:px-12">
                    <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
                        <div className="space-y-4 lg:col-span-8">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/80 px-3.5 py-1 text-xs font-semibold tracking-wide text-slate-100 backdrop-blur-xs">
                                <Sparkles size={13} aria-hidden="true" />
                                {t('publicSite.servicesPage.eyebrow')}
                            </span>
                            <h1 className="m-0 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                                {shapeVi(t('publicSite.servicesPage.title'))}
                            </h1>
                            <p className="m-0 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
                                {t('publicSite.servicesPage.subtitle')}
                            </p>
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                <Link
                                    href={`${customerUrl}/missions/create`}
                                    className="group inline-flex min-h-11 items-center gap-2.5 rounded-full bg-primary py-2 pr-2.5 pl-5 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-sm transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-hover active:scale-[0.985]"
                                >
                                    <span>{t('publicSite.servicesPage.primaryCta')}</span>
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                                        <ArrowUpRight size={14} aria-hidden="true" />
                                    </span>
                                </Link>
                                <Link
                                    href={`${customerUrl}/provider/onboarding`}
                                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 text-xs font-semibold whitespace-nowrap text-white backdrop-blur-xs transition-colors hover:bg-white/20"
                                >
                                    {t('publicSite.servicesPage.secondaryCta')}
                                </Link>
                            </div>
                        </div>

                        <div className="lg:col-span-4 lg:flex lg:justify-end">
                            <div className="rounded-panel border border-white/15 bg-slate-950/75 p-4 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                                    <ShieldCheck size={15} aria-hidden="true" />
                                    <span>{t('publicSite.servicesPage.specTitle')}</span>
                                </div>
                                <p className="m-0 mt-1 text-xs text-slate-300">
                                    {t('publicSite.servicesPage.specLine1')}
                                </p>
                                <p className="m-0 mt-0.5 text-[11px] text-slate-400">
                                    {t('publicSite.servicesPage.specLine2')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-[1380px] space-y-12 px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
                <PublicMarketplaceCatalog />
                <MarketplaceTrustBar />

                <div className="space-y-5">
                    <h2 className="m-0 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {shapeVi(t('publicSite.servicesPage.categoriesTitle'))}
                    </h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {services.map((service, index) => {
                            const idx = index + 1;
                            const detail = serviceDetails[service.slug];
                            const sceneKey = serviceScenes[service.slug] ?? 'rentalFleet';
                            const photo = scenes[sceneKey];
                            return (
                                <Link
                                    key={service.slug}
                                    href={`/services/${service.slug}`}
                                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-2xs transition-shadow hover:shadow-md"
                                >
                                    <div>
                                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                                            <Image
                                                src={photo.src}
                                                alt={photo.alt}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        </div>
                                        <div className="space-y-1.5 p-4">
                                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                                                {detail.code}
                                            </span>
                                            <h3 className="m-0 text-base font-bold text-foreground group-hover:text-primary">
                                                {t(`publicSite.serviceGroups.s${idx}Title`)}
                                            </h3>
                                            <p className="m-0 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                                {t(`publicSite.serviceGroups.s${idx}Text`)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-100 px-4 py-3 text-xs font-bold text-primary">
                                        {t('publicSite.serviceGroups.detailLink')}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <MarketplaceDiptychCta />
            </section>
        </div>
    );
}
