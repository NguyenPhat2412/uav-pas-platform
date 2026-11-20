'use client';

import Image from 'next/image';
import Link from 'next/link';
import {ArrowUpRight, CheckCircle2, Lock, ShieldCheck} from 'lucide-react';
import {scenes} from '@/components/marketing/UavPhoto';
import {useI18n} from '@/providers/I18nContext';

export function MarketplaceTrustBar() {
    const {t} = useI18n();
    return (
        <section className="border-b border-slate-200 bg-slate-50/85 py-10 sm:py-12" aria-label={t('publicSite.trust.eyebrow')}>
            <div className="mx-auto w-full max-w-[1380px] space-y-5 px-5 sm:px-8 lg:px-12">
                <div className="text-center">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                        {t('publicSite.trust.eyebrow')}
                    </span>
                    <h2 className="m-0 mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                        {t('publicSite.trust.title')}
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <article className="uav-bezel">
                        <div className="uav-bezel-core h-full p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-900 text-white">
                                    <Lock size={17} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-sm font-bold text-slate-900">{t('publicSite.trust.card1Title')}</h3>
                            </div>
                            <p className="m-0 mt-2.5 text-xs leading-relaxed text-slate-600">
                                {t('publicSite.trust.card1Desc')}
                            </p>
                        </div>
                    </article>

                    <article className="uav-bezel">
                        <div className="uav-bezel-core h-full p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-slate-900 text-white">
                                    <CheckCircle2 size={17} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-sm font-bold text-slate-900">{t('publicSite.trust.card2Title')}</h3>
                            </div>
                            <p className="m-0 mt-2.5 text-xs leading-relaxed text-slate-600">
                                {t('publicSite.trust.card2Desc')}
                            </p>
                        </div>
                    </article>

                    <article className="uav-bezel">
                        <div className="uav-bezel-core h-full p-5">
                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-uav-red-light text-primary">
                                    <ShieldCheck size={17} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-sm font-bold text-slate-900">{t('publicSite.trust.card3Title')}</h3>
                            </div>
                            <p className="m-0 mt-2.5 text-xs leading-relaxed text-slate-600">
                                {t('publicSite.trust.card3Desc')}
                            </p>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}

export function MarketplaceDiptychCta() {
    const {t} = useI18n();
    const hardwarePhoto = scenes.edgePayload;
    return (
        <section className="overflow-hidden rounded-panel border border-slate-200 bg-white shadow-2xs" aria-label={t('publicSite.diptych.buyerTitle')}>
            <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="flex flex-col justify-between space-y-6 border-b border-slate-200 bg-background p-7 lg:col-span-6 lg:border-r lg:border-b-0 sm:p-10">
                    <div className="space-y-3">
                        <span className="inline-block rounded-control border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-primary">
                            {t('publicSite.diptych.buyerBadge')}
                        </span>
                        <h2 className="m-0 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                            {t('publicSite.diptych.buyerTitle')}
                        </h2>
                        <p className="m-0 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {t('publicSite.diptych.buyerDesc')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link
                            href="/customer/services"
                            className="group inline-flex min-h-11 items-center gap-2.5 rounded-control bg-primary px-5 py-2 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                            <span>{t('publicSite.diptych.buyerPrimary')}</span>
                            <ArrowUpRight size={14} aria-hidden="true"/>
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex min-h-11 items-center justify-center rounded-control border border-slate-300 bg-white px-5 text-xs font-bold whitespace-nowrap text-slate-800 transition-colors hover:bg-slate-50"
                        >
                            {t('publicSite.diptych.buyerSecondary')}
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col justify-between space-y-6 bg-slate-50 p-7 sm:p-10 lg:col-span-6">
                    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-12">
                        <div className="space-y-2.5 sm:col-span-7">
                            <span className="inline-block rounded-control bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                                {t('publicSite.diptych.sellerBadge')}
                            </span>
                            <h2 className="m-0 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                                {t('publicSite.diptych.sellerTitle')}
                            </h2>
                            <p className="m-0 text-xs leading-relaxed text-slate-600">
                                {t('publicSite.diptych.sellerDesc')}
                            </p>
                        </div>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-panel border border-slate-200 bg-slate-900 sm:col-span-5">
                            <Image
                                src={hardwarePhoto.src}
                                alt={hardwarePhoto.alt}
                                fill
                                sizes="(max-width: 640px) 100vw, 240px"
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <Link
                            href="/customer/provider/onboarding"
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-slate-900 px-5 text-xs font-bold whitespace-nowrap text-white transition-colors hover:bg-slate-800"
                        >
                            <span>{t('publicSite.diptych.sellerPrimary')}</span>
                            <ArrowUpRight size={14} aria-hidden="true"/>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
