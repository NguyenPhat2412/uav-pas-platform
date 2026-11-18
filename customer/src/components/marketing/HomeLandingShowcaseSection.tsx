'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Card} from '@/components/ui';
import {keepVietnamesePhrases} from '@/lib/typography';
import {fieldTeam, pilotFromAbove} from '@/content/marketing/home-content';
import {HistoryTimeline} from '@/components/marketing/HomeHistoryTimeline';
import {DroneAnatomy} from '@/components/marketing/HomeDroneAnatomy';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';

export function HomeLandingShowcaseSection() {
    const {t, locale} = useI18n();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);

    const fieldCaptions = [
        t('publicSite.showcase.field1Caption'),
        t('publicSite.showcase.field2Caption'),
        t('publicSite.showcase.field3Caption'),
        t('publicSite.showcase.field4Caption'),
    ];

    return (
        <>
            {/* PILOT BANNER */}
            <section
                className="relative flex min-h-[420px] w-full items-end overflow-hidden py-16 text-white"
                aria-labelledby="home-pilot-title"
            >
                <Image
                    src={pilotFromAbove.src}
                    alt={pilotFromAbove.alt}
                    fill
                    sizes="100vw"
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
                <div className="relative z-10 mx-auto w-full max-w-[1380px] space-y-3 px-5 sm:px-8 lg:px-12">
                    <p className="flex items-baseline gap-3 text-xs font-bold uppercase tracking-widest text-rose-300">
                        {t('publicSite.showcase.pilotEyebrow')}{' '}
                        <span lang="ja" className="text-sm normal-case text-slate-300">
                            {t('publicSite.showcase.pilotJp')}
                        </span>
                    </p>
                    <h2
                        id="home-pilot-title"
                        className="max-w-2xl text-2xl font-black tracking-tight text-white sm:text-4xl"
                    >
                        {shapeVi(t('publicSite.showcase.pilotTitle'))}
                    </h2>
                    <p className="max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
                        {t('publicSite.showcase.pilotText')}
                    </p>
                    <a
                        className="inline-block pt-2 text-xs text-slate-300 underline hover:text-white"
                        href={pilotFromAbove.source}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t('publicSite.showcase.pilotCaption')} · {t('publicSite.planner.photoCreditPrefix')}{' '}
                        {pilotFromAbove.credit}
                    </a>
                </div>
            </section>

            {/* DRONE ANATOMY */}
            <section
                className="border-b border-border bg-slate-50/60 py-16 sm:py-20"
                aria-labelledby="home-anatomy-title"
            >
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-anatomy-title"
                        eyebrow={t('publicSite.showcase.anatomyEyebrow')}
                        jp={t('publicSite.showcase.anatomyJp')}
                        title={t('publicSite.showcase.anatomyTitle')}
                        text={t('publicSite.showcase.anatomyText')}
                    />
                    <DroneAnatomy />
                </div>
            </section>

            {/* HISTORY TIMELINE */}
            <HistoryTimeline>
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-history-title"
                        eyebrow={t('publicSite.showcase.historyEyebrow')}
                        jp={t('publicSite.showcase.historyJp')}
                        title={t('publicSite.showcase.historyTitle')}
                        text={t('publicSite.showcase.historyText')}
                    />
                </div>
            </HistoryTimeline>

            {/* FIELD TEAM */}
            <section
                className="border-b border-border bg-slate-50/60 py-16 sm:py-20"
                aria-labelledby="home-field-title"
            >
                <div className="mx-auto w-full max-w-[1380px] space-y-6 px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-field-title"
                        eyebrow={t('publicSite.showcase.fieldEyebrow')}
                        jp={t('publicSite.showcase.fieldJp')}
                        title={t('publicSite.showcase.fieldTitle')}
                        text={t('publicSite.showcase.fieldText')}
                    />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {fieldTeam.map((photo, index) => (
                            <Card
                                key={photo.src}
                                className={cn(
                                    'relative overflow-hidden rounded-2xl border-border shadow-xs',
                                    photo.layout === 'wide' && 'md:col-span-2',
                                )}
                            >
                                <figure className="m-0">
                                    <div className="relative aspect-[16/10] w-full">
                                        <Image
                                            src={photo.src}
                                            alt={photo.alt}
                                            fill
                                            className="object-cover"
                                            sizes={
                                                photo.layout === 'wide'
                                                    ? '(max-width: 900px) 100vw, 66vw'
                                                    : '(max-width: 900px) 100vw, 33vw'
                                            }
                                        />
                                    </div>
                                    <figcaption className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs text-slate-600">
                                        <span>{fieldCaptions[index] ?? photo.caption}</span>
                                        <a
                                            className="font-semibold text-slate-500 hover:text-primary"
                                            href={photo.source}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {t('publicSite.planner.photoCreditPrefix')}{' '}
                                            {photo.credit}
                                        </a>
                                    </figcaption>
                                </figure>
                            </Card>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">{t('publicSite.showcase.usgsNote')}</p>
                </div>
            </section>

            {/* BOTTOM CTA */}
            <section
                className="relative isolate overflow-hidden bg-slate-950 py-16 text-white sm:py-20"
                aria-labelledby="home-cta-title"
            >
                <div
                    className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--primary)_0%,transparent_60%)] opacity-35"
                    aria-hidden="true"
                />
                <div className="absolute inset-x-0 top-0 -z-10 h-1 bg-primary" aria-hidden="true" />
                <div className="relative z-10 mx-auto flex w-full max-w-[1380px] flex-wrap items-center justify-between gap-8 px-5 sm:px-8 lg:px-12">
                    <div className="max-w-xl space-y-3">
                        <p className="text-xs font-extrabold uppercase tracking-widest text-rose-300">
                            {t('publicSite.showcase.ctaEyebrow')}
                        </p>
                        <h2
                            id="home-cta-title"
                            className="text-2xl font-black tracking-tight text-white sm:text-4xl"
                        >
                            {shapeVi(t('publicSite.showcase.ctaTitle'))}
                        </h2>
                        <p className="text-sm text-slate-300 sm:text-base">
                            {t('publicSite.showcase.ctaText')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3.5">
                        <Link
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover"
                            href="/?auth=register"
                        >
                            {t('publicSite.showcase.ctaPrimary')}
                        </Link>
                        <Link
                            className="inline-flex min-h-11 items-center justify-center rounded-control border border-white/30 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
                            href="/pricing"
                        >
                            {t('publicSite.showcase.ctaSecondary')}
                        </Link>
                        <Link
                            className="px-2 text-sm font-bold text-slate-200 underline underline-offset-4 hover:text-white"
                            href="/services"
                        >
                            {t('publicSite.showcase.ctaTertiary')}
                        </Link>
                    </div>
                    <Image
                        className="pointer-events-none absolute top-1/2 -right-12 -translate-y-1/2 opacity-10 grayscale invert"
                        src="/uav-pas-logo.svg"
                        alt=""
                        width={320}
                        height={320}
                        aria-hidden="true"
                        unoptimized
                    />
                </div>
            </section>
        </>
    );
}
