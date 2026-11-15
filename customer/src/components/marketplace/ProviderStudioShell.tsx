'use client';

import type {ReactNode} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    Building2,
    ExternalLink,
    FileSpreadsheet,
    Package,
    Plane,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import {PageGuard} from '@/components/customer/CustomerLayout';
import {useMyProviderProfile} from '@/hooks/marketplace/useMarketplace';
import {verificationStatusLabel} from '@/forms/marketplace/marketplace-forms';

const STUDIO_TABS = [
    {href: '/customer/provider/onboarding', label: 'Hồ sơ & KYC Đối tác', icon: Building2},
    {href: '/customer/provider/listings', label: 'Tin đăng Dịch vụ & Thuê', icon: Package},
    {href: '/customer/provider/fleet', label: 'Đội bay & Thiết bị 3P', icon: Plane},
    {href: '/customer/provider/orders', label: 'Đơn đặt & Đấu thầu RFQ', icon: FileSpreadsheet},
    {href: '/customer/provider/wallet', label: 'Ví Ký quỹ & Rút tiền', icon: Wallet},
] as const;

export function ProviderStudioShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const profileQuery = useMyProviderProfile();
    const profile = profileQuery.data;

    return (
        <PageGuard permission={null}>
            <div className="flex flex-1 flex-col bg-slate-50/40">
                <header className="border-b border-slate-200 bg-white px-4 pt-4 sm:px-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                                    <ShieldCheck size={13} aria-hidden="true"/>
                                    Kênh Đối tác Cung cấp UAV (Seller Studio)
                                </span>
                                {profile && (
                                    <span
                                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                            profile.verificationStatus === 'VERIFIED'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : profile.verificationStatus === 'PENDING_REVIEW'
                                                  ? 'bg-amber-100 text-amber-800'
                                                  : profile.verificationStatus === 'REJECTED'
                                                    ? 'bg-rose-100 text-danger'
                                                    : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {verificationStatusLabel(profile.verificationStatus)}
                                    </span>
                                )}
                            </div>
                            <h1 className="m-0 mt-1.5 text-xl font-black text-slate-900 sm:text-2xl">{title}</h1>
                            <p className="m-0 mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
                        </div>

                        {profile?.slug && profile.verificationStatus === 'VERIFIED' && (
                            <Link
                                href={`/providers/${profile.slug}`}
                                target="_blank"
                                className="inline-flex h-9 items-center gap-1.5 rounded-control border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary"
                            >
                                Xem gian hàng công khai
                                <ExternalLink size={13} aria-hidden="true"/>
                            </Link>
                        )}
                    </div>

                    <nav className="flex gap-1 overflow-x-auto" aria-label="Điều hướng Kênh Đối tác">
                        {STUDIO_TABS.map(tab => {
                            const Icon = tab.icon;
                            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`-mb-px inline-flex min-h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-bold transition-colors ${
                                        active
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon size={14} aria-hidden="true"/>
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </nav>
                </header>

                <div className="flex-1 p-4 sm:p-6">{children}</div>
            </div>
        </PageGuard>
    );
}
