'use client';

import Link from 'next/link';
import {ArrowRight, CheckCircle2, FileCheck2, UserCheck} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {CustomerCta, PublicPage} from '@/components/marketing/PublicPage';
import {PlanCards} from '@/components/marketing/PlanCards';
import {useSiteInfo} from '@/hooks/settings/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';

function formatRatePct(rate: number): string {
    return `${Math.round(rate * 1000) / 10}%`;
}

export function PricingPageView() {
    const {t, locale} = useI18n();
    const {platformFeeRate, proFeeRate, enterpriseFeeRate} = useSiteInfo();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);

    const comparisonRows = [
        {
            feature: t('publicSite.pricing.r1Label'),
            basic: `${t('publicSite.pricing.basicPrice')} ${t('publicSite.pricing.monthlySuffix')}`,
            pro: `${t('publicSite.pricing.proPrice')} ${t('publicSite.pricing.monthlySuffix')}`,
            enterprise: `${t('publicSite.pricing.entPrice')} ${t('publicSite.pricing.monthlySuffix')}`,
        },
        {
            feature: t('publicSite.homeRedesign.pricingFeeLabel'),
            basic: formatRatePct(platformFeeRate),
            pro: formatRatePct(proFeeRate),
            enterprise: formatRatePct(enterpriseFeeRate),
        },
        {
            feature: t('publicSite.pricing.r2Label'),
            basic: t('publicSite.pricing.basicQuota'),
            pro: t('publicSite.pricing.proQuota'),
            enterprise: t('publicSite.pricing.entQuota'),
        },
        {
            feature: t('publicSite.pricing.r3Label'),
            basic: t('publicSite.pricing.basicFleet'),
            pro: t('publicSite.pricing.proFleet'),
            enterprise: t('publicSite.pricing.entFleet'),
        },
        {
            feature: t('publicSite.pricing.r4Label'),
            basic: t('publicSite.pricing.r4Val'),
            pro: t('publicSite.pricing.r4Val'),
            enterprise: t('publicSite.pricing.r4Val'),
        },
        {
            feature: t('publicSite.pricing.r5Label'),
            basic: t('publicSite.pricing.r5Basic'),
            pro: t('publicSite.pricing.r5Pro'),
            enterprise: t('publicSite.pricing.r5Ent'),
        },
    ];

    return (
        <PublicPage
            eyebrow={t('publicSite.pricing.pageEyebrow')}
            title={t('publicSite.pricing.pageTitle')}
            intro={t('publicSite.pricing.pageIntro')}
            scene="rentalFleet"
        >
            <div className="space-y-12">
                {/* Customer Free Account Card */}
                <section
                    aria-labelledby="pricing-customer-heading"
                    className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 sm:flex-row sm:items-center"
                >
                    <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-uav-red-light px-3 py-1 text-xs font-bold text-primary">
                            <UserCheck size={14} aria-hidden="true"/>
                            {t('publicSite.homeRedesign.pricingCustomerBadge')}
                        </span>
                        <h2 id="pricing-customer-heading" className="m-0 text-xl font-extrabold text-slate-900">
                            {t('publicSite.homeRedesign.pricingCustomerTitle')}
                        </h2>
                        <p className="m-0 max-w-2xl text-sm text-slate-600">
                            {t('publicSite.homeRedesign.pricingCustomerDesc')}
                        </p>
                        <ul className="m-0 flex flex-wrap gap-3 list-none p-0 pt-1 text-xs font-semibold text-slate-700">
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-primary" aria-hidden="true"/>
                                {t('publicSite.homeRedesign.pricingCustomerP1')}
                            </li>
                            <li className="inline-flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-primary" aria-hidden="true"/>
                                {t('publicSite.homeRedesign.pricingCustomerP2')}
                            </li>
                        </ul>
                    </div>
                    <Link
                        href="/services"
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-primary px-5 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                        <span>{t('publicSite.homeRedesign.heroPrimaryCta')}</span>
                        <ArrowRight size={14} aria-hidden="true"/>
                    </Link>
                </section>

                {/* Partner Fleet Plans */}
                <section aria-labelledby="pricing-tiers-heading" className="space-y-4">
                    <div className="space-y-1">
                        <h2 id="pricing-tiers-heading" className="m-0 text-2xl font-black tracking-tight text-foreground">
                            {shapeVi(t('publicSite.pricing.tiersHeading'))}
                        </h2>
                        <p className="m-0 text-sm text-slate-600">{t('publicSite.homeRedesign.pricingPartnerIntro')}</p>
                    </div>
                    <PlanCards detailed/>
                </section>

                {/* Comparison Table */}
                <section aria-labelledby="pricing-comparison-heading" className="space-y-4">
                    <h2 id="pricing-comparison-heading" className="text-2xl font-black tracking-tight text-foreground">
                        {shapeVi(t('publicSite.pricing.compHeading'))}
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                            <thead className="border-b border-border bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3.5 sm:px-5">{t('publicSite.pricing.colFeature')}</th>
                                    <th className="whitespace-nowrap px-4 py-3.5 tabular-nums sm:px-5">
                                        Basic · {t('publicSite.pricing.basicPrice')}
                                    </th>
                                    <th className="whitespace-nowrap bg-uav-red-light/40 px-4 py-3.5 text-primary tabular-nums sm:px-5">
                                        Pro · {t('publicSite.pricing.proPrice')}
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3.5 tabular-nums sm:px-5">
                                        Enterprise · {t('publicSite.pricing.entPrice')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-xs sm:text-sm">
                                {comparisonRows.map(row => (
                                    <tr key={row.feature} className="hover:bg-slate-50/70">
                                        <th scope="row" className="px-5 py-3.5 font-semibold text-foreground">
                                            {row.feature}
                                        </th>
                                        <td className="px-5 py-3.5 text-slate-600 tabular-nums">{row.basic}</td>
                                        <td className="bg-uav-red-light/20 px-5 py-3.5 font-semibold text-slate-900 tabular-nums">
                                            {row.pro}
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-uav-blue tabular-nums">
                                            {row.enterprise}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-xs text-slate-600">
                    <FileCheck2 size={16} className="shrink-0 text-primary" aria-hidden="true"/>
                    <span>{t('publicSite.pricing.policyNote')}</span>
                    <Link href="/terms" className="font-bold text-primary hover:underline">
                        {t('publicSite.pricing.policyLink')}
                    </Link>
                </div>

                <CustomerCta/>
            </div>
        </PublicPage>
    );
}
