'use client';

import Image from 'next/image';
import {useSidebarController} from '@/hooks/useSidebarController';
import {AssistantWidget} from '@/components/assistant/AssistantWidget';
import {AdminSupportQuickDock} from '@/components/support/AdminSupportQuickDock';
import {useSupportSummary} from '@/hooks/support/useAdminSupport';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';
import {
    Bot,
    CreditCard,
    GraduationCap,
    LayoutDashboard,
    Menu,
    Server,
    Settings2,
    ShieldCheck,
    Users,
    PanelLeftClose,
    PanelLeftOpen,
    X
} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {AccountMenu} from '@/components/layout/AccountMenu';
import {AdminAlertsPopover} from '@/components/layout/AdminAlertsPopover';
import {
    CollapsedNavFlyoutPortal,
    CollapsedNavGroupTrigger,
    useCollapsedNavFlyout,
} from '@/components/layout/CollapsedNavFlyout';
import {NotificationBell} from '@/components/notification/NotificationBell';
import {PortalSwitcher} from '@/components/layout/PortalSwitcher';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {
    ADMIN_SIDEBAR_GROUPS,
    ADMIN_SIDEBAR_ROUTES,
    resolveSidebarActiveItem,
} from '@/config/sidebar-routes';
import {cn} from '@/lib/utils';
import {ADMIN_RECENT_PAGES_KEY, rememberRecentPage} from '@/lib/recent-pages';
import {FoldingNavGroup, foldedLinkClass, useFoldedNavGroups} from '@/components/layout/FoldingNavGroup';
import {WorkspaceTabs} from '@/components/layout/WorkspaceTabs';
import {UnsavedChangesContext, useWorkspaceTabs} from '@/hooks/useWorkspaceTabs';

// Cấu hình routes của Sidebar Admin (bao gồm /reports, /billing, /settings, /access-control/*)
// được tách riêng và quản lý tập trung tại `@/config/sidebar-routes.ts`.
const nav = ADMIN_SIDEBAR_ROUTES;
const navGroups = ADMIN_SIDEBAR_GROUPS;

const GROUP_ICONS: Partial<Record<(typeof ADMIN_SIDEBAR_GROUPS)[number], typeof Menu>> = {
    overview: LayoutDashboard,
    commerce: CreditCard,
    access: Users,
    training: GraduationCap,
    intelligence: Bot,
    security: ShieldCheck,
    system: Settings2,
    infrastructure: Server,
};
const OPEN_GROUPS_KEY = 'uav_admin_nav_open_groups';
const TABS_KEY = 'uav_admin_workspace_tabs';
const HOME = '/admin/dashboard';

