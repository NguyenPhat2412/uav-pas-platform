'use client';
import {useSidebarController} from '@/hooks/useSidebarController';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import {AssistantWidget} from '@/components/assistant/AssistantWidget';
import React from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
    Activity,
    ClipboardList,
    LayoutDashboard,
    Menu,
    Plane,
    PanelLeftClose,
    PanelLeftOpen,
    X
} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {NotificationBell} from '@/components/notification/NotificationBell';
import {AccountMenu} from '@/components/layout/AccountMenu';
import {PortalSwitcher} from '@/components/layout/PortalSwitcher';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {useI18n} from '@/providers/I18nContext';
import {
    OPERATIONS_SIDEBAR_GROUPS,
    OPERATIONS_SIDEBAR_ROUTES,
    resolveSidebarActiveItem,
} from '@/config/sidebar-routes';
import {cn} from '@/lib/utils';
import type {LucideIcon} from 'lucide-react';
import {FoldingNavGroup, foldedLinkClass, useFoldedNavGroups} from '@/components/layout/FoldingNavGroup';
import {OPERATIONS_RECENT_PAGES_KEY, rememberRecentPage} from '@/lib/recent-pages';

// Cấu hình routes của Sidebar Điều hành (bao gồm /sar-cockpit [key: 'sar'], /notifications, v.v.)
// được tách riêng và quản lý tập trung tại `@/config/sidebar-routes.ts`.
const nav = OPERATIONS_SIDEBAR_ROUTES;
const navGroups = OPERATIONS_SIDEBAR_GROUPS;

const GROUP_ICONS: Partial<Record<(typeof OPERATIONS_SIDEBAR_GROUPS)[number], LucideIcon>> = {
    command: LayoutDashboard,
    missions: ClipboardList,
    assets: Plane,
    monitoring: Activity,
};

const ShellSlot = React.createContext<((activeResource?: string) => void) | null>(null);

/**
 * Keeps one operations shell mounted for the whole portal layout, so the sidebar, header and assistant
 * stay put between pages. Pages still render <AppShell>; inside the host it only reports the active item.
 */
export function OperationsShellHost({children}: { children: React.ReactNode }) {
    const [activeResource, setActiveResource] = React.useState<string>();
    return <ShellSlot.Provider value={setActiveResource}>
        <OperationsShell activeResource={activeResource}>{children}</OperationsShell>
    </ShellSlot.Provider>;
}

export function AppShell({children, activeResource}: { children: React.ReactNode; activeResource?: string }) {
    const report = React.useContext(ShellSlot);
    React.useLayoutEffect(() => {
        report?.(activeResource);
    }, [report, activeResource]);
    if (report) return <>{children}</>;
    return <OperationsShell activeResource={activeResource}>{children}</OperationsShell>;
}

