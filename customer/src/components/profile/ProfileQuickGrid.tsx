'use client';

import Link from 'next/link';
import {Boxes, ClipboardList, CloudSun, CreditCard, FolderKanban, GraduationCap} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';

export function ProfileQuickGrid() {
    const {t} = useI18n();
    const items = [
        {href: '/customer/projects', icon: FolderKanban, label: t('marketplaceShop.homeProjects')},
        {href: '/customer/missions', icon: ClipboardList, label: t('marketplaceShop.homeOrders')},
        {href: '/customer/services', icon: Boxes, label: t('marketplaceShop.homeShop')},
        {href: '/customer/billing', icon: CreditCard, label: t('marketplaceShop.homeBilling')},
        {href: '/customer/weather', icon: CloudSun, label: t('marketplaceShop.homeWeather')},
        {href: '/customer/training', icon: GraduationCap, label: t('marketplaceShop.homeTraining')},
    ];

    return (
        <nav
            aria-label={t('marketplaceShop.homeQuickTitle')}
            className="bg-card px-4 py-3.5 sm:px-5"
        >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {items.map(item => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-panel border border-slate-200 bg-slate-50/70 px-2 py-2.5 text-center transition-colors hover:border-primary/40 hover:bg-uav-red-light/50"
                        >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-uav-red-light text-primary">
                                <Icon size={18} strokeWidth={1.9} aria-hidden="true"/>
                            </span>
                            <span className="max-w-full truncate whitespace-nowrap text-xs font-semibold text-slate-800">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
