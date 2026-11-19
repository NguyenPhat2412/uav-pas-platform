'use client';

import Link from 'next/link';
import {ArrowRight, Battery, Clock3, Gauge, Radio} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

export function HomeSimulationHighlightSection() {
    const {t} = useI18n();

    const metrics = [
        {icon: Gauge, label: t('marketplaceShop.trackingProgress'), value: '72%', accent: true},
        {icon: Battery, label: t('marketplaceShop.trackingBattery'), value: '81%', accent: false},
        {icon: Radio, label: t('marketplaceShop.trackingLink'), value: '99%', accent: false},
        {icon: Clock3, label: t('marketplaceShop.trackingEta'), value: t('marketplaceShop.trackingMinutes', {value: '6'}), accent: false},
    ];

    return (
        <section
            aria-labelledby="home-sim-heading"
            className="border-b border-slate-200 bg-white py-9 sm:py-11"
        >
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 items-center gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-7 lg:grid-cols-12 lg:gap-8">
                    {/* Lightweight SVG Grid-Sweep Flight Path Illustration */}
                    <div className="lg:col-span-6">
                        <div className="relative overflow-hidden rounded-panel border border-slate-200 bg-white p-3">
                            <svg
                                viewBox="0 0 480 260"
                                className="h-auto w-full"
                                role="img"
                                aria-label={t('publicSite.homeRedesign.simSvgAria')}
                            >
                                <defs>
                                    <pattern id="uav-grid-bg" width="24" height="24" patternUnits="userSpaceOnUse">
                                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
                                    </pattern>
                                </defs>
                                <rect width="480" height="260" fill="url(#uav-grid-bg)" rx="8"/>
                                {/* Survey polygon zone */}
                                <polygon
                                    points="72,38 412,38 424,222 60,222"
                                    fill="#fdf2f2"
                                    fillOpacity="0.65"
                                    stroke="#ab2523"
                                    strokeOpacity="0.35"
                                    strokeWidth="1.5"
                                    strokeDasharray="5 5"
                                />
                                {/* Planned grid-sweep route (dashed) */}
                                <polyline
                                    points="92,200 92,62 152,62 152,200 212,200 212,62 272,62 272,200 332,200 332,62 392,62 392,200"
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2.5"
                                    strokeDasharray="6 6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Flown trail (solid primary red) */}
                                <polyline
                                    points="92,200 92,62 152,62 152,200 212,200 212,62 272,62 272,200 332,200 332,126"
                                    fill="none"
                                    stroke="#ab2523"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Home / Takeoff point */}
                                <circle cx="92" cy="200" r="6" fill="#0f172a" stroke="#ffffff" strokeWidth="2"/>
                                {/* Active UAV position */}
                                <circle cx="332" cy="126" r="18" fill="#ab2523" fillOpacity="0.14"/>
                                <circle cx="332" cy="126" r="10" fill="#ab2523" stroke="#ffffff" strokeWidth="2.5"/>
                                <polygon points="332,119 337,131 332,128 327,131" fill="#ffffff"/>
                            </svg>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-medium text-slate-600">
                                <span className="inline-flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="inline-block h-0.5 w-3.5 bg-primary" aria-hidden="true"/>
                                        {t('marketplaceShop.trackingFlownTrail')}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="inline-block h-0 w-3.5 border-t-2 border-dashed border-slate-400" aria-hidden="true"/>
                                        {t('marketplaceShop.trackingPlannedRoute')}
                                    </span>
                                </span>
                                <span className="rounded-badge bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                    {t('marketplaceShop.illustrative')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Narrative + 4 Telemetry Metric Tiles */}
                    <div className="space-y-4 lg:col-span-6">
                        <span className="inline-flex items-center rounded-full bg-uav-red-light px-3 py-1 text-xs font-bold text-primary">
                            {t('publicSite.homeRedesign.simEyebrow')}
                        </span>
                        <h2 id="home-sim-heading" className="m-0 text-lg font-extrabold text-slate-900 sm:text-2xl">
                            {t('publicSite.homeRedesign.simTitle')}
                        </h2>
                        <p className="m-0 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            {t('publicSite.homeRedesign.simSubtitle')}
                        </p>

                        <dl className="m-0 grid grid-cols-2 gap-2.5 tabular-nums sm:grid-cols-4">
                            {metrics.map(({icon: Icon, label, value, accent}) => (
                                <div key={label} className="rounded-control border border-slate-200 bg-white p-3">
                                    <dt className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                        <Icon size={13} className={accent ? 'shrink-0 text-primary' : 'shrink-0 text-slate-600'} aria-hidden="true"/>
                                        <span className="truncate">{label}</span>
                                    </dt>
                                    <dd className={`m-0 mt-1 text-sm font-extrabold ${accent ? 'text-primary' : 'text-slate-900'}`}>
                                        {value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <div className="pt-1">
                            <Link
                                href="/how-it-works"
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-primary px-4 text-xs font-bold whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary-hover"
                            >
                                <span>{t('publicSite.homeRedesign.simCta')}</span>
                                <ArrowRight size={14} aria-hidden="true"/>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
