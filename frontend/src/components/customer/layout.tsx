'use client';
import Link from 'next/link';
import {activeDestination} from "@/components/shared/navigation";
import {useEffect, useRef, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {
    Activity,
    Bell,
    Boxes,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Menu,
    User,
    X
} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {LanguageSwitcher} from "@/components/ui/LanguageSwitcher";
import {useCustomerProfile} from "@/features/profile/hooks/profile-query";
import {Button} from "@/components/customer/ui";

const navItems = [
    {
        href: "/customer/dashboard",
        key: 'dashboard',
        defaultLabel: 'Tổng quan',
        icon: LayoutDashboard,
        permission: 'MISSION_VIEW'
    },
    {href: "/customer/services", key: 'services', defaultLabel: 'Dịch vụ UAV', icon: Boxes, permission: 'MISSION_VIEW'},
    {
        href: "/customer/missions",
        key: 'missions',
        defaultLabel: 'Nhiệm vụ của tôi',
        icon: Activity,
        permission: 'MISSION_VIEW'
    },
    {href: "/customer/billing", key: 'billing', defaultLabel: 'Gói cước & Hóa đơn', icon: CreditCard},
    {href: "/customer/notifications", key: 'notifications', defaultLabel: 'Thông báo', icon: Bell},
    {href: "/customer/profile", key: 'profile', defaultLabel: 'Tài khoản', icon: User},
];

export function AppShell({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {user, logout, can, permissionsReady} = useAuth();
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

    const name = profile.data?.fullName || user?.fullName || user?.username || t('common.appTitle');
    const visibleNav = navItems.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    const activeNav = activeDestination(visibleNav, pathname);
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
                className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card p-3.5 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${
                    railCollapsed ? 'w-[74px]' : 'w-64'
                } ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
            >
                <div className={`mb-4 flex items-center ${railCollapsed ? 'flex-col justify-center gap-2' : 'justify-between'}`}>
                    <Link
                        href="/customer/dashboard"
                        className={`flex items-center gap-2.5 text-foreground ${railCollapsed ? 'justify-center' : ''}`}
                        onClick={() => setOpen(false)}
                        aria-label="UAV PAS"
                    >
                        <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={34} height={34} className="h-[34px] w-[34px] shrink-0 object-contain"/>
                        {!railCollapsed && (
                            <span className="flex flex-col leading-tight">
                                <b className="text-[15px] font-bold text-slate-900">UAV PAS</b>
                                <small className="text-[11px] font-medium text-slate-500">{t('shell.customerTitle')}</small>
                            </span>
                        )}
                    </Link>
                    <button
                        type="button"
                        className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                    >
                        {railCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
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
                {!railCollapsed && (
                    <div className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t('shell.customerSection')}
                    </div>
                )}
                <nav aria-label={t('shell.customerSection')} className="flex flex-1 flex-col gap-1">
                    {visibleNav.map(({href, key, defaultLabel, icon: Icon}) => {
                        const label = t(`nav.${key}`) || defaultLabel;
                        const active = href === activeNav?.href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                aria-label={label}
                                title={railCollapsed ? label : undefined}
                                onClick={() => setOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                                    active
                                        ? 'bg-uav-red-light text-primary'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                } ${railCollapsed ? 'justify-center px-0' : ''}`}
                            >
                                <Icon size={18} className="shrink-0"/>
                                {!railCollapsed && <span className="truncate">{label}</span>}
                            </Link>
                        );
                    })}
                </nav>
                <div className="mt-auto border-t border-slate-100 pt-3">
                    <button
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-danger transition-colors cursor-pointer ${
                            railCollapsed ? 'justify-center px-0' : ''
                        }`}
                        onClick={() => void logout()}
                        aria-label={t('common.logout')}
                    >
                        <LogOut size={18} className="shrink-0"/>
                        {!railCollapsed && <span>{t('common.logout')}</span>}
                    </button>
                </div>
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
                            type="button"
                            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-slate-700 hover:bg-slate-100"
                            aria-label={t('shell.openNavigation')}
                            aria-controls="customer-navigation"
                            aria-expanded={open}
                            onClick={() => setOpen(true)}
                        >
                            <Menu size={20}/>
                        </button>
                        <div className="truncate text-sm text-slate-500">
                            <span>UAV PAS / {t('shell.customerSection')} / </span>
                            <strong className="font-semibold text-primary">
                                {activeNav ? t(`nav.${activeNav.key}`) || activeNav.defaultLabel : t('shell.customerSection')}
                            </strong>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <LanguageSwitcher/>
                        <Link
                            href="/customer/notifications"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            aria-label={t('shell.notifications')}
                        >
                            <Bell size={18}/>
                        </Link>
                        <Link
                            href="/customer/profile"
                            className="flex items-center gap-2.5 rounded-xl border border-border bg-slate-50/70 px-2.5 py-1.5 text-sm text-slate-800 hover:bg-slate-100 transition-colors"
                            aria-label={name}
                        >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {name.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="hidden sm:block truncate max-w-[150px]">
                                <strong className="font-semibold">{name}</strong>
                            </div>
                        </Link>
                    </div>
                </header>
                <main id="content" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 outline-none" tabIndex={-1}>
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
