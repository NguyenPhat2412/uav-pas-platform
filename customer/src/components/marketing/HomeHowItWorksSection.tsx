'use client';

import {MapPin, PackageCheck, Search, ShieldCheck, type LucideIcon} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

interface StepItem {
    num: string;
    icon: LucideIcon;
    titleKey: string;
    descKey: string;
}

const STEPS: readonly StepItem[] = [
    {num: '01', icon: Search, titleKey: 'publicSite.homeRedesign.step1Title', descKey: 'publicSite.homeRedesign.step1Desc'},
    {num: '02', icon: MapPin, titleKey: 'publicSite.homeRedesign.step2Title', descKey: 'publicSite.homeRedesign.step2Desc'},
    {num: '03', icon: ShieldCheck, titleKey: 'publicSite.homeRedesign.step3Title', descKey: 'publicSite.homeRedesign.step3Desc'},
    {num: '04', icon: PackageCheck, titleKey: 'publicSite.homeRedesign.step4Title', descKey: 'publicSite.homeRedesign.step4Desc'},
] as const;

export function HomeHowItWorksSection() {
    const {t} = useI18n();

    return (
        <section
            aria-labelledby="home-steps-heading"
            className="border-b border-slate-200 bg-slate-50/70 py-9 sm:py-11"
        >
            <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 sm:px-6 lg:px-8">
                <div className="space-y-1">
                    <h2 id="home-steps-heading" className="m-0 text-lg font-extrabold text-slate-900 sm:text-2xl">
                        {t('publicSite.homeRedesign.stepsTitle')}
                    </h2>
                    <p className="m-0 text-xs text-slate-600 sm:text-sm">
                        {t('publicSite.homeRedesign.stepsSubtitle')}
                    </p>
                </div>

                <ol className="m-0 grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map(({num, icon: Icon, titleKey, descKey}) => (
                        <li
                            key={num}
                            className="flex flex-col gap-2.5 rounded-panel border border-slate-200 bg-white p-4 shadow-2xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                    <Icon size={19} aria-hidden="true"/>
                                </span>
                                <span className="font-mono text-xs font-extrabold text-slate-400">{num}</span>
                            </div>
                            <h3 className="m-0 text-sm font-bold text-slate-900">{t(titleKey)}</h3>
                            <p className="m-0 line-clamp-2 text-xs leading-relaxed text-slate-600">{t(descKey)}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