/** pageTitle names pages that have no sidebar entry (e.g. the profile) in the breadcrumb. */
export function AppShell({children, activeResource, pageTitle}: { children: React.ReactNode; activeResource?: string; pageTitle?: string }) {
    const pathname = usePathname();
    const {can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const {open, setOpen, railCollapsed, toggleCollapsed, shortcut, menuButton, rail, navList} =
        useSidebarController('uav_sidebar_collapsed');
    const flyout = useCollapsedNavFlyout(railCollapsed);

    // Opts the admin portal into its own shape and surface scale (see globals.css).
    useEffect(() => {
        const root = document.documentElement;
        root.dataset.portal = 'admin';
        return () => {
            delete root.dataset.portal;
        };
    }, []);

    const visibleNav = nav.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    const supportSummary = useSupportSummary(permissionsReady && can('SUPPORT_MANAGE'));
    const unreadSupport = supportSummary.data?.unreadMessages ?? 0;
    const activeNav = resolveSidebarActiveItem(visibleNav, pathname, activeResource);
    // Feeds "Truy cập gần đây" on the dashboard; only sidebar destinations are remembered.
    const activeHref = activeNav?.href;
    useEffect(() => {
        if (activeHref) rememberRecentPage(ADMIN_RECENT_PAGES_KEY, activeHref);
    }, [activeHref]);

    const {openGroups, toggleGroup} = useFoldedNavGroups(OPEN_GROUPS_KEY, activeNav?.group);
    const getNavLabel = (item: typeof nav[0]) => {
        const key = `adminNav.${item.key}`;
        const translated = t(key);
        return translated !== key ? translated : (item.defaultLabel || item.key);
    };
    const workspaceTabs = useWorkspaceTabs({storageKey: TABS_KEY, pinnedHref: HOME, activeHref, pathname});
    // A tab whose page the user can no longer open (permission removed) is simply not drawn.
    const describeTab = (href: string) => {
        const item = visibleNav.find(entry => entry.href === href);
        return item && {label: getNavLabel(item), icon: item.icon};
    };
    const brandLabel = `UAV PAS · ${t('shell.adminTitle')}`;
    const toggleLabel = `${railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')} (${shortcut})`;

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
                href="#workspace"
            >
                {t('shell.skipToContent')}
            </a>
            <aside
                ref={rail}
                id="portal-navigation"
                className={cn(
                    'fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-40 lg:h-screen',
                    railCollapsed ? 'w-[60px]' : 'w-[min(280px,85vw)] lg:w-[220px]',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
                )}
            >
                <div className={cn('mb-2 flex items-center border-b border-slate-100 pb-2', railCollapsed ? 'flex-col justify-center gap-1.5' : 'justify-between gap-1.5')}>
                    <Link
                        href="/admin/dashboard"
                        className={cn('flex items-center gap-2 p-0 min-w-0', railCollapsed && 'justify-center')}
                        onClick={() => setOpen(false)}
                        title={railCollapsed ? undefined : brandLabel}
                        {...flyout.tooltipTriggerProps('admin-brand', brandLabel)}
                    >
                        <span className="flex items-center justify-center bg-white p-0.5 rounded-lg border border-rose-100 shadow-xs overflow-hidden shrink-0">
                            <Image src="/uav-pas-logo.svg" alt={t('shell.brandName')} width={26} height={26} className="w-[26px] h-[26px] object-contain"/>
                        </span>
                        {!railCollapsed && (
                            <span className="flex flex-col leading-tight truncate">
                                <strong className="text-[13.5px] font-bold text-slate-800 truncate">UAV PAS</strong>
                                <small className="text-[10.5px] text-slate-500 font-medium truncate">{t('shell.adminTitle')}</small>
                            </span>
                        )}
                    </Link>
                    <button
                        type="button"
                        className="hidden lg:inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border border-[#ab2523]/20 bg-[#ab2523]/5 text-[#ab2523] hover:border-[#ab2523]/40 hover:bg-[#ab2523]/12 transition-colors cursor-pointer"
                        onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                        aria-keyshortcuts="Control+B Meta+B"
                        title={railCollapsed ? undefined : toggleLabel}
                        {...flyout.tooltipTriggerProps('admin-toggle', toggleLabel)}
                    >
                        {railCollapsed ? <PanelLeftOpen size={14}/> : <PanelLeftClose size={14}/>}
                    </button>
                    <button
                        type="button"
                        className="rail-close lg:hidden inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-slate-600 hover:bg-slate-100"
                        aria-label={t('shell.closeNavigation')}
                        onClick={() => setOpen(false)}
                    >
                        <X size={16}/>
                    </button>
                </div>
                <div className="mb-2 space-y-2 border-b border-slate-100 pb-2.5 md:hidden">
                    <PortalSwitcher currentPortal="admin" variant="drawer"/>
                    <HeaderSearch variant="drawer" items={visibleNav.map(item => ({href: item.href, label: getNavLabel(item), group: t(`adminNavGroups.${item.group}`)}))}/>
                    <LanguageSwitcher variant="compact" className="sm:hidden"/>
                </div>
                <nav ref={navList} aria-label={t('shell.adminSection')} className={cn('flex flex-1 flex-col overflow-y-auto', railCollapsed ? 'gap-1.5 py-0.5' : 'gap-0.5')}>
                    {navGroups.map(group => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        const GroupIcon = GROUP_ICONS[group] ?? LayoutDashboard;
                        const groupLabel = t(`adminNavGroups.${group}`);
                        const expanded = !!openGroups[group];
                        const groupActive = items.some(item => item.href === activeNav?.href);
                        if (railCollapsed) {
                            const groupHasUnreadSupport = items.some(item => item.key === 'supportInbox') && unreadSupport > 0;
                            return (
                                <CollapsedNavGroupTrigger
                                    key={group}
                                    id={`admin-flyout-${group}`}
                                    label={groupLabel}
                                    icon={GroupIcon}
                                    active={groupActive}
                                    controller={flyout}
                                    onNavigate={() => setOpen(false)}
                                    badge={groupHasUnreadSupport ? (
                                        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"/>
                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"/>
                                        </span>
                                    ) : undefined}
                                    items={items.map(item => {
                                        const showBadge = item.key === 'supportInbox' && unreadSupport > 0;
                                        return {
                                            href: item.href,
                                            label: getNavLabel(item),
                                            active: item.href === activeNav?.href,
                                            badge: showBadge ? (
                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
                                                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white"/>
                                                    {unreadSupport > 99 ? '99+' : unreadSupport}
                                                </span>
                                            ) : undefined,
                                        };
                                    })}
                                />
                            );
                        }
                        return (
                            <FoldingNavGroup key={group} id={`admin-nav-${group}`} label={groupLabel} icon={GroupIcon}
                                             expanded={expanded} active={groupActive} onToggle={() => toggleGroup(group)}>
                                {items.map(item => {
                                    const active = item.href === activeNav?.href;
                                    const label = getNavLabel(item);
                                    const showBadge = item.key === 'supportInbox' && unreadSupport > 0;
                                    return <li key={item.href}>
                                        <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                                              aria-label={label} title={label} className={cn(foldedLinkClass(active), showBadge && 'flex items-center justify-between gap-1.5')}>
                                            <span className="truncate">{label}</span>
                                            {showBadge && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white"><span className="h-1.5 w-1.5 animate-ping rounded-full bg-white"/>{unreadSupport > 99 ? '99+' : unreadSupport}</span>}
                                        </Link>
                                    </li>;
                                })}
                            </FoldingNavGroup>
                        );
                    })}
                </nav>
                <CollapsedNavFlyoutPortal controller={flyout} onNavigate={() => setOpen(false)}/>
            </aside>
            {open && (
                <button
                    className="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-xs lg:hidden"
                    aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}
                />
            )}
            <div className="flex min-w-0 flex-1 flex-col" inert={open}>
                <div className="sticky top-0 z-20">
                    <header className="flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <button
                                ref={menuButton}
                                aria-controls="portal-navigation"
                                className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-control border border-border text-slate-700 hover:bg-slate-100"
                                aria-label={t('shell.openNavigation')}
                                aria-expanded={open}
                                onClick={() => setOpen(true)}
                            >
                                <Menu size={18}/>
                            </button>
                            <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-500">
                                <span className="hidden xl:inline">UAV PAS</span>
                                <span className="hidden xl:inline">/</span>
                                <span className="hidden xl:inline">{t('shell.adminSection')}</span>
                                {(activeNav || pageTitle) && (
                                    <>
                                        <span className="hidden xl:inline">/</span>
                                        <strong className="truncate font-semibold text-slate-900">{activeNav ? getNavLabel(activeNav) : pageTitle}</strong>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 xl:gap-3">
                            <HeaderSearch items={visibleNav.map(item => ({href: item.href, label: getNavLabel(item), group: t(`adminNavGroups.${item.group}`)}))}/>
                            <PortalSwitcher currentPortal="admin"/>
                            <AdminAlertsPopover/>
                            <NotificationBell viewAllHref="/admin/notifications"/>
                            <LanguageSwitcher variant="compact" className="hidden sm:inline-flex"/>
                            <AccountMenu portal="admin"/>
                        </div>
                    </header>
                    <WorkspaceTabs tabs={workspaceTabs.tabs} activeHref={activeHref} pinnedHref={HOME} dirtyHref={workspaceTabs.dirtyHref}
                                   describe={describeTab} onClose={workspaceTabs.close} onCloseOthers={workspaceTabs.closeOthers}/>
                </div>
                <WelcomeBack/>
                <main id="workspace" className="flex w-full flex-1 flex-col gap-4 outline-none" tabIndex={-1}>
                    <UnsavedChangesContext.Provider value={workspaceTabs.reportDirty}>{children}</UnsavedChangesContext.Provider>
                </main>
                <AdminSupportQuickDock/>
                <AssistantWidget portal="ADMIN"/>
            </div>
        </div>
    );
}
