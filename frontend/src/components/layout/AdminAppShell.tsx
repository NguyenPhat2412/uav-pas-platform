'use client';

import Link from 'next/link';
import {activeDestination} from "@/components/shared/navigation";
import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {
    Activity,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    Menu,
    Radio,
    ScrollText,
    Settings,
    Inbox,
    Map as MapIcon,
    Plane,
    Package,
    ShieldCheck,
    Users,
    X
} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {AdminAccountMenu} from '@/components/layout/AdminAccountMenu';
import {AdminAlertsPopover} from '@/components/layout/AdminAlertsPopover';
import {cn} from '@/lib/utils';

const nav = [
    {href: "/admin/dashboard", key: 'dashboard', group: 'overview', icon: LayoutDashboard, permission: 'DASHBOARD_READ'},
    {href: "/admin/reports", key: 'reports', group: 'overview', icon: BarChart3, permission: 'DASHBOARD_READ'},
    {href: "/admin/notifications", key: 'notifications', group: 'overview', icon: Inbox, permission: 'DASHBOARD_READ'},
    {href: "/admin/fleet-map", key: 'fleetMap', group: 'fleet', icon: MapIcon, permission: 'MISSION_VIEW_ALL'},
    {href: "/operations/uavs", key: 'uavs', group: 'fleet', icon: Plane, permission: 'UAV_READ'},
    {href: "/admin/users", key: 'users', group: 'access', icon: Users, permission: 'USER_READ'},
    {href: "/admin/access-control", key: 'accessControl', group: 'access', icon: ShieldCheck, permission: 'PERMISSION_MANAGE', aliases: ['/admin/role-templates', '/admin/role-matrix', '/admin/permissions']},
    {href: "/admin/services", key: 'services', group: 'system', icon: Package, permission: 'MISSION_CONFIRM'},
    {href: "/admin/billing", key: 'billing', group: 'system', icon: CreditCard, permission: 'PERMISSION_MANAGE'},
    {href: "/admin/webhooks", key: 'webhooks', group: 'system', icon: Radio, permission: 'USER_MANAGE'},
    {href: "/admin/settings", key: 'settings', group: 'system', icon: Settings, permission: 'PERMISSION_MANAGE'},
    {href: "/admin/system-health", key: 'systemHealth', group: 'system', icon: Activity, permission: 'PERMISSION_MANAGE'},
    {href: "/admin/audit-logs", key: 'auditLogs', group: 'system', icon: ScrollText, permission: 'AUDIT_READ'},
];
const navGroups = ['overview', 'fleet', 'access', 'system'] as const;

