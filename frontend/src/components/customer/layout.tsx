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
import {LanguageSwitcher} from "@/components/customer/LanguageSwitcher";
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

    return <div className="customer-shell">
        <a className="skip-link" href="#content">{t('common.skipToContent')}</a>
        <aside ref={rail} id="customer-navigation"
               className={`sidebar ${railCollapsed ? 'sidebar-collapsed' : ''} ${open ? 'sidebar-open' : ''}`}>
            <div className="sidebar-heading">
                <Link href="/customer/dashboard" className="brand" onClick={() => setOpen(false)} aria-label="UAV PAS">
                    <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={34} height={34}/>
                    {!railCollapsed && <span><b>UAV PAS</b><small>{t('shell.customerTitle')}</small></span>}
                </Link>
                <button type="button" className="collapse-toggle icon-button" onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}>
                    {railCollapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
                </button>
            </div>
            <button type="button" className="rail-close icon-button" aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}><X size={18}/></button>
            {!railCollapsed && <div className="sidebar-section-label">{t('shell.customerSection')}</div>}
            <nav aria-label={t('shell.customerSection')}>{visibleNav.map(({href, key, defaultLabel, icon: Icon}) => {
                const label = t(`nav.${key}`) || defaultLabel;
                return <Link key={href} href={href} aria-current={href === activeNav?.href ? 'page' : undefined}
                             aria-label={label} title={railCollapsed ? label : undefined}
                             onClick={() => setOpen(false)}><Icon size={18}/>{!railCollapsed && <span>{label}</span>}
                </Link>;
            })}</nav>
            <div className="sidebar-footer">
                <button type="button" className="logout" onClick={() => void logout()} aria-label={t('common.logout')}>
                    <LogOut size={18}/>{!railCollapsed && <span>{t('common.logout')}</span>}
                </button>
            </div>
        </aside>
        {open && <button className="customer-nav-scrim" aria-label={t('shell.closeNavigation')} onClick={() => setOpen(false)}/>}
        <div className="customer-workspace" inert={open}>
            <header className="topbar">
                <button ref={menuButton} type="button" className="customer-menu icon-button" aria-label={t('shell.openNavigation')}
                        aria-controls="customer-navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu
                    size={20}/></button>
                <div className="topbar-breadcrumb">
                    <span>UAV PAS / {t('shell.customerSection')} / </span><strong>{activeNav ? t(`nav.${activeNav.key}`) || activeNav.defaultLabel : t('shell.customerSection')}</strong>
                </div>
                <div className="topbar-account">
                    <LanguageSwitcher/>
                    <Link href="/customer/notifications" className="icon-button" aria-label={t('shell.notifications')}>
                        <Bell size={18}/>
                    </Link>
                    <Link href="/customer/profile" className="account" aria-label={name}>
                        <span className="customer-avatar">{name.slice(0, 1).toUpperCase()}</span>
                        <div><strong>{name}</strong></div>
                    </Link>
                </div>
            </header>
            <main id="content" className="customer-main" tabIndex={-1}>{children}</main>
        </div>
    </div>;
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
    if (isLoading || !isAuthenticated) return <div className="center-state" role="status">{t('common.authenticating')}</div>;
    return <AppShell>{permission && permissionError ?
        <div className="error" role="alert">{t('common.permissionError')} <Button
            onClick={() => void refreshPermissions()}>{t('common.retry')}</Button></div>
        : permission && !permissionsReady ? <div role="status">{t('common.checkingPermissions')}</div>
            : permission && !can(permission) ?
                <div className="notice" role="alert">{t('common.permissionDenied')}</div> : children}</AppShell>;
}
