'use client';

import Link from 'next/link';
import {Briefcase, Radar, ShieldCheck} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {availablePortalsForRole, type Portal} from '@/features/auth/utils/portal';
import {cn} from '@/lib/utils';

const PORTAL_META: Record<
    Portal,
    {
        labelKey: string;
        href: string;
        Icon: typeof ShieldCheck;
    }
> = {
    admin: {
        labelKey: 'shell.portalSwitcher.admin',
        href: '/admin/dashboard',
        Icon: ShieldCheck,
    },
    operations: {
        labelKey: 'shell.portalSwitcher.operations',
        href: '/operations/overview',
        Icon: Radar,
    },
    customer: {
        labelKey: 'shell.portalSwitcher.customer',
        href: '/customer/dashboard',
        Icon: Briefcase,
    },
};

export function PortalSwitcher({currentPortal, variant = 'header'}: { currentPortal: Portal; variant?: 'header' | 'drawer' }) {
    const inDrawer = variant === 'drawer';
    const {user} = useAuth();
    const {t} = useI18n();
    const portals = availablePortalsForRole(user?.role);

    if (portals.length <= 1) {
        return null;
    }

    return (
        <nav
            aria-label={t('shell.portalSwitcher.ariaLabel')}
            className={cn('items-center gap-0.5 rounded-control border border-slate-200 bg-slate-100/90 p-0.5', inDrawer ? 'flex w-full md:hidden' : 'hidden shrink-0 md:inline-flex')}
        >
            {portals.map((portal) => {
                const {labelKey, href, Icon} = PORTAL_META[portal];
                const label = t(labelKey);
                const active = portal === currentPortal;
                return (
                    <Link
                        key={portal}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        aria-label={label}
                        title={label}
                        className={cn(
                            'inline-flex items-center justify-center rounded-control transition-colors',
                            inDrawer ? 'h-8 flex-1' : 'h-7 w-7',
                            active
                                ? 'bg-primary text-white shadow-2xs'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900',
                        )}
                    >
                        <Icon size={inDrawer ? 16 : 14} aria-hidden="true" />
                        <span className="sr-only">{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