/** pageTitle names pages that have no sidebar entry (e.g. the profile) in the breadcrumb. */
export function AppShell({children, activeResource, pageTitle}: { children: React.ReactNode; activeResource?: string; pageTitle?: string }) {
    const pathname = usePathname();
    const {can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const menuButton = useRef<HTMLButtonElement>(null);
    const rail = useRef<HTMLElement>(null);
    useEffect(() => {
        if (!open) return;
        const trigger = menuButton.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        rail.current?.querySelector<HTMLButtonElement>('.rail-close')?.focus();
        const close = () => {
            setOpen(false);
            menuButton.current?.focus();
        };
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
            if (event.key !== 'Tab') return;
            const items = [...(rail.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)') ?? [])].filter(el => el.getClientRects().length);
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        const desktop = window.matchMedia('(min-width: 901px)');
        const resize = () => {
            if (desktop.matches) setOpen(false);
        };
        desktop.addEventListener('change', resize);
        document.addEventListener('keydown', keydown);
        return () => {
            document.body.style.overflow = previousOverflow;
            requestAnimationFrame(() => trigger?.focus());
            document.removeEventListener('keydown', keydown);
            desktop.removeEventListener('change', resize);
        };
    }, [open]);

    useEffect(() => {
        try {
            const isParamCollapsed = typeof window !== 'undefined' && window.location.search.includes('collapsed=true');
            const saved = localStorage.getItem('uav_sidebar_collapsed');
            if (isParamCollapsed) {
                setCollapsed(true);
            } else if (saved !== null) {
                setCollapsed(saved === 'true');
            }
        } catch {
        }
    }, []);

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('uav_sidebar_collapsed', String(next));
            } catch {
            }
            return next;
        });
    };

    const visibleNav = nav.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    // Tabs merged into another destination keep their own URLs; resolve them to the owning menu item.
    const ownerPath = visibleNav.find(item => 'aliases' in item && item.aliases?.some(alias => pathname.startsWith(alias)))?.href;
    const activeNav = activeDestination(visibleNav, ownerPath ?? pathname, activeResource);
    const getNavLabel = (item: typeof nav[0]) => t(`adminNav.${item.key}`);
    const railCollapsed = collapsed && !open;

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
                    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card p-3.5 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen',
                    railCollapsed ? 'w-[74px]' : 'w-64',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
                )}
            >
                <div className={cn("flex items-center mb-4", railCollapsed ? "flex-col justify-center gap-2" : "justify-between")}>
                    <Link
                        href="/admin/dashboard"
                        className={cn('flex items-center gap-2.5 p-0', railCollapsed && 'justify-center')}
                        onClick={() => setOpen(false)}
                        title={`UAV PAS · ${t('shell.adminTitle')}`}
                    >
                        <span className="flex items-center justify-center bg-white p-0.5 rounded-xl border border-rose-100 shadow-xs overflow-hidden shrink-0">
                            <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={32} height={32} className="w-[32px] h-[32px] object-contain"/>
                        </span>
                        {!railCollapsed && (
                            <span className="flex flex-col leading-tight">
                                <strong className="text-[15px] font-bold text-slate-800">UAV PAS</strong>
                                <small className="text-[11px] text-slate-500 font-medium">{t('shell.adminTitle')}</small>
                            </span>
                        )}
                    </Link>
                    <button
                        type="button"
                        className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                        title={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                    >
                        {railCollapsed ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
                    </button>
                </div>
                <button
                    type="button"
                    className="rail-close lg:hidden mb-3 inline-flex h-9 w-9 items-center justify-center self-end rounded-lg border border-border text-slate-600 hover:bg-slate-100"
                    aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}
                >
                    <X size={18}/>
                </button>
                <nav aria-label={t('shell.adminSection')} className="flex flex-1 flex-col gap-4 overflow-y-auto">
                    {navGroups.map(group => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        return (
                            <div key={group} className="space-y-1">
                                {railCollapsed ? (
                                    <hr className="my-2 border-slate-100"/>
                                ) : (
                                    <div className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        {t(`adminNavGroups.${group}`)}
                                    </div>
                                )}
                                {items.map((item) => {
                                    const {href, icon: Icon} = item;
                                    const label = getNavLabel(item);
                                    const active = href === activeNav?.href;
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setOpen(false)}
                                            aria-current={active ? 'page' : undefined}
                                            aria-label={label}
                                            title={railCollapsed ? label : undefined}
                                            className={cn(
                                                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                                                active ? 'bg-uav-red-light text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                                                railCollapsed && 'justify-center px-0'
                                            )}
                                        >
                                            <Icon size={18} className="shrink-0"/>
                                            {!railCollapsed && <span className="truncate">{label}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>
            </aside>
            {open && (
                <button
                    className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
                    aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}
                />
            )}
            <div className="flex min-w-0 flex-1 flex-col" inert={open}>
                <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            ref={menuButton}
                            aria-controls="portal-navigation"
                            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-slate-700 hover:bg-slate-100"
                            aria-label={t('shell.openNavigation')}
                            aria-expanded={open}
                            onClick={() => setOpen(true)}
                        >
                            <Menu size={20}/>
                        </button>
                        <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 truncate">
                            <span>UAV PAS</span>
                            <span>/</span>
                            <span>{t('shell.adminSection')}</span>
                            {(activeNav || pageTitle) && (
                                <>
                                    <span>/</span>
                                    <strong className="text-primary font-semibold">{activeNav ? getNavLabel(activeNav) : pageTitle}</strong>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <AdminAlertsPopover/>
                        <LanguageSwitcher variant="compact"/>
                        <AdminAccountMenu/>
                    </div>
                </header>
                <main id="workspace" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 space-y-6 outline-none" tabIndex={-1}>
                    {children}
                </main>
            </div>
        </div>
    );
}
