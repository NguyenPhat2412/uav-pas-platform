'use client';

import Link from 'next/link';
import {ArrowRight, ClipboardList, MessageSquare, Users, Wallet} from 'lucide-react';
import {customerUrl} from '@/content/marketing/origins';
import {useI18n} from '@/providers/I18nContext';

export function HomePartnerCtaSection() {
    const {t} = useI18n();

    const benefits = [
        {icon: ClipboardList, label: t('publicSite.homeRedesign.partnerB1')},
        {icon: Users, label: t('publicSite.homeRedesign.partnerB2')},
        {icon: Wallet, label: t('publicSite.homeRedesign.partnerB3')},
    ];

    return (
        <section
            aria-labelledby="home-partner-heading"
            className="bg-slate-50/70 py-9 sm:py-12"
        >
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-7 lg:flex-row lg:items-center">
                    <div className="space-y-3">
                        <h2 id="home-partner-heading" className="m-0 text-lg font-extrabold text-slate-900 sm:text-2xl">
                            {t('publicSite.homeRedesign.partnerTitle')}
                        </h2>
                        <p className="m-0 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {t('publicSite.homeRedesign.partnerSubtitle')}
                        </p>
                        <ul className="m-0 flex flex-wrap gap-3 list-none p-0 pt-1">
                            {benefits.map(({icon: Icon, label}) => (
                                <li
                                    key={label}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800"
                                >
                                    <Icon size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                                    <span>{label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                        <Link
                            href={`${customerUrl}/provider/onboarding`}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-control bg-primary px-5 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                            <span>{t('publicSite.homeRedesign.heroSecondaryCta')}</span>
                            <ArrowRight size={14} aria-hidden="true"/>
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-4 text-xs font-bold whitespace-nowrap text-slate-800 transition-colors hover:border-primary hover:text-primary"
                        >
                            <MessageSquare size={14} aria-hidden="true"/>
                            <span>{t('publicSite.homeRedesign.contactCta')}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
