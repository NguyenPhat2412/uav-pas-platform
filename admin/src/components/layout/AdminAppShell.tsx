'use client';

import Image from 'next/image';
import {useSidebarController} from '@/hooks/useSidebarController';
import {AssistantWidget} from '@/components/assistant/widget/AssistantWidget';
import {AdminSupportQuickDock} from '@/components/support/AdminSupportQuickDock';
import {UnifiedFloatingLauncher} from '@/components/shared/UnifiedFloatingLauncher';
import {useSupportSummary} from '@/hooks/support/useAdminSupport';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';
import {
    Bot, CreditCard, GraduationCap, LayoutDashboard, PanelLeftClose,
    PanelLeftOpen, Server, Settings2, ShieldCheck, Users, X,
} from 'lucide-react';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {CollapsedNavFlyoutPortal, CollapsedNavGroupTrigger, useCollapsedNavFlyout} from '@/components/layout/CollapsedNavFlyout';
import {PortalSwitcher} from '@/components/layout/PortalSwitcher';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {AdminShellHeader} from '@/components/layout/AdminShellHeader';
import {ADMIN_SIDEBAR_GROUPS, ADMIN_SIDEBAR_ROUTES, ADMIN_SIDEBAR_SUBGROUPS, resolveSidebarActiveItem} from '@/config/sidebar-routes';
import {cn} from '@/lib/utils';
import {ADMIN_RECENT_PAGES_KEY, rememberRecentPage} from '@/lib/recent-pages';
import {FoldingNavGroup, FoldingSubNavGroup, foldedLinkClass, foldedSubLinkClass, useFoldedNavGroups} from '@/components/layout/FoldingNavGroup';
import {WorkspaceTabs} from '@/components/layout/WorkspaceTabs';
import {UnsavedChangesContext, useWorkspaceTabs} from '@/hooks/useWorkspaceTabs';

const nav = ADMIN_SIDEBAR_ROUTES;
const navGroups = ADMIN_SIDEBAR_GROUPS;
const navSubGroups = ADMIN_SIDEBAR_SUBGROUPS;

