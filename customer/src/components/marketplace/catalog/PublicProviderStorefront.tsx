'use client';

import Link from 'next/link';
import {ShieldCheck} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

/**
 * Platform-mediated marketplace policy: customers see UAV PAS verified services rather than individual fleet storefronts.
 */
export function PublicProviderStorefront({slug}: { slug: string }) {
    const {t} = useI18n();
    void slug;
    return (
        <div className="bg-slate-50/60 py-14">
            <div className="mx-auto max-w-[680px] rounded-panel border border-slate-200 bg-white p-8 text-center shadow-2xs">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-uav-red-light text-primary">
                    <ShieldCheck size={24} aria-hidden="true"/>
                </span>
                <h1 className="m-0 mt-4 text-xl font-bold text-slate-900">
                    {t('marketplaceShop.platformManagedTitle')}
                </h1>
                <p className="m-0 mt-2 text-sm leading-relaxed text-slate-600">
                    {t('marketplaceShop.platformManagedDesc')}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/customer/services"
                        className="inline-flex min-h-10 items-center justify-center rounded-control bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                        {t('marketplaceShop.exploreCatalog')}
                    </Link>
                    <Link
                        href="/services"
                        className="inline-flex min-h-10 items-center justify-center rounded-control border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        {t('publicSite.catalog.title')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
