'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Card, CardContent, CardFooter} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {MissionPlanner} from '@/components/marketing/HomeMissionPlanner';
import {ProcessRoute} from '@/components/marketing/HomeProcessRoute';
import {FlatTag} from '@/components/marketing/FlatTag';
import {PlanCards} from '@/components/marketing/PlanCards';
import {HomeLandingSectionHead} from '@/components/marketing/HomeLandingSectionHead';

export function HomeLandingPortalsSection() {
    const {t} = useI18n();

    const portals = [
        {
            id: 'customer',
            imageSrc: '/images/uav-people/uav-survey-team.webp',
            imageAlt: t('publicSite.portals.p1Title'),
            badge: t('publicSite.portals.p1Badge'),
            title: t('publicSite.portals.p1Title'),
            description: t('publicSite.portals.p1Desc'),
            capabilities: [
                t('publicSite.portals.p1Cap1'),
                t('publicSite.portals.p1Cap2'),
                t('publicSite.portals.p1Cap3'),
            ],
            href: '/customer/dashboard',
            cta: t('publicSite.portals.p1Cta'),
        },
        {
            id: 'operations',
            imageSrc: '/images/uav-people/uav-field-team.webp',
            imageAlt: t('publicSite.portals.p2Title'),
            badge: t('publicSite.portals.p2Badge'),
            title: t('publicSite.portals.p2Title'),
            description: t('publicSite.portals.p2Desc'),
            capabilities: [
                t('publicSite.portals.p2Cap1'),
                t('publicSite.portals.p2Cap2'),
                t('publicSite.portals.p2Cap3'),
            ],
            href: '/how-it-works',
            cta: t('publicSite.portals.p2Cta'),
        },
        {
            id: 'admin',
            imageSrc: '/images/uav-people/uav-workshop-team.webp',
            imageAlt: t('publicSite.portals.p3Title'),
            badge: t('publicSite.portals.p3Badge'),
            title: t('publicSite.portals.p3Title'),
            description: t('publicSite.portals.p3Desc'),
            capabilities: [
                t('publicSite.portals.p3Cap1'),
                t('publicSite.portals.p3Cap2'),
                t('publicSite.portals.p3Cap3'),
            ],
            href: '/terms',
            cta: t('publicSite.portals.p3Cta'),
        },
    ];

    const processSteps = [
        {
            number: '01',
            title: t('publicSite.process.st1Title'),
            text: t('publicSite.process.st1Text'),
        },
        {
            number: '02',
            title: t('publicSite.process.st2Title'),
            text: t('publicSite.process.st2Text'),
        },
        {
            number: '03',
            title: t('publicSite.process.st3Title'),
            text: t('publicSite.process.st3Text'),
        },
        {
            number: '04',
            title: t('publicSite.process.st4Title'),
            text: t('publicSite.process.st4Text'),
        },
    ];

    return (
        <>
            {/* PRICING PLANS SHOWCASE */}
            <section
                id="goi-cuoc"
                className="relative isolate scroll-mt-16 overflow-hidden bg-slate-950 py-16 sm:py-24"
                aria-labelledby="home-pricing-title"
            >
                <div
                    className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-35"
                    aria-hidden="true"
                />
                <div className="absolute inset-x-0 top-0 -z-10 h-1 bg-primary" aria-hidden="true" />
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        onPhoto
                        id="home-pricing-title"
                        eyebrow={t('publicSite.pricing.sectionEyebrow')}
                        jp={t('publicSite.pricing.sectionJp')}
                        title={t('publicSite.pricing.sectionTitle')}
                        text={t('publicSite.pricing.sectionText')}
                    />
                    <PlanCards />
                    <p className="m-0 mt-10 text-center text-sm text-white/70">
                        {t('publicSite.pricing.moreQuestion')}{' '}
                        <Link
                            href="/pricing"
                            className="font-bold text-white underline underline-offset-4 hover:text-rose-100"
                        >
                            {t('publicSite.pricing.compareLink')}
                        </Link>
                    </p>
                </div>
            </section>

            {/* INTERACTIVE MISSION PLANNER */}
            <section
                className="border-b border-border bg-slate-50/60 py-16 sm:py-20"
                aria-labelledby="home-missions-title"
            >
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-missions-title"
                        eyebrow={t('publicSite.planner.sectionEyebrow')}
                        jp={t('publicSite.planner.sectionJp')}
                        title={t('publicSite.planner.sectionTitle')}
                        text={t('publicSite.planner.sectionText')}
                    />
                    <MissionPlanner />
                </div>
            </section>

            {/* 3-PORTAL ECOSYSTEM ARCHITECTURE */}
            <section
                className="border-b border-border bg-card py-16 sm:py-20"
                aria-labelledby="home-portals-title"
            >
                <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-portals-title"
                        eyebrow={t('publicSite.portals.sectionEyebrow')}
                        jp={t('publicSite.portals.sectionJp')}
                        title={t('publicSite.portals.sectionTitle')}
                        text={t('publicSite.portals.sectionText')}
                    />
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {portals.map((portal) => (
                            <Card
                                key={portal.id}
                                className="flex flex-col justify-between overflow-hidden rounded-2xl border-border shadow-xs"
                            >
                                <div>
                                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                        <Image
                                            src={portal.imageSrc}
                                            alt={portal.imageAlt}
                                            fill
                                            sizes="(max-width: 900px) 100vw, 33vw"
                                            className="object-cover"
                                        />
                                    </div>
                                    <CardContent className="space-y-2.5 pt-4">
                                        <FlatTag tone="blue">{portal.badge}</FlatTag>
                                        <h3 className="text-lg font-extrabold text-foreground">
                                            {portal.title}
                                        </h3>
                                        <p className="text-xs leading-relaxed text-slate-600">
                                            {portal.description}
                                        </p>
                                        <ul className="space-y-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-700">
                                            {portal.capabilities.map((cap) => (
                                                <li key={cap} className="flex items-start gap-2">
                                                    <span
                                                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                                                        aria-hidden="true"
                                                    />
                                                    <span>{cap}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </div>
                                <CardFooter className="py-3.5">
                                    <Link
                                        href={portal.href}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                                    >
                                        {portal.cta} <span aria-hidden="true">→</span>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* PROCESS STEPS */}
            <section
                className="border-b border-border bg-slate-50/70 py-16 sm:py-20"
                aria-labelledby="home-process-title"
            >
                <div className="mx-auto w-full max-w-[1380px] space-y-8 px-5 sm:px-8 lg:px-12">
                    <HomeLandingSectionHead
                        id="home-process-title"
                        eyebrow={t('publicSite.process.sectionEyebrow')}
                        jp={t('publicSite.process.sectionJp')}
                        title={t('publicSite.process.sectionTitle')}
                        text={t('publicSite.process.sectionText')}
                    />
                    <ProcessRoute steps={processSteps} />
                    <div>
                        <Link
                            className="inline-flex items-center text-sm font-bold text-primary hover:underline"
                            href="/how-it-works"
                        >
                            {t('publicSite.process.moreLink')}
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
