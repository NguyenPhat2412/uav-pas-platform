'use client';

import Link from 'next/link';
import {ServiceCategoryIcon} from '@/components/marketplace/shop/ServiceCategoryIcon';
import {SERVICE_CATEGORIES} from '@/lib/marketplace/service-categories';
import {useI18n} from '@/providers/I18nContext';

export function HomeCategoryGridSection() {
    const {t} = useI18n();

    return (
        <section
            aria-labelledby="home-categories-heading"
            className="border-b border-slate-200 bg-slate-50/70 py-7 sm:py-9"
        >
            <div className="mx-auto w-full max-w-[1280px] space-y-4 px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-2">
                    <h2 id="home-categories-heading" className="m-0 text-base font-bold text-slate-900 sm:text-lg">
                        {t('publicSite.homeRedesign.categoriesTitle')}
                    </h2>
                    <Link
                        href="/services"
                        className="text-xs font-bold whitespace-nowrap text-primary hover:underline"
                    >
                        {t('dashboard.viewAll')}
                    </Link>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
                    {SERVICE_CATEGORIES.map(cat => {
                        const label = t(cat.labelKey);
                        return (
                            <Link
                                key={cat.key}
                                href={cat.href}
                                className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-panel border border-slate-200 bg-white px-2 py-3 text-center shadow-2xs transition-colors hover:border-primary/40 hover:bg-uav-red-light/40"
                            >
                                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-uav-red-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                    <ServiceCategoryIcon name={cat.icon} size={20}/>
                                </span>
                                <span className="line-clamp-2 text-xs font-semibold leading-tight text-slate-800 group-hover:text-primary">
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
