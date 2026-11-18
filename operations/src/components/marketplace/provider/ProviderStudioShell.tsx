'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    Boxes,
    ClipboardList,
    CreditCard,
    PlaneTakeoff,
    ShieldCheck,
    Users,
} from 'lucide-react';
import {OperationsPage} from '@/components/layout/OperationsPage';
import {useMyProviderProfile} from '@/hooks/marketplace/useMarketplace';
import {useI18n} from '@/providers/I18nContext';

const STUDIO_TABS = [
    {href: '/operations/provider/onboarding', key: 'onboarding', icon: ShieldCheck},
    {href: '/operations/provider/fleet', key: 'fleet', icon: PlaneTakeoff},
    {href: '/operations/provider/pilots', key: 'pilots', icon: Users},
    {href: '/operations/provider/listings', key: 'listings', icon: Boxes},
    {href: '/operations/provider/orders', key: 'orders', icon: ClipboardList},
    {href: '/operations/provider/wallet', key: 'wallet', icon: CreditCard},
] as const;

export function ProviderStudioShell({
    title,
    subtitle,
    activeResource = 'providerOnboarding',
    children,
}: {
    title: string;
    subtitle: string;
    activeResource?: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const {t} = useI18n();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;
    const verificationStatus = profile?.verificationStatus ?? 'DRAFT';

    return (
        <OperationsPage permission={null} activeResource={activeResource}>
            <div className="flex flex-1 flex-col bg-slate-50/50">
                <header className="border-b border-slate-200 bg-white px-4 pt-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-uav-red-light px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-primary">
                                    <ShieldCheck size={13} aria-hidden="true"/>
                                    {t('opsMarketplace.studio.badge')}
                                </span>
                                {profile && (
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${
                                            verificationStatus === 'VERIFIED'
                                                ? 'bg-slate-900 text-white'
                                                : verificationStatus === 'PENDING_REVIEW'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : verificationStatus === 'REJECTED'
                                                    ? 'bg-rose-100 text-danger'
                                                    : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {t(`opsMarketplace.studio.verification.${verificationStatus}`)}
                                    </span>
                                )}
                            </div>
                            <h1 className="m-0 mt-1.5 text-xl font-bold text-slate-900">{title}</h1>
                            <p className="m-0 mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
                        </div>
                    </div>

                    <nav className="flex gap-1 overflow-x-auto" aria-label={t('opsMarketplace.studio.badge')}>
                        {STUDIO_TABS.map(tab => {
                            const Icon = tab.icon;
                            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                                        active
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon size={15} aria-hidden="true"/>
                                    <span>{t(`opsMarketplace.studio.tabs.${tab.key}`)}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </header>

                <div className="flex-1 p-4 sm:p-6">{children}</div>
            </div>
        </OperationsPage>
    );
}
