'use client';

import {createContext, useContext, useEffect} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Menu} from 'lucide-react';
import {AssistantWidget} from '@/components/assistant/AssistantWidget';
import {CustomerAccountMenu} from '@/components/customer/CustomerAccountMenu';
import {CustomerNavSidebar} from '@/components/customer/CustomerNavSidebar';
import {DispatchHotline} from '@/components/customer/DispatchHotline';
import {HeaderSearch} from '@/components/layout/HeaderSearch';
import {PortalSwitcher} from '@/components/layout/PortalSwitcher';
import {NotificationBell} from '@/components/notification/NotificationBell';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import {PublicSupportWidget} from '@/components/support/PublicSupportWidget';
import {Alert, Button, LanguageSwitcher, UavLoader} from '@/components/ui';
import {CUSTOMER_SIDEBAR_ROUTES, resolveSidebarActiveItem} from '@/config/sidebar-routes';
import {useOwnProfile} from '@/hooks/profile/useProfile';
import {useSidebarController} from '@/hooks/useSidebarController';
import {CUSTOMER_RECENT_PAGES_KEY, rememberRecentPage} from '@/lib/recent-pages';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {loginEntryForPage} from '@/utils/auth/auth-entry';

// Cấu hình routes của Sidebar Khách hàng (bao gồm /billing, /notifications, v.v.)
// được tách riêng và quản lý tập trung tại `@/config/sidebar-routes.ts`.
const navItems = CUSTOMER_SIDEBAR_ROUTES;

export function AppShell({children}: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {user, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const profile = useOwnProfile();
    const sidebar = useSidebarController('uav_customer_sidebar_collapsed');
    const {open, setOpen, menuButton} = sidebar;

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
    const activeNav = resolveSidebarActiveItem(visibleNav, pathname);
    const searchItems = visibleNav.map(item => ({
        href: item.href,
        label: t(`nav.${item.key}`) || item.defaultLabel || item.key,
        group: t(`nav.groups.${item.group}`),
    }));

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
            <CustomerNavSidebar
                sidebar={sidebar}
                visibleNav={visibleNav}
                activeNav={activeNav}
                searchItems={searchItems}
            />
            <div className="flex min-w-0 flex-1 flex-col bg-white" inert={open}>
                <header className="sticky top-0 z-20 flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur-md sm:px-6">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <Button
                            ref={menuButton}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="inline-flex h-8 w-8 border-border p-0 text-slate-700 hover:bg-slate-100 lg:hidden"
                            aria-label={t('shell.openNavigation')}
                            aria-controls="customer-navigation"
                            aria-expanded={open}
                            onClick={() => setOpen(true)}
                        >
                            <Menu size={18}/>
                        </Button>
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
                        <HeaderSearch items={searchItems}/>
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
                <PublicSupportWidget mode="portal"/>
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
        return <UavLoader fullScreen label={t('common.authenticating')}/>;
    }
    return <PortalFrame.Provider value={true}><AppShell>{children}</AppShell></PortalFrame.Provider>;
}

export function PageGuard({children, permission = 'MISSION_VIEW'}: {
    children: React.ReactNode;
    permission?: string | null;
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
        return <UavLoader fullScreen label={t('common.authenticating')}/>;
    }
    const content = (
        <>
            {permission && permissionError ? (
                <Alert variant="error" className="rounded-none border-x-0 border-t-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>{t('common.permissionError')}</span>
                        <Button size="sm" onClick={() => void refreshPermissions()}>{t('common.retry')}</Button>
                    </div>
                </Alert>
            ) : permission && !permissionsReady ? (
                <div className="py-10 text-center text-sm text-slate-500" role="status">{t('common.checkingPermissions')}</div>
            ) : permission && !can(permission) ? (
                <Alert variant="warning" className="rounded-none border-x-0 border-t-0 font-medium">
                    {t('common.permissionDenied')}
                </Alert>
            ) : (
                children
            )}
        </>
    );
    // Inside the portal layout the shell already exists; on its own a page still gets one.
    return inFrame ? content : <AppShell>{content}</AppShell>;
}
