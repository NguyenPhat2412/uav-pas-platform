'use client';

import Link from 'next/link';
import {ArrowRight, Grid3X3, Radio, ShieldAlert} from 'lucide-react';
import {HomeSimulationHighlightSection} from '@/components/marketing/HomeSimulationHighlightSection';
import {CustomerCta} from '@/components/marketing/PublicPage';
import {useI18n} from '@/providers/I18nContext';

export function FlightSimulationPageView() {
    const {t} = useI18n();

    const capabilities = [
        {
            icon: Grid3X3,
            title: t('publicSite.simulationPage.c1Title'),
            description: t('publicSite.simulationPage.c1Desc'),
        },
        {
            icon: ShieldAlert,
            title: t('publicSite.simulationPage.c2Title'),
            description: t('publicSite.simulationPage.c2Desc'),
        },
        {
            icon: Radio,
            title: t('publicSite.simulationPage.c3Title'),
            description: t('publicSite.simulationPage.c3Desc'),
        },
    ];

    return (
        <div className="bg-card text-foreground">
            <section className="border-b border-slate-200 bg-slate-50/70 py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-4 px-4 sm:px-6 lg:px-8">
                    <span className="inline-flex items-center rounded-full bg-uav-red-light px-3 py-1 text-xs font-bold text-primary">
                        {t('publicSite.simulationPage.badge')}
                    </span>
                    <h1 className="m-0 max-w-3xl text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        {t('publicSite.simulationPage.title')}
                    </h1>
                    <p className="m-0 max-w-2xl text-sm leading-relaxed text-slate-600">
                        {t('publicSite.simulationPage.intro')}
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                        <Link
                            href="/services"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                            <span>{t('publicSite.simulationPage.primaryCta')}</span>
                            <ArrowRight size={14} aria-hidden="true"/>
                        </Link>
                        <Link
                            href="/how-it-works"
                            className="inline-flex min-h-10 items-center justify-center rounded-control border border-slate-300 bg-white px-4 text-xs font-bold whitespace-nowrap text-slate-800 transition-colors hover:border-primary hover:text-primary"
                        >
                            {t('publicSite.simulationPage.secondaryCta')}
                        </Link>
                    </div>
                </div>
            </section>

            <HomeSimulationHighlightSection/>

            <section className="py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-10 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {capabilities.map(({icon: Icon, title, description}) => (
                            <article key={title} className="space-y-2.5 rounded-panel border border-slate-200 bg-white p-5 shadow-2xs">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                    <Icon size={19} aria-hidden="true"/>
                                </span>
                                <h2 className="m-0 text-base font-bold text-slate-900">{title}</h2>
                                <p className="m-0 text-xs leading-relaxed text-slate-600">{description}</p>
                            </article>
                        ))}
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
