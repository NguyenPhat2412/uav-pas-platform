'use client';

import Link from 'next/link';
import {FileCheck2} from 'lucide-react';
import {keepVietnamesePhrases} from '@/lib/typography';
import {CustomerCta, PublicPage} from '@/components/marketing/PublicPage';
import {PlanCards} from '@/components/marketing/PlanCards';
import {useI18n} from '@/providers/I18nContext';

export function PricingPageView() {
    const {t, locale} = useI18n();
    const shapeVi = (text: string) => (locale === 'vi' ? keepVietnamesePhrases(text) : text);

    const comparisonRows = [
        {
            feature: t('publicSite.pricing.r1Label'),
            basic: `${t('publicSite.pricing.basicPrice')} ${t('publicSite.pricing.monthlySuffix')}`,
            pro: `${t('publicSite.pricing.proPrice')} ${t('publicSite.pricing.monthlySuffix')}`,
            enterprise: `${t('publicSite.pricing.entPrice')} ${t('publicSite.pricing.monthlySuffix')}`,
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
        {
            feature: t('publicSite.pricing.r6Label'),
            basic: t('publicSite.pricing.r6Basic'),
            pro: t('publicSite.pricing.r6Pro'),
            enterprise: t('publicSite.pricing.r6Ent'),
        },
        {
            feature: t('publicSite.pricing.r7Label'),
            basic: t('publicSite.pricing.r7Basic'),
            pro: t('publicSite.pricing.r7Pro'),
            enterprise: t('publicSite.pricing.r7Ent'),
        },
        {
            feature: t('publicSite.pricing.r8Label'),
            basic: t('publicSite.pricing.r8Basic'),
            pro: t('publicSite.pricing.r8Pro'),
            enterprise: t('publicSite.pricing.r8Ent'),
        },
    ];

    const paymentSteps = [
        {
            step: '01',
            title: t('publicSite.pricing.wf1Title'),
            detail: t('publicSite.pricing.wf1Desc'),
        },
        {
            step: '02',
            title: t('publicSite.pricing.wf2Title'),
            detail: t('publicSite.pricing.wf2Desc'),
        },
        {
            step: '03',
            title: t('publicSite.pricing.wf3Title'),
            detail: t('publicSite.pricing.wf3Desc'),
        },
    ];

    return (
        <PublicPage
            eyebrow={t('publicSite.pricing.pageEyebrow')}
            title={t('publicSite.pricing.pageTitle')}
            intro={t('publicSite.pricing.pageIntro')}
            scene="landing"
        >
            <div className="space-y-14">
                <section aria-labelledby="pricing-tiers-heading" className="space-y-6">
                    <h2
                        id="pricing-tiers-heading"
                        className="text-2xl font-black tracking-tight text-foreground"
                    >
                        {shapeVi(t('publicSite.pricing.tiersHeading'))}
                    </h2>
                    <PlanCards detailed />
                </section>

                <section aria-labelledby="pricing-comparison-heading" className="space-y-4">
                    <h2
                        id="pricing-comparison-heading"
                        className="text-2xl font-black tracking-tight text-foreground"
                    >
                        {shapeVi(t('publicSite.pricing.compHeading'))}
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                            <thead className="border-b border-border bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                                        {t('publicSite.pricing.colFeature')}
                                    </th>
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
                                {comparisonRows.map((row) => (
                                    <tr key={row.feature} className="hover:bg-slate-50/70">
                                        <th
                                            scope="row"
                                            className="px-5 py-3.5 font-semibold text-foreground"
                                        >
                                            {row.feature}
                                        </th>
                                        <td className="px-5 py-3.5 text-slate-600">{row.basic}</td>
                                        <td className="bg-uav-red-light/20 px-5 py-3.5 font-semibold text-slate-900">
                                            {row.pro}
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-uav-blue">
                                            {row.enterprise}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section aria-labelledby="pricing-payment-heading" className="space-y-5">
                    <div className="max-w-3xl space-y-2">
                        <h2
                            id="pricing-payment-heading"
                            className="text-2xl font-black tracking-tight text-foreground"
                        >
                            {shapeVi(t('publicSite.pricing.wfHeading'))}
                        </h2>
                        <p className="text-sm leading-relaxed text-slate-600">
                            {t('publicSite.pricing.wfIntro')}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {paymentSteps.map((item) => (
                            <article
                                key={item.step}
                                className="space-y-2.5 rounded-2xl border border-border bg-card p-6 shadow-xs"
                            >
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-uav-red-light font-mono text-xs font-extrabold text-primary">
                                    {item.step}
                                </span>
                                <h3 className="text-base font-bold text-foreground">
                                    {item.title}
                                </h3>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    {item.detail}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-xs text-slate-600">
                    <FileCheck2 size={16} className="shrink-0 text-primary" aria-hidden="true" />
                    <span>{t('publicSite.pricing.policyNote')}</span>
                    <Link href="/terms" className="font-bold text-primary hover:underline">
                        {t('publicSite.pricing.policyLink')}
                    </Link>
                </div>

                <CustomerCta />
            </div>
        </PublicPage>
    );
}
