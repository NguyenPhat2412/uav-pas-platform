'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Card, CardContent} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {useI18n} from '@/providers/I18nContext';
import {HeroSlider} from '@/components/marketing/HeroSlider';
import {HeroScrollDownButton} from '@/components/marketing/HeroScrollDownButton';
import {FlatTag} from '@/components/marketing/FlatTag';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';
import {scenes} from '@/components/marketing/UavPhoto';

export function HomeLandingHeroSection() {
    const {t, locale} = useI18n();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);

    const metrics = [
        {
            label: t('publicSite.overview.m1Label'),
            value: t('publicSite.overview.m1Value'),
            detail: t('publicSite.overview.m1Detail'),
        },
        {
            label: t('publicSite.overview.m2Label'),
            value: t('publicSite.overview.m2Value'),
            detail: t('publicSite.overview.m2Detail'),
        },
        {
            label: t('publicSite.overview.m3Label'),
            value: t('publicSite.overview.m3Value'),
            detail: t('publicSite.overview.m3Detail'),
        },
        {
            label: t('publicSite.overview.m4Label'),
            value: t('publicSite.overview.m4Value'),
            detail: t('publicSite.overview.m4Detail'),
        },
    ];

    const productCards = [
        {
            photo: scenes.stepBriefing,
            title: t('publicSite.overview.c1Title'),
            text: t('publicSite.overview.c1Text'),
        },
        {
            photo: scenes.stepPlanning,
            title: t('publicSite.overview.c2Title'),
            text: t('publicSite.overview.c2Text'),
        },
        {
            photo: scenes.stepOrthomosaic,
            title: t('publicSite.overview.c3Title'),
            text: t('publicSite.overview.c3Text'),
        },
    ];

    return (
        <>
            {/* HERO */}
            <section
                className="relative flex min-h-[580px] w-full items-center overflow-hidden sm:min-h-[650px] lg:min-h-[690px]"
                aria-labelledby="home-hero-title"
            >
                <HeroSlider />
                <div className="relative z-20 mx-auto w-full max-w-[1380px] px-6 pt-20 pb-32 sm:px-10 sm:pb-32 lg:px-16">
                    <div className="max-w-[740px] text-white">
                        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#e2c18b]">
                            <span className="h-px w-12 bg-[#e2c18b]" aria-hidden="true" />
                            {t('publicSite.hero.eyebrow')}
                        </p>
                        <h1
                            id="home-hero-title"
                            className="mt-7 text-[38px] font-medium leading-[1.13] tracking-[-0.025em] text-white sm:text-[58px] lg:text-[72px]"
                        >
                            {shapeVi(t('publicSite.hero.titleLine1'))}
                            <br />
                            {shapeVi(t('publicSite.hero.titleLine2'))}
                            <br />
                            <em className="font-medium italic text-[#e2c18b]">
                                {t('publicSite.hero.titleAccent')}
                            </em>
                        </h1>
                        <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-white/80">
                            {t('publicSite.hero.subtitle')}
                        </p>
                        <div className="mt-9 flex flex-wrap items-center gap-3">
                            <Link
                                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-control bg-primary px-7 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover"
                                href="/services"
                            >
                                {t('publicSite.hero.primaryCta')} <span aria-hidden="true">→</span>
                            </Link>
                            <Link
                                className="inline-flex min-h-12 items-center justify-center rounded-control border border-white/40 bg-white/5 px-7 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md transition-colors hover:bg-white/15"
                                href="#goi-cuoc"
                            >
                                {t('publicSite.hero.secondaryCta')}
                            </Link>
                        </div>
                    </div>
                </div>
                <HeroScrollDownButton targetId="home-overview" />
            </section>

            {/* PROJECT OVERVIEW, METRICS & VISUAL PRODUCT PILLARS */}
            <section
                id="home-overview"
                className="scroll-mt-20 border-b border-border bg-card py-16 sm:py-20"
                aria-labelledby="home-project-title"
            >
                <div className="mx-auto w-full max-w-[1380px] space-y-8 px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-project-title"
                        eyebrow={t('publicSite.overview.eyebrow')}
                        jp={t('publicSite.overview.jp')}
                        title={t('publicSite.overview.title')}
                        text={t('publicSite.overview.text')}
                    />
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {metrics.map((metric) => (
                            <Card
                                key={metric.label}
                                className="space-y-1 rounded-2xl border-border bg-slate-50/70 p-4"
                            >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    {metric.label}
                                </span>
                                <p className="text-xl font-black tracking-tight text-primary sm:text-2xl">
                                    {metric.value}
                                </p>
                                <p className="text-xs text-slate-600">{metric.detail}</p>
                            </Card>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {productCards.map((item) => (
                            <Card
                                key={item.title}
                                className="group overflow-hidden rounded-2xl border-border shadow-xs transition-shadow duration-200 hover:shadow-md"
                            >
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                    <Image
                                        src={item.photo.src}
                                        alt={item.photo.alt}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute top-3 left-3">
                                        <FlatTag>{t('publicSite.overview.availableTag')}</FlatTag>
                                    </div>
                                </div>
                                <CardContent className="space-y-1.5 pt-4">
                                    <h3 className="text-base font-bold text-foreground">
                                        {shapeVi(item.title)}
                                    </h3>
                                    <p className="text-xs leading-relaxed text-slate-600">{item.text}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
