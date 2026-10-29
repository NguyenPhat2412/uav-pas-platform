'use client';
import {createContext, useContext, useEffect} from 'react';
import {useSidebarController} from '@/components/layout/useSidebarController';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import {AssistantWidget} from '@/features/assistant/components/AssistantWidget';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    X
} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {LanguageSwitcher} from "@/components/ui/LanguageSwitcher";
import {DispatchHotline} from "@/components/customer/DispatchHotline";
import {useSidebarCounts} from "@/components/customer/useSidebarCounts";
import {CustomerAccountMenu} from "@/components/customer/CustomerAccountMenu";
import {NotificationBell} from "@/components/notifications/NotificationBell";
import {PortalSwitcher} from "@/components/layout/PortalSwitcher";
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {loginEntryForPage} from '@/features/auth/utils/auth-entry';
import {
    CUSTOMER_SIDEBAR_GROUPS,
    CUSTOMER_SIDEBAR_ROUTES,
    resolveSidebarActiveItem,
} from '@/components/layout/sidebar-routes';
import {useCustomerProfile} from '@/lib/query/customer';
import {Button} from "@/components/customer/ui";
import {cn} from '@/lib/utils';
import {Bell as BellIcon, CircleHelp, LayoutDashboard, Plane, ReceiptText} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {FoldingNavGroup, foldedLinkClass, useFoldedNavGroups} from '@/components/layout/FoldingNavGroup';
import {CUSTOMER_RECENT_PAGES_KEY, rememberRecentPage} from '@/components/layout/recent-pages';

const GROUP_ICONS: Partial<Record<(typeof CUSTOMER_SIDEBAR_GROUPS)[number], LucideIcon>> = {
    overview: LayoutDashboard,
    missions: Plane,
    services: ReceiptText,
    support: CircleHelp,
};

// Cấu hình routes của Sidebar Khách hàng (bao gồm /billing, /notifications, v.v.)
// được tách riêng và quản lý tập trung tại `@/components/layout/sidebar-routes.ts`.
const navItems = CUSTOMER_SIDEBAR_ROUTES;
const navGroups = CUSTOMER_SIDEBAR_GROUPS;