function OperationsShell({children, activeResource}: { children: React.ReactNode; activeResource?: string }) {
    const pathname = usePathname();
    const {can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const {open, setOpen, railCollapsed, toggleCollapsed, shortcut, menuButton, rail, navList} =
        useSidebarController('uav_sidebar_collapsed');

    const visibleNav = nav.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    const activeNav = resolveSidebarActiveItem(visibleNav, pathname, activeResource);
    const {openGroups, toggleGroup} = useFoldedNavGroups('uav_ops_nav_open_groups', activeNav?.group);
    // Feeds the overview's search "Recents"; only sidebar destinations are remembered.
    const activeHref = activeNav?.href;
    React.useEffect(() => {
        if (activeHref) rememberRecentPage(OPERATIONS_RECENT_PAGES_KEY, activeHref);
    }, [activeHref]);
    const getNavLabel = (item: typeof nav[0]) => t(`operationsNav.${item.key}`);

    // Selects the Operations shape scale in globals.css; on <html> so portalled dialogs pick it up too.
    React.useEffect(() => {
        const root = document.documentElement;
        root.dataset.portal = 'operations';
        return () => {
            delete root.dataset.portal;
        };
    }, []);

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
                    'fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-all duration-200 lg:sticky lg:top-0 lg:z-40 lg:h-screen',
                    railCollapsed ? 'w-[60px]' : 'w-[min(280px,85vw)] lg:w-[220px]',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
                )}
            >
                <div className={cn("mb-2 flex items-center border-b border-slate-100 pb-2", railCollapsed ? "flex-col justify-center gap-1.5" : "justify-between gap-1.5")}>
                    <Link
                        href="/operations/overview"
                        className={cn('flex items-center gap-2 p-0 min-w-0', railCollapsed && 'justify-center')}
                        onClick={() => setOpen(false)}
                        title={`UAV PAS · ${t('shell.operationsTitle')}`}
                    >
                        <span className="flex items-center justify-center bg-white p-0.5 rounded-lg border border-rose-100 shadow-xs overflow-hidden shrink-0">
                            <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={26} height={26} className="w-[26px] h-[26px] object-contain"/>
                        </span>
                        {!railCollapsed && (
                            <span className="flex flex-col leading-tight truncate">
                                <strong className="text-[13.5px] font-bold text-slate-800 truncate">UAV PAS</strong>
                                <small className="text-[10.5px] text-slate-500 font-medium truncate">{t('shell.operationsTitle')}</small>
                            </span>
                        )}
                    </Link>
                    <button
                        type="button"
                        className="hidden lg:inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:border-primary/30 hover:bg-uav-red-light hover:text-primary transition-colors cursor-pointer"
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
                    <PortalSwitcher currentPortal="operations" variant="drawer"/>
                    <HeaderSearch variant="drawer" items={visibleNav.map(item => ({href: item.href, label: getNavLabel(item), group: t(`operationsNavGroups.${item.group}`)}))}/>
                    <LanguageSwitcher variant="compact" className="sm:hidden"/>
                </div>
                <nav ref={navList} aria-label={t('shell.operationsSection')} className={cn('flex flex-1 flex-col overflow-y-auto', railCollapsed ? 'gap-2.5' : 'gap-0.5')}>
                    {navGroups.map((group, idx) => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        // The collapsed rail shows every page as an icon; groups fold only in the full sidebar.
                        if (railCollapsed) return (
                            <div key={group} className="space-y-0.5">
                                {idx > 0 && <hr className="my-1.5 border-slate-100"/>}
                                {items.map(item => {
                                    const {href, icon: Icon} = item;
                                    const label = getNavLabel(item);
                                    const active = href === activeNav?.href;
                                    return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                                                 aria-label={label} title={label}
                                                 className={cn('mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                                     active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                                        <Icon size={16} className="shrink-0"/>
                                    </Link>;
                                })}
                            </div>
                        );
                        return (
                            <FoldingNavGroup key={group} id={`ops-nav-${group}`} label={t(`operationsNavGroups.${group}`)} icon={GROUP_ICONS[group] ?? LayoutDashboard}
                                             expanded={!!openGroups[group]} active={items.some(item => item.href === activeNav?.href)}
                                             onToggle={() => toggleGroup(group)}>
                                {items.map(item => {
                                    const active = item.href === activeNav?.href;
                                    const label = getNavLabel(item);
                                    return <li key={item.href}>
                                        <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                                              aria-label={label} className={foldedLinkClass(active)}>{label}</Link>
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
            <div className="flex min-w-0 flex-1 flex-col" inert={open}>
                <header className="sticky top-0 z-20 flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
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
                            <span className="hidden xl:inline">{t('shell.operationsSection')}</span>
                            {activeNav && (
                                <>
                                    <span className="hidden xl:inline">/</span>
                                    <strong className="truncate font-semibold text-slate-900">{getNavLabel(activeNav)}</strong>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 xl:gap-3">
                        <HeaderSearch items={visibleNav.map(item => ({href: item.href, label: getNavLabel(item), group: t(`operationsNavGroups.${item.group}`)}))}/>
                        <PortalSwitcher currentPortal="operations"/>
                        <NotificationBell/>
                        <LanguageSwitcher variant="compact" className="hidden sm:inline-flex"/>
                        <AccountMenu portal="operations"/>
                    </div>
                </header>
                <WelcomeBack/>
                <main id="workspace" className="flex w-full flex-1 flex-col bg-white outline-none" tabIndex={-1}>
                    {children}
                </main>
                <AssistantWidget portal="OPERATIONS"/>
            </div>
        </div>
    );
}