const GROUP_ICONS: Partial<Record<(typeof ADMIN_SIDEBAR_GROUPS)[number], typeof LayoutDashboard>> = {
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

export function AppShell({children, activeResource, pageTitle}: { children: React.ReactNode; activeResource?: string; pageTitle?: string }) {
    const pathname = usePathname();
    const {can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const {open, setOpen, railCollapsed, toggleCollapsed, shortcut, menuButton, rail, navList} =
        useSidebarController('uav_sidebar_collapsed');
    const flyout = useCollapsedNavFlyout(railCollapsed);

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
    const activeHref = activeNav?.href;
    useEffect(() => {
        if (activeHref) rememberRecentPage(ADMIN_RECENT_PAGES_KEY, activeHref);
    }, [activeHref]);

    const activeSubGroupKey = activeNav?.subGroup ? `${activeNav.group}.${activeNav.subGroup}` : undefined;
    const {openGroups, toggleGroup} = useFoldedNavGroups(OPEN_GROUPS_KEY, activeNav?.group, activeSubGroupKey);
    const getNavLabel = (item: typeof nav[0]) => {
        const key = `adminNav.${item.key}`;
        const translated = t(key);
        return translated !== key ? translated : (item.defaultLabel || item.key);
    };
    const getSubGroupLabel = (subKey: NonNullable<typeof nav[0]['subGroup']>) => {
        const key = `adminNavSubGroups.${subKey}`;
        const translated = t(key);
        return translated !== key ? translated : (navSubGroups.find(s => s.key === subKey)?.defaultLabel ?? subKey);
    };
    const searchItems = visibleNav.map(item => {
        const groupLabel = t(`adminNavGroups.${item.group}`);
        return {
            href: item.href,
            label: getNavLabel(item),
            group: item.subGroup ? `${groupLabel} · ${getSubGroupLabel(item.subGroup)}` : groupLabel,
        };
    });
    const workspaceTabs = useWorkspaceTabs({storageKey: TABS_KEY, pinnedHref: HOME, activeHref, pathname});
    const describeTab = (href: string) => {
        const item = visibleNav.find(entry => entry.href === href);
        return item && {label: getNavLabel(item), icon: item.icon};
    };
    const brandLabel = `UAV PAS · ${t('shell.adminTitle')}`;
    const toggleLabel = `${railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')} (${shortcut})`;

    const renderUnreadPill = () => (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white tabular-nums">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white"/>
            {unreadSupport > 99 ? '99+' : unreadSupport}
        </span>
    );

    return (
        <div className="flex min-h-dvh bg-background text-foreground">
            <a
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
                href="#workspace"
            >
                {t('shell.skipToContent')}
            </a>
            <aside
                ref={rail}
                id="portal-navigation"
                className={cn(
                    'fixed inset-y-0 left-0 z-[60] flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-[width,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] lg:sticky lg:top-0 lg:z-40 lg:h-dvh',
                    railCollapsed ? 'w-[60px]' : 'w-[min(280px,85vw)] lg:w-[256px]',
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
                    <HeaderSearch variant="drawer" items={searchItems}/>
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
                        const renderLeafItem = (item: typeof nav[0], nested: boolean) => {
                            const active = item.href === activeNav?.href;
                            const label = getNavLabel(item);
                            const showBadge = item.key === 'supportInbox' && unreadSupport > 0;
                            const linkCls = nested ? foldedSubLinkClass(active) : foldedLinkClass(active);
                            return (
                                <li key={item.href}>
                                    <Link href={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                                          aria-label={label} title={label} className={cn(linkCls, showBadge && 'flex items-center justify-between gap-1.5')}>
                                        <span className="truncate">{label}</span>
                                        {showBadge && renderUnreadPill()}
                                    </Link>
                                </li>
                            );
                        };
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
                                    items={items.map(item => ({
                                        href: item.href,
                                        label: getNavLabel(item),
                                        subGroupLabel: item.subGroup ? getSubGroupLabel(item.subGroup) : undefined,
                                        active: item.href === activeNav?.href,
                                        badge: item.key === 'supportInbox' && unreadSupport > 0 ? renderUnreadPill() : undefined,
                                    }))}
                                />
                            );
                        }
                        const directItems = items.filter(item => !item.subGroup);
                        const groupSubGroups = navSubGroups.filter(sg => sg.group === group && items.some(item => item.subGroup === sg.key));
                        return (
                            <FoldingNavGroup key={group} id={`admin-nav-${group}`} label={groupLabel} icon={GroupIcon}
                                             expanded={expanded} active={groupActive} onToggle={() => toggleGroup(group)}>
                                {directItems.map(item => renderLeafItem(item, false))}
                                {groupSubGroups.map(sg => {
                                    const subItems = items.filter(item => item.subGroup === sg.key);
                                    const stateKey = `${group}.${sg.key}`;
                                    const subExpanded = !!openGroups[stateKey];
                                    const subActive = subItems.some(item => item.href === activeNav?.href);
                                    const subHasUnread = subItems.some(item => item.key === 'supportInbox') && unreadSupport > 0;
                                    return (
                                        <FoldingSubNavGroup
                                            key={sg.key}
                                            id={`admin-subnav-${group}-${sg.key}`}
                                            label={getSubGroupLabel(sg.key)}
                                            icon={sg.icon}
                                            count={subItems.length}
                                            badge={subHasUnread && !subExpanded ? renderUnreadPill() : undefined}
                                            expanded={subExpanded}
                                            active={subActive}
                                            onToggle={() => toggleGroup(stateKey)}
                                        >
                                            {subItems.map(item => renderLeafItem(item, true))}
                                        </FoldingSubNavGroup>
                                    );
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
                    <AdminShellHeader
                        menuButton={menuButton}
                        open={open}
                        onOpenMenu={() => setOpen(true)}
                        activeNav={activeNav}
                        pageTitle={pageTitle}
                        searchItems={searchItems}
                        getNavLabel={getNavLabel}
                        getSubGroupLabel={getSubGroupLabel}
                    />
                    <WorkspaceTabs tabs={workspaceTabs.tabs} activeHref={activeHref} pinnedHref={HOME} dirtyHref={workspaceTabs.dirtyHref}
                                   describe={describeTab} onClose={workspaceTabs.close} onCloseOthers={workspaceTabs.closeOthers}/>
                </div>
                <WelcomeBack/>
                <main id="workspace" className="flex w-full flex-1 flex-col gap-4 pb-20 outline-none lg:pr-16" tabIndex={-1}>
                    <UnsavedChangesContext.Provider value={workspaceTabs.reportDirty}>{children}</UnsavedChangesContext.Provider>
                </main>
                <AdminSupportQuickDock hideLauncher/>
                <AssistantWidget portal="ADMIN" hideLauncher/>
                <UnifiedFloatingLauncher/>
            </div>
        </div>
    );
}
