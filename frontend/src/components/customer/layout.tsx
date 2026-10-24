'use client';
import {useSidebarShortcut} from '@/components/layout/useSidebarShortcut';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
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
import {
    CUSTOMER_SIDEBAR_GROUPS,
    CUSTOMER_SIDEBAR_ROUTES,
    resolveSidebarActiveItem,
} from '@/components/layout/sidebar-routes';
import {useCustomerProfile} from "@/features/profile/hooks/profile-query";
import {Button} from "@/components/customer/ui";

// Cấu hình routes của Sidebar Khách hàng (bao gồm /billing, /notifications, v.v.)
// được tách riêng và quản lý tập trung tại `@/components/layout/sidebar-routes.ts`.
const navItems = CUSTOMER_SIDEBAR_ROUTES;
const navGroups = CUSTOMER_SIDEBAR_GROUPS;

export function AppShell({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {user, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const profile = useCustomerProfile();
    const [collapsed, setCollapsed] = useState(false);
    const [open, setOpen] = useState(false);
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
            const saved = localStorage.getItem('uav_customer_sidebar_collapsed');
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
                localStorage.setItem('uav_customer_sidebar_collapsed', String(next));
            } catch {
            }
            return next;
        });
    };
    const shortcut = useSidebarShortcut(toggleCollapsed);

    const name = profile.data?.fullName || user?.fullName || user?.username || t('common.appTitle');
    const visibleNav = navItems.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    const counts = useSidebarCounts();
    const badgeText = (value: number) => value > 99 ? '99+' : String(value);
    const activeNav = resolveSidebarActiveItem(visibleNav, pathname);
    const railCollapsed = collapsed && !open;

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
                className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${
                    railCollapsed ? 'w-[60px]' : 'w-[220px]'
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
                        <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={28} height={28} className="h-7 w-7 shrink-0 object-contain"/>
                        {!railCollapsed && (
                            <span className="flex flex-col leading-tight truncate">
                                <b className="text-[13.5px] font-bold text-slate-900 truncate">UAV PAS</b>
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
                <nav aria-label={t('shell.customerSection')} className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
                    {navGroups.map((group, idx) => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        return (
                            <div key={group} role="group" aria-labelledby={railCollapsed ? undefined : `nav-group-${group}`}
                                 aria-label={railCollapsed ? t(`nav.groups.${group}`) : undefined}
                                 className="space-y-0.5">
                                {railCollapsed ? (
                                    idx > 0 ? <hr className="my-1.5 border-slate-100"/> : null
                                ) : (
                                    <div id={`nav-group-${group}`} className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                                        {t(`nav.groups.${group}`)}
                                    </div>
                                )}
                                {items.map(({href, key, defaultLabel, icon: Icon, badge}) => {
                                    const label = t(`nav.${key}`) || defaultLabel || key;
                                    const active = href === activeNav?.href;
                                    const count = badge ? counts[badge] : 0;
                                    const accessibleLabel = count ? t(`nav.badges.${badge}`, {label, count}) : label;
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            aria-current={active ? 'page' : undefined}
                                            aria-label={accessibleLabel}
                                            title={railCollapsed ? accessibleLabel : undefined}
                                            onClick={() => setOpen(false)}
                                            className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-5 transition-colors ${
                                                active
                                                    ? 'bg-uav-red-light font-semibold text-primary'
                                                    : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                            } ${railCollapsed ? 'mx-auto h-8 w-8 justify-center px-0 py-0' : ''}`}
                                        >
                                            <Icon size={16} className="shrink-0"/>
                                            {!railCollapsed && <span className="flex-1 truncate">{label}</span>}
                                            {count > 0 && (railCollapsed
                                                ? <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-primary px-1 text-center text-[9.5px] font-bold leading-4 text-primary-foreground" aria-hidden="true">{badgeText(count)}</span>
                                                : <span className="min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-bold leading-5 text-primary-foreground tabular-nums" aria-hidden="true">{badgeText(count)}</span>)}
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
                <header className="sticky top-0 z-20 flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        <div className="truncate text-[13px] text-slate-500">
                            <span>UAV PAS / {t('shell.customerSection')} / </span>
                            <strong className="font-semibold text-primary">
                                {activeNav ? t(`nav.${activeNav.key}`) || activeNav.defaultLabel : t('shell.customerSection')}
                            </strong>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <DispatchHotline variant="topbar"/>
                        <NotificationBell viewAllHref="/customer/notifications"/>
                        <LanguageSwitcher variant="compact"/>
                        <CustomerAccountMenu name={name}/>
                    </div>
                </header>
                <WelcomeBack/>
                <main id="content" className="w-full flex-1 outline-none" tabIndex={-1}>
                    {children}
                </main>
            </div>
        </div>
    );
}

export function PageGuard({children, permission = 'MISSION_VIEW'}: {
    children: React.ReactNode;
    permission?: string | null
}) {
    const router = useRouter();
    const {isAuthenticated, isLoading, permissionsReady, permissionError, refreshPermissions, can} = useAuth();
    const {t} = useI18n();
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace("/customer/login");
    }, [router, isLoading, isAuthenticated]);
    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center p-6 text-sm font-semibold text-slate-500" role="status">
                {t('common.authenticating')}
            </div>
        );
    }
    return (
        <AppShell>
            {permission && permissionError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger" role="alert">
                    <span>{t('common.permissionError')}</span>
                    <Button onClick={() => void refreshPermissions()}>{t('common.retry')}</Button>
                </div>
            ) : permission && !permissionsReady ? (
                <div className="py-10 text-center text-sm text-slate-500" role="status">{t('common.checkingPermissions')}</div>
            ) : permission && !can(permission) ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-warning" role="alert">
                    {t('common.permissionDenied')}
                </div>
            ) : (
                children
            )}
        </AppShell>
    );
}
