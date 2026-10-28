'use client';

import Link from 'next/link';
import {Briefcase, Radar, ShieldCheck} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {availablePortalsForRole, type Portal} from '@/features/auth/utils/portal';
import {cn} from '@/lib/utils';

const PORTAL_META: Record<
    Portal,
    {
        label: string;
        href: string;
        Icon: typeof ShieldCheck;
    }
> = {
    admin: {
        label: 'Quản trị',
        href: '/admin/dashboard',
        Icon: ShieldCheck,
    },
    operations: {
        label: 'Điều hành',
        href: '/operations/overview',
        Icon: Radar,
    },
    customer: {
        label: 'Khách hàng',
        href: '/customer/dashboard',
        Icon: Briefcase,
    },
};

export function PortalSwitcher({currentPortal, variant = 'header'}: { currentPortal: Portal; variant?: 'header' | 'drawer' }) {
    const inDrawer = variant === 'drawer';
    const {user} = useAuth();
    const portals = availablePortalsForRole(user?.role);

    if (portals.length <= 1) {
        return null;
    }

    return (
        <nav
            aria-label="Chuyển đổi cổng làm việc"
            className={cn('items-center gap-0.5 rounded-control border border-slate-200 bg-slate-100/90 p-0.5', inDrawer ? 'flex w-full md:hidden' : 'hidden shrink-0 md:inline-flex')}
        >
            {portals.map((portal) => {
                const {label, href, Icon} = PORTAL_META[portal];
                const active = portal === currentPortal;
                return (
                    <Link
                        key={portal}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        aria-label={label}
                        title={label}
                        className={cn(
                            'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-control px-2 text-[11px] font-bold uppercase transition-colors',
                            inDrawer ? 'min-w-0 flex-1 justify-center px-1 tracking-normal' : 'tracking-wider 2xl:px-2.5',
                            active
                                ? 'bg-primary text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900',
                        )}
                    >
                        {!inDrawer && <Icon size={13} aria-hidden="true" />}
                        <span className={inDrawer ? undefined : 'hidden 2xl:inline'}>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
