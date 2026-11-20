'use client';

import {MapPin, PackageCheck, Search, ShieldCheck} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {CustomerCta} from '@/components/marketing/PublicPage';
import {HomeSimulationHighlightSection} from '@/components/marketing/HomeSimulationHighlightSection';
import {useI18n} from '@/providers/I18nContext';

export function HowItWorksPageView() {
    const {t} = useI18n();

    const steps = [
        {
            number: '01',
            role: t('publicSite.howItWorksPage.s1Role'),
            icon: Search,
            title: t('publicSite.howItWorksPage.s1Title'),
            short: t('publicSite.howItWorksPage.s1Short'),
        },
        {
            number: '02',
            role: t('publicSite.howItWorksPage.s2Role'),
            icon: MapPin,
            title: t('publicSite.howItWorksPage.s2Title'),
            short: t('publicSite.howItWorksPage.s2Short'),
        },
        {
            number: '03',
            role: t('publicSite.howItWorksPage.s3Role'),
            icon: ShieldCheck,
            title: t('publicSite.howItWorksPage.s3Title'),
            short: t('publicSite.howItWorksPage.s3Short'),
        },
        {
            number: '04',
            role: t('publicSite.howItWorksPage.s4Role'),
            icon: PackageCheck,
            title: t('publicSite.howItWorksPage.s4Title'),
            short: t('publicSite.howItWorksPage.s4Short'),
        },
    ];

    const orderStages = [
        {step: '1', name: t('publicSite.howItWorksPage.stage1')},
        {step: '2', name: t('publicSite.howItWorksPage.stage2')},
        {step: '3', name: t('publicSite.howItWorksPage.stage3')},
        {step: '4', name: t('publicSite.howItWorksPage.stage4')},
        {step: '5', name: t('publicSite.howItWorksPage.stage5')},
    ];

    return (
        <div className="bg-card text-foreground">
            <section className="border-b border-border bg-slate-50/70 py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-2xl space-y-2">
                        <p className="m-0 text-xs font-extrabold tracking-widest text-primary uppercase">
                            {t('publicSite.howItWorksPage.eyebrow')}
                        </p>
                        <h1 className="m-0 text-2xl font-black tracking-tight text-foreground sm:text-4xl">
                            {keepVietnamesePhrases(t('publicSite.howItWorksPage.title'))}
                        </h1>
                        <p className="m-0 text-sm leading-relaxed text-slate-600">
                            {t('publicSite.howItWorksPage.intro')}
                        </p>
                    </div>

                    <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
                        {steps.map(({number, role, icon: Icon, title, short}) => (
                            <li key={number} className="flex flex-col gap-3 rounded-panel border border-slate-200 bg-white p-5 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                        <Icon size={19} aria-hidden="true"/>
                                    </span>
                                    <span className="font-mono text-xs font-extrabold text-slate-400">
                                        {number} · {role}
                                    </span>
                                </div>
                                <h2 className="m-0 text-base font-bold text-slate-900">{keepVietnamesePhrases(title)}</h2>
                                <p className="m-0 text-xs leading-relaxed text-slate-600">{short}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <HomeSimulationHighlightSection/>

            <section className="py-10 sm:py-14">
                <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 sm:px-6 lg:px-8">
                    <div className="space-y-4">
                        <h2 className="m-0 text-xl font-black tracking-tight text-foreground sm:text-2xl">
                            {t('publicSite.howItWorksPage.stagesHeading')}
                        </h2>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            {orderStages.map(stage => (
                                <div key={stage.step} className="flex flex-col items-center rounded-panel border border-border bg-slate-50/70 p-4 text-center">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-mono text-xs font-black text-white">
                                        {stage.step}
                                    </span>
                                    <span className="mt-2 text-xs font-bold text-foreground">{stage.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <CustomerCta/>
                </div>
            </section>
        </div>
    );
}
