'use client';

import Link from 'next/link';
import {activeDestination} from "@/components/shared/navigation";
import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Menu,
    Radio,
    ScrollText,
    Settings,
    Bell,
    ShieldCheck,
    Users,
    X
} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {useAdminAnalytics} from '@/lib/query/admin';
import {displayLabel} from "@/components/shared/presentation";
import {cn} from '@/lib/utils';

const nav = [
    {href: "/admin/dashboard", key: 'dashboard', group: 'overview', icon: LayoutDashboard, permission: 'DASHBOARD_READ'},
    {href: "/admin/reports", key: 'reports', group: 'overview', icon: BarChart3, permission: 'DASHBOARD_READ'},
    {href: "/admin/users", key: 'users', group: 'access', icon: Users, permission: 'USER_READ'},
    {href: "/admin/access-control", key: 'accessControl', group: 'access', icon: ShieldCheck, permission: 'PERMISSION_MANAGE', aliases: ['/admin/role-templates', '/admin/role-matrix', '/admin/permissions']},
    {href: "/admin/billing", key: 'billing', group: 'system', icon: CreditCard, permission: 'PERMISSION_MANAGE'},
    {href: "/admin/webhooks", key: 'webhooks', group: 'system', icon: Radio, permission: 'USER_MANAGE'},
    {href: "/admin/settings", key: 'settings', group: 'system', icon: Settings, permission: 'PERMISSION_MANAGE'},
    {href: "/admin/audit-logs", key: 'auditLogs', group: 'system', icon: ScrollText, permission: 'AUDIT_READ'},
];
const navGroups = ['overview', 'access', 'system'] as const;

export function AppShell({children, activeResource}: { children: React.ReactNode; activeResource?: string }) {
    const pathname = usePathname();
    const {user, logout, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const alerts = useAdminAnalytics(30).data?.alerts ?? [];
    const urgent = alerts.some(alert => alert.level === 'danger');
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

    const name = user?.fullName || user?.username || t('shell.dutyOfficer');
    const roleLabel = displayLabel(user?.role);
    const visibleNav = nav.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    // Tabs merged into another destination keep their own URLs; resolve them to the owning menu item.
    const ownerPath = visibleNav.find(item => 'aliases' in item && item.aliases?.some(alias => pathname.startsWith(alias)))?.href;
    const activeNav = activeDestination(visibleNav, ownerPath ?? pathname, activeResource);
    const getNavLabel = (item: typeof nav[0]) => t(`adminNav.${item.key}`);
    const railCollapsed = collapsed && !open;

    return <div className="app-shell admin-console">
        <a className="skip-link" href="#workspace">{t('shell.skipToContent')}</a>
        <aside ref={rail} id="portal-navigation"
               className={cn('app-rail', open && 'app-rail-open', railCollapsed && 'app-rail-collapsed')}>
            <div
                className={cn("app-rail-top flex items-center mb-4", railCollapsed ? "flex-col justify-center gap-2" : "justify-between")}>
                <Link href="/admin/dashboard"
                      className={cn('app-brand !p-0 !gap-2.5', railCollapsed && 'app-brand-collapsed !justify-center')}
                      onClick={() => setOpen(false)} title={`UAV PAS · ${t('shell.adminTitle')}`}>
                    <span
                        className="app-brand-mark flex items-center justify-center bg-white p-0.5 rounded-xl border border-rose-100 shadow-sm overflow-hidden flex-shrink-0">
                      <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={32} height={32}
                           className="w-[32px] h-[32px] object-contain"/>
                    </span>
                    {!railCollapsed && <span className="brand-text flex flex-col leading-tight"><strong
                        className="text-[15px] font-bold text-slate-800">UAV PAS</strong><small
                        className="text-[11px] text-slate-500 font-medium">{t('shell.adminTitle')}</small></span>}
                </Link>
                <button
                    type="button"
                    className="collapse-toggle hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    onClick={toggleCollapsed}
                    aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                    title={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                >
                    {railCollapsed ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
                </button>
            </div>
            <button type="button" className="rail-close icon-button" aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}><X size={18}/></button>
            <nav aria-label={t('shell.adminSection')} className="admin-nav">{navGroups.map(group => {
                const items = visibleNav.filter(item => item.group === group);
                if (!items.length) return null;
                return <div key={group} className="admin-nav-group">
                    {railCollapsed ? <hr className="admin-nav-divider"/> :
                        <div className="app-rail-label">{t(`adminNavGroups.${group}`)}</div>}
                    {items.map((item) => {
                        const {href, icon: Icon} = item;
                        const label = getNavLabel(item);
                        const active = href === activeNav?.href;
                        return <Link key={href} href={href} onClick={() => setOpen(false)}
                                     aria-current={active ? 'page' : undefined} aria-label={label}
                                     title={railCollapsed ? label : undefined}
                                     className={cn('app-nav-link', active && 'app-nav-link-active', railCollapsed && '!justify-center !px-0')}><Icon
                            size={18} className="flex-shrink-0"/>{!railCollapsed && <span className="truncate">{label}</span>}
                        </Link>;
                    })}
                </div>;
            })}</nav>
            <div className="rail-footer">
                <div className={cn('admin-rail-account', railCollapsed && 'admin-rail-account-collapsed')}>
                    <span className="avatar-chip" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                    {!railCollapsed && <div className="min-w-0 leading-tight">
                        <strong className="truncate">{name}</strong>
                        <small className="truncate">{roleLabel}</small>
                    </div>}
                    <button type="button" className="admin-logout" onClick={() => void logout()}
                            aria-label={t('common.logout')} title={t('common.logout')}><LogOut size={16}/></button>
                </div>
                {!railCollapsed && <p>UAV PAS <span>{t('shell.vjuUniversity')}</span></p>}
            </div>
        </aside>
        {open && <button className="nav-scrim" aria-label={t('shell.closeNavigation')} onClick={() => setOpen(false)}/>}
        <div className="workspace-content" inert={open}>
            <header className="app-topbar">
                <button ref={menuButton} aria-controls="portal-navigation" className="mobile-menu icon-button"
                        aria-label={t('shell.openNavigation')} aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20}/>
                </button>
                <div className="topbar-location">
                    <span>UAV PAS</span>
                    <span>/</span>
                    <span>{t('shell.adminSection')}</span>
                    {activeNav && <>
                        <span>/</span>
                        <strong className="text-[#ab2523] font-semibold">{getNavLabel(activeNav)}</strong>
                    </>}
                </div>
                <div className="account-summary">
                    <span className="admin-env-chip" title={t('shell.adminTitle')}>
                        <span className="admin-env-dot" aria-hidden="true"/>{t('shell.adminTitle')}</span>
                    <Link href="/admin/dashboard#alerts" className={cn('admin-bell', alerts.length > 0 && 'admin-bell-active', urgent && 'admin-bell-urgent')}
                          aria-label={alerts.length ? t('admin.analytics.alertsCount', {count: alerts.length}) : t('admin.analytics.alertsNone')}
                          title={alerts.length ? t('admin.analytics.alertsCount', {count: alerts.length}) : t('admin.analytics.alertsNone')}>
                        <Bell size={17} aria-hidden="true"/>{alerts.length > 0 && <span>{alerts.length}</span>}
                    </Link>
                    <LanguageSwitcher variant="compact"/>
                </div>
            </header>
            <main id="workspace" className="app-main" tabIndex={-1}>{children}</main>
        </div>
    </div>;
}
