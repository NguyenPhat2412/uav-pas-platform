'use client';

import Link from 'next/link';
import {Check, Star} from 'lucide-react';
import {FlatTag} from '@/components/marketing/FlatTag';
import {useSiteInfo} from '@/hooks/useSiteInfo';
import {useI18n} from '@/providers/I18nContext';

function formatRatePct(rate: number): string {
    return `${Math.round(rate * 1000) / 10}%`;
}

/**
 * Three-tier partner subscription cards reading platform coordination fee rates dynamically from
 * `/api/v1/public/site-info` (`marketplace.*_fee_rate`) without hardcoding fee percentages.
 */
export function PlanCards({detailed = false}: { detailed?: boolean }) {
    const {t} = useI18n();
    const {platformFeeRate, proFeeRate, enterpriseFeeRate} = useSiteInfo();

    const plans = [
        {
            code: 'BASIC',
            featured: false,
            sarAiIncluded: false,
            feeRate: formatRatePct(platformFeeRate),
            badge: t('publicSite.pricing.basicBadge'),
            name: t('publicSite.pricing.basicName'),
            subtitle: t('publicSite.pricing.basicSubtitle'),
            monthlyVnd: t('publicSite.pricing.basicPrice'),
            quota: t('publicSite.pricing.basicQuota'),
            fleet: t('publicSite.pricing.basicFleet'),
            targetAudience: t('publicSite.pricing.basicAudience'),
            highlights: [
                t('publicSite.pricing.basicH1'),
                t('publicSite.pricing.basicH2'),
                t('publicSite.pricing.basicH3'),
                t('publicSite.pricing.basicH4'),
            ],
        },
        {
            code: 'PRO',
            featured: true,
            sarAiIncluded: true,
            feeRate: formatRatePct(proFeeRate),
            badge: t('publicSite.pricing.popularBadge'),
            name: t('publicSite.pricing.proName'),
            subtitle: t('publicSite.pricing.proSubtitle'),
            monthlyVnd: t('publicSite.pricing.proPrice'),
            quota: t('publicSite.pricing.proQuota'),
            fleet: t('publicSite.pricing.proFleet'),
            targetAudience: t('publicSite.pricing.proAudience'),
            highlights: [
                t('publicSite.pricing.proH1'),
                t('publicSite.pricing.proH2'),
                t('publicSite.pricing.proH3'),
                t('publicSite.pricing.proH4'),
            ],
        },
        {
            code: 'ENTERPRISE',
            featured: false,
            sarAiIncluded: true,
            feeRate: formatRatePct(enterpriseFeeRate),
            badge: t('publicSite.pricing.entBadge'),
            name: t('publicSite.pricing.entName'),
            subtitle: t('publicSite.pricing.entSubtitle'),
            monthlyVnd: t('publicSite.pricing.entPrice'),
            quota: t('publicSite.pricing.entQuota'),
            fleet: t('publicSite.pricing.entFleet'),
            targetAudience: t('publicSite.pricing.entAudience'),
            highlights: [
                t('publicSite.pricing.entH1'),
                t('publicSite.pricing.entH2'),
                t('publicSite.pricing.entH3'),
                t('publicSite.pricing.entH4'),
            ],
        },
    ];

    return (
        <div className="grid grid-cols-1 items-stretch gap-6 pt-3 lg:grid-cols-3 lg:pt-5">
            {plans.map(plan => {
                const featured = Boolean(plan.featured);
                return (
                    <article
                        key={plan.code}
                        className={`relative flex flex-col justify-between rounded-panel bg-card text-card-foreground ${
                            featured
                                ? 'z-10 border-2 border-primary shadow-xl ring-4 ring-primary/15'
                                : 'border border-border shadow-sm'
                        }`}
                    >
                        {featured && (
                            <p className="absolute -top-3.5 left-1/2 m-0 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm">
                                <Star size={12} className="fill-current" aria-hidden="true"/>
                                {plan.badge}
                            </p>
                        )}
                        <div className={`flex flex-1 flex-col gap-4 p-6 ${featured ? 'pt-8' : ''}`}>
                            <div className="flex items-center justify-between gap-2">
                                {featured ? <span/> : <FlatTag>{plan.badge}</FlatTag>}
                                <span className="font-mono text-xs font-bold text-slate-400">{plan.code}</span>
                            </div>
                            <div>
                                <h3 className="m-0 text-xl font-extrabold text-foreground">{plan.name}</h3>
                                <p className="m-0 mt-1 text-xs font-semibold text-slate-500">{plan.subtitle}</p>
                            </div>
                            <div className={`border-y py-4 ${featured ? 'border-primary/20' : 'border-slate-100'}`}>
                                <div className="flex flex-wrap items-baseline gap-2 tabular-nums">
                                    <p className={`m-0 text-3xl font-black tracking-tight ${featured ? 'text-primary' : 'text-foreground'}`}>
                                        {plan.monthlyVnd}
                                    </p>
                                    <span className="rounded-badge bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                        {t('marketplaceShop.illustrative')}
                                    </span>
                                </div>
                                <p className="m-0 mt-1 text-xs text-slate-500">{t('publicSite.pricing.monthlySuffix')}</p>
                                <dl className="m-0 mt-3 grid grid-cols-2 gap-2 text-xs tabular-nums">
                                    <div className="rounded-control bg-slate-50 px-3 py-2">
                                        <dt className="text-[11px] font-semibold text-slate-500">
                                            {t('publicSite.pricing.quotaLabel')}
                                        </dt>
                                        <dd className="m-0 font-extrabold text-foreground">{plan.quota}</dd>
                                    </div>
                                    <div className="rounded-control bg-slate-50 px-3 py-2">
                                        <dt className="text-[11px] font-semibold text-slate-500">
                                            {t('publicSite.pricing.fleetLabel')}
                                        </dt>
                                        <dd className="m-0 font-extrabold text-uav-blue">{plan.fleet}</dd>
                                    </div>
                                    <div className="col-span-2 rounded-control bg-uav-red-light/50 px-3 py-2">
                                        <dt className="text-[11px] font-semibold text-slate-600">
                                            {t('publicSite.homeRedesign.pricingFeeLabel')}
                                        </dt>
                                        <dd className="m-0 font-extrabold text-primary">{plan.feeRate}</dd>
                                    </div>
                                </dl>
                            </div>
                            {detailed && (
                                <p className="m-0 text-xs leading-relaxed text-slate-600">{plan.targetAudience}</p>
                            )}
                            <ul className="m-0 flex-1 list-none space-y-2 p-0 text-sm text-slate-700">
                                {(detailed ? plan.highlights : plan.highlights.slice(0, 3)).map(item => (
                                    <li key={item} className="flex items-start gap-2">
                                        <Check
                                            size={16}
                                            className={`mt-0.5 shrink-0 ${featured ? 'text-primary' : 'text-slate-400'}`}
                                            aria-hidden="true"
                                        />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href="/customer/provider/onboarding"
                                className={`inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-control px-4 py-2.5 text-sm font-bold transition-colors ${
                                    featured
                                        ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover'
                                        : 'border border-primary text-primary hover:bg-uav-red-light'
                                }`}
                            >
                                <span className="truncate">{t('publicSite.pricing.choosePlan', {name: plan.name})}</span>
                            </Link>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