export function AppShell({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {user, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const profile = useCustomerProfile();
    const {open, setOpen, railCollapsed, toggleCollapsed, shortcut, menuButton, rail, navList} =
        useSidebarController('uav_customer_sidebar_collapsed');

    // Opts the customer portal into the shared shape and surface scale (see globals.css).
    useEffect(() => {
        const root = document.documentElement;
        root.dataset.portal = 'customer';
        return () => {
            delete root.dataset.portal;
        };
    }, []);

    const name = profile.data?.fullName || user?.fullName || user?.username || t('common.appTitle');
    const visibleNav = navItems.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    const counts = useSidebarCounts();
    const badgeText = (value: number) => value > 99 ? '99+' : String(value);
    const activeNav = resolveSidebarActiveItem(visibleNav, pathname);
    const {openGroups, toggleGroup} = useFoldedNavGroups('uav_customer_nav_open_groups', activeNav?.group);
    // Feeds the dashboard's search "Recents"; only sidebar destinations are remembered.
    const activeHref = activeNav?.href;
    useEffect(() => {
        if (activeHref) rememberRecentPage(CUSTOMER_RECENT_PAGES_KEY, activeHref);
    }, [activeHref]);

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
                href="#content"
            >
                {t('common.skipToContent')}
            </a>
            <aside
                ref={rail}
                id="customer-navigation"
                className={`fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-all duration-200 lg:sticky lg:top-0 lg:z-40 lg:h-screen ${
                    railCollapsed ? 'w-[60px]' : 'w-[min(280px,85vw)] lg:w-[220px]'
                } ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className={`mb-2 flex items-center border-b border-slate-100 pb-2 ${railCollapsed ? 'flex-col justify-center gap-1.5' : 'justify-between gap-1.5'}`}>
                    <Link
                        href="/customer/dashboard"
                        className={`flex items-center gap-2 text-foreground min-w-0 ${railCollapsed ? 'justify-center' : ''}`}
                        onClick={() => setOpen(false)}
                        aria-label="UAV PAS"
                        title={`UAV PAS · ${t('shell.customerTitle')}`}
                    >
                        <span className="flex items-center justify-center bg-white p-0.5 rounded-lg border border-rose-100 shadow-xs overflow-hidden shrink-0">
                            <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={26} height={26} className="w-[26px] h-[26px] object-contain"/>
                        </span>
                        {!railCollapsed && (
                            <span className="flex flex-col leading-tight truncate">
                                <strong className="text-[13.5px] font-bold text-slate-800 truncate">UAV PAS</strong>
                                <small className="text-[10.5px] font-medium text-slate-500 truncate">{t('shell.customerTitle')}</small>
                            </span>
                        )}
                    </Link>
                    <button
                        type="button"
                        className="hidden lg:inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:border-primary/30 hover:bg-uav-red-light hover:text-primary transition-colors cursor-pointer"
                        onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                        aria-keyshortcuts="Control+B Meta+B"
                        title={`${railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')} (${shortcut})`}
                    >
                        {railCollapsed ? <PanelLeftOpen size={14}/> : <PanelLeftClose size={14}/>}
                    </button>
                    {/* The drawer's own close button, in the slot the desktop collapse toggle uses. */}
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
                    <PortalSwitcher currentPortal="customer" variant="drawer"/>
                    <HeaderSearch variant="drawer" items={visibleNav.map(item => ({href: item.href, label: t(`nav.${item.key}`) || item.defaultLabel || item.key, group: t(`nav.groups.${item.group}`)}))}/>
                    <LanguageSwitcher variant="compact" className="sm:hidden"/>
                </div>
                <nav ref={navList} aria-label={t('shell.customerSection')} className={cn('flex flex-1 flex-col overflow-y-auto', railCollapsed ? 'gap-2.5' : 'gap-0.5')}>
                    {navGroups.map((group, idx) => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        const renderBadge = (count: number, compact: boolean) => count > 0 && (compact
                            ? <span className="absolute -top-1 -right-1 min-w-4 rounded-badge bg-primary px-1 text-center text-[9.5px] font-bold leading-4 text-primary-foreground" aria-hidden="true">{badgeText(count)}</span>
                            : <span className="min-w-5 rounded-badge bg-primary px-1.5 text-center text-[11px] font-bold leading-5 text-primary-foreground tabular-nums" aria-hidden="true">{badgeText(count)}</span>);
                        // The collapsed rail shows every page as an icon; groups fold only in the full sidebar.
                        if (railCollapsed) return (
                            <div key={group} role="group" aria-label={t(`nav.groups.${group}`)} className="space-y-0.5">
                                {idx > 0 && <hr className="my-1.5 border-slate-100"/>}
                                {items.map(({href, key, defaultLabel, icon: Icon, badge}) => {
                                    const label = t(`nav.${key}`) || defaultLabel || key;
                                    const active = href === activeNav?.href;
                                    const count = badge ? counts[badge] : 0;
                                    const accessibleLabel = count ? t(`nav.badges.${badge}`, {label, count}) : label;
                                    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} aria-label={accessibleLabel}
                                                 title={accessibleLabel} onClick={() => setOpen(false)}
                                                 className={cn('relative mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                                     active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                                        <Icon size={16} className="shrink-0"/>
                                        {renderBadge(count, true)}
                                    </Link>;
                                })}
                            </div>
                        );
                        return (
                            <FoldingNavGroup key={group} id={`customer-nav-${group}`} label={t(`nav.groups.${group}`)} icon={GROUP_ICONS[group] ?? BellIcon}
                                             expanded={!!openGroups[group]} active={items.some(item => item.href === activeNav?.href)}
                                             onToggle={() => toggleGroup(group)}>
                                {items.map(({href, key, defaultLabel, badge}) => {
                                    const label = t(`nav.${key}`) || defaultLabel || key;
                                    const active = href === activeNav?.href;
                                    const count = badge ? counts[badge] : 0;
                                    const accessibleLabel = count ? t(`nav.badges.${badge}`, {label, count}) : label;
                                    return <li key={href}>
                                        <Link href={href} aria-current={active ? 'page' : undefined} aria-label={accessibleLabel} onClick={() => setOpen(false)}
                                              className={cn(foldedLinkClass(active), 'flex items-center justify-between gap-2')}>
                                            <span className="truncate">{label}</span>
                                            {renderBadge(count, false)}
                                        </Link>
                                    </li>;
                                })}
                            </FoldingNavGroup>
                        );
                    })}
                </nav>
            </aside>
            {open && (
                <button
                    className="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-xs lg:hidden"
                    aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}
                />
            )}
            <div className="flex min-w-0 flex-1 flex-col bg-white" inert={open}>
                <header className="sticky top-0 z-20 flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 sm:px-6 backdrop-blur-md">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <button
                            ref={menuButton}
                            type="button"
                            className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-control border border-border text-slate-700 hover:bg-slate-100"
                            aria-label={t('shell.openNavigation')}
                            aria-controls="customer-navigation"
                            aria-expanded={open}
                            onClick={() => setOpen(true)}
                        >
                            <Menu size={18}/>
                        </button>
                        <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-500">
                            <span className="hidden xl:inline">UAV PAS</span>
                            <span className="hidden xl:inline">/</span>
                            <span className={activeNav ? 'hidden xl:inline' : 'truncate font-semibold text-primary'}>{t('shell.customerSection')}</span>
                            {activeNav && (
                                <>
                                    <span className="hidden xl:inline">/</span>
                                    <strong className="truncate font-semibold text-slate-900">
                                        {t(`nav.${activeNav.key}`) || activeNav.defaultLabel}
                                    </strong>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 xl:gap-3">
                        <HeaderSearch items={visibleNav.map(item => ({href: item.href, label: t(`nav.${item.key}`) || item.defaultLabel || item.key, group: t(`nav.groups.${item.group}`)}))}/>
                        <PortalSwitcher currentPortal="customer"/>
                        <DispatchHotline variant="topbar"/>
                        <NotificationBell viewAllHref="/customer/notifications"/>
                        <LanguageSwitcher variant="compact" className="hidden sm:inline-flex"/>
                        <CustomerAccountMenu name={name}/>
                    </div>
                </header>
                <WelcomeBack/>
                <main id="content" className="flex w-full flex-1 flex-col bg-white outline-none" tabIndex={-1}>
                    {children}
                </main>
                <AssistantWidget portal="CUSTOMER"/>
            </div>
        </div>
    );
}

const PortalFrame = createContext(false);

/**
 * The customer portal layout's frame: signs the user in once and keeps one shell (sidebar, header,
 * assistant) mounted while the user moves between pages. Pages still wrap themselves in PageGuard.
 */
export function CustomerPortalFrame({children}: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const {isAuthenticated, isLoading} = useAuth();
    const {t} = useI18n();
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace(loginEntryForPage(pathname, '/customer/dashboard'));
    }, [router, pathname, isLoading, isAuthenticated]);
    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-sm font-semibold text-slate-500" role="status">
                {t('common.authenticating')}
            </div>
        );
    }
    return <PortalFrame.Provider value={true}><AppShell>{children}</AppShell></PortalFrame.Provider>;
}

