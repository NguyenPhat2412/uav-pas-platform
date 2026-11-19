'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Compass, ShieldCheck, Users} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {scenes} from '@/components/marketing/UavPhoto';
import {CustomerCta} from '@/components/marketing/PublicPage';
import {useI18n} from '@/providers/I18nContext';

export function AboutPageView() {
    const {t} = useI18n();

    const pillars = [
        {
            icon: ShieldCheck,
            title: t('publicSite.aboutPage.pillar1Title'),
            description: t('publicSite.aboutPage.pillar1Desc'),
        },
        {
            icon: Compass,
            title: t('publicSite.aboutPage.pillar2Title'),
            description: t('publicSite.aboutPage.pillar2Desc'),
        },
        {
            icon: Users,
            title: t('publicSite.aboutPage.pillar3Title'),
            description: t('publicSite.aboutPage.pillar3Desc'),
        },
    ];

    return (
        <div className="bg-card text-foreground">
            <section className="relative flex min-h-[320px] w-full items-end overflow-hidden py-12 text-white">
                <Image
                    src={scenes.rentalFleet.src}
                    alt={t('publicSite.aboutPage.heroImageAlt')}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                    preload
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30"/>
                <div className="relative z-10 mx-auto w-full max-w-[1280px] space-y-3 px-4 sm:px-6 lg:px-8">
                    <p className="m-0 text-xs font-extrabold tracking-widest text-rose-400 uppercase">
                        {t('publicSite.aboutPage.eyebrow')}
                    </p>
                    <h1 className="m-0 max-w-3xl text-2xl leading-tight font-black tracking-tight text-white sm:text-4xl">
                        {keepVietnamesePhrases(t('publicSite.aboutPage.title'))}
                    </h1>
                </div>
            </section>

            <section className="py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-10 px-4 sm:px-6 lg:px-8">
                    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                        <h2 className="m-0 text-lg font-extrabold text-slate-900">
                            {t('publicSite.aboutPage.scopeHeading')}
                        </h2>
                        <p className="m-0 text-sm leading-relaxed text-slate-700">
                            {t('publicSite.aboutPage.scopeBody')}
                        </p>
                        <p className="m-0 text-xs leading-relaxed text-slate-600">
                            {t('publicSite.aboutPage.scopeIllustrativeNote')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {pillars.map(({icon: Icon, title, description}) => (
                            <article key={title} className="space-y-2.5 rounded-panel border border-slate-200 bg-white p-5 shadow-2xs">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                    <Icon size={19} aria-hidden="true"/>
                                </span>
                                <h3 className="m-0 text-base font-bold text-slate-900">{title}</h3>
                                <p className="m-0 text-xs leading-relaxed text-slate-600">{description}</p>
                            </article>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-slate-200 bg-white px-5 py-4 text-xs text-slate-600">
                        <span>{t('publicSite.aboutPage.creditsBannerText')}</span>
                        <Link href="/credits" className="font-bold text-primary hover:underline">
                            {t('publicSite.aboutPage.creditsBannerLink')}
                        </Link>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
