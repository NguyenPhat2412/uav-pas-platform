'use client';

import type {RefObject} from 'react';
import {Menu} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {AccountMenu} from '@/components/layout/AccountMenu';
import {AdminAlertsPopover} from '@/components/layout/AdminAlertsPopover';
import {NotificationBell} from '@/components/notification/inbox/NotificationBell';
import {PortalSwitcher} from '@/components/layout/PortalSwitcher';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import type {ADMIN_SIDEBAR_ROUTES} from '@/config/sidebar-routes';

type AdminNavItem = (typeof ADMIN_SIDEBAR_ROUTES)[number];

interface AdminShellHeaderProps {
    menuButton: RefObject<HTMLButtonElement | null>;
    open: boolean;
    onOpenMenu: () => void;
    activeNav?: AdminNavItem;
    pageTitle?: string;
    searchItems: { href: string; label: string; group: string }[];
    getNavLabel: (item: AdminNavItem) => string;
    getSubGroupLabel: (subKey: NonNullable<AdminNavItem['subGroup']>) => string;
}

export function AdminShellHeader({
    menuButton,
    open,
    onOpenMenu,
    activeNav,
    pageTitle,
    searchItems,
    getNavLabel,
    getSubGroupLabel,
}: AdminShellHeaderProps) {
    const {t} = useI18n();

    return (
        <header className="flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <button
                    ref={menuButton}
                    aria-controls="portal-navigation"
                    className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-control border border-border text-slate-700 hover:bg-slate-100"
                    aria-label={t('shell.openNavigation')}
                    aria-expanded={open}
                    onClick={onOpenMenu}
                >
                    <Menu size={18}/>
                </button>
                <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-500">
                    <span className="hidden 2xl:inline">UAV PAS</span>
                    <span className="hidden 2xl:inline">/</span>
                    <span className="hidden xl:inline">{activeNav ? t(`adminNavGroups.${activeNav.group}`) : t('shell.adminSection')}</span>
                    {activeNav?.subGroup && (
                        <>
                            <span className="hidden 2xl:inline">/</span>
                            <span className="hidden 2xl:inline">{getSubGroupLabel(activeNav.subGroup)}</span>
                        </>
                    )}
                    {(activeNav || pageTitle) && (
                        <>
                            <span className="hidden xl:inline">/</span>
                            <strong className="truncate font-semibold text-slate-900">{activeNav ? getNavLabel(activeNav) : pageTitle}</strong>
                        </>
                    )}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 xl:gap-3">
                <HeaderSearch items={searchItems}/>
                <PortalSwitcher currentPortal="admin"/>
                <AdminAlertsPopover/>
                <NotificationBell viewAllHref="/admin/notifications"/>
                <LanguageSwitcher variant="compact" className="hidden sm:inline-flex"/>
                <AccountMenu portal="admin"/>
            </div>
        </header>
    );
}