export function PageGuard({children, permission = 'MISSION_VIEW'}: {
    children: React.ReactNode;
    permission?: string | null
}) {
    const router = useRouter();
    const pathname = usePathname();
    const {isAuthenticated, isLoading, permissionsReady, permissionError, refreshPermissions, can} = useAuth();
    const {t} = useI18n();
    const inFrame = useContext(PortalFrame);
    useEffect(() => {
        if (!inFrame && !isLoading && !isAuthenticated) router.replace(loginEntryForPage(pathname, '/customer/dashboard'));
    }, [router, pathname, inFrame, isLoading, isAuthenticated]);
    if (!inFrame && (isLoading || !isAuthenticated)) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-sm font-semibold text-slate-500" role="status">
                {t('common.authenticating')}
            </div>
        );
    }
    const content = (
        <>
            {permission && permissionError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 p-4 text-sm text-danger" role="alert">
                    <span>{t('common.permissionError')}</span>
                    <Button onClick={() => void refreshPermissions()}>{t('common.retry')}</Button>
                </div>
            ) : permission && !permissionsReady ? (
                <div className="py-10 text-center text-sm text-slate-500" role="status">{t('common.checkingPermissions')}</div>
            ) : permission && !can(permission) ? (
                <div className="border-b border-amber-200 bg-amber-50 p-4 text-sm font-medium text-warning" role="alert">
                    {t('common.permissionDenied')}
                </div>
            ) : (
                children
            )}
        </>
    );
    // Inside the portal layout the shell already exists; on its own a page still gets one.
    return inFrame ? content : <AppShell>{content}</AppShell>;
}
