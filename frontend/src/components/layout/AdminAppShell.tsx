'use client';

import {useSidebarShortcut} from '@/components/layout/useSidebarShortcut';
import {AssistantWidget} from '@/features/assistant/components/AssistantWidget';
import {WelcomeBack} from '@/components/shared/WelcomeBack';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';
import {
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    X
} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {LanguageSwitcher} from '@/components/ui/LanguageSwitcher';
import {AccountMenu} from '@/components/layout/AccountMenu';
import {AdminAlertsPopover} from '@/components/layout/AdminAlertsPopover';
import {
    ADMIN_SIDEBAR_GROUPS,
    ADMIN_SIDEBAR_ROUTES,
    resolveSidebarActiveItem,
} from '@/components/layout/sidebar-routes';
import {cn} from '@/lib/utils';

// Cấu hình routes của Sidebar Admin (bao gồm /reports, /billing, /settings, /access-control/*)
// được tách riêng và quản lý tập trung tại `@/components/layout/sidebar-routes.ts`.
const nav = ADMIN_SIDEBAR_ROUTES;
const navGroups = ADMIN_SIDEBAR_GROUPS;

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
    const shortcut = useSidebarShortcut(toggleCollapsed);

    const visibleNav = nav.filter(item => !item.permission || (permissionsReady && can(item.permission)));
    const activeNav = resolveSidebarActiveItem(visibleNav, pathname, activeResource);
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
                    'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card px-2.5 py-2.5 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen',
                    railCollapsed ? 'w-[60px]' : 'w-[220px]',
                    open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
                )}
            >
                <div className={cn("mb-2 flex items-center border-b border-slate-100 pb-2", railCollapsed ? "flex-col justify-center gap-1.5" : "justify-between gap-1.5")}>
                    <Link
                        href="/admin/dashboard"
                        className={cn('flex items-center gap-2 p-0 min-w-0', railCollapsed && 'justify-center')}
                        onClick={() => setOpen(false)}
                        title={`UAV PAS · ${t('shell.adminTitle')}`}
                    >
                        <span className="flex items-center justify-center bg-white p-0.5 rounded-lg border border-rose-100 shadow-xs overflow-hidden shrink-0">
                            <img src="/vju-logo.svg" alt={t('shell.vjuUniversity')} width={26} height={26} className="w-[26px] h-[26px] object-contain"/>
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
                        className="hidden lg:inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-lg border border-slate-200/80 bg-slate-50/80 text-slate-500 hover:border-primary/30 hover:bg-uav-red-light hover:text-primary transition-colors cursor-pointer"
                        onClick={toggleCollapsed}
                        aria-label={railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
                        aria-keyshortcuts="Control+B Meta+B"
                        title={`${railCollapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')} (${shortcut})`}
                    >
                        {railCollapsed ? <PanelLeftOpen size={14}/> : <PanelLeftClose size={14}/>}
                    </button>
                </div>
                <button
                    type="button"
                    className="rail-close lg:hidden mb-2 inline-flex h-8 w-8 items-center justify-center self-end rounded-lg border border-border text-slate-600 hover:bg-slate-100"
                    aria-label={t('shell.closeNavigation')}
                    onClick={() => setOpen(false)}
                >
                    <X size={16}/>
                </button>
                <nav aria-label={t('shell.adminSection')} className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
                    {navGroups.map((group, idx) => {
                        const items = visibleNav.filter(item => item.group === group);
                        if (!items.length) return null;
                        return (
                            <div key={group} className="space-y-0.5">
                                {railCollapsed ? (
                                    idx > 0 ? <hr className="my-1.5 border-slate-100"/> : null
                                ) : (
                                    <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
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
                                                'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-5 transition-colors',
                                                active ? 'bg-uav-red-light font-semibold text-primary' : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                                                railCollapsed && 'mx-auto h-8 w-8 justify-center px-0 py-0'
                                            )}
                                        >
                                            <Icon size={16} className="shrink-0"/>
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
                <header className="sticky top-0 z-20 flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card/90 px-4 sm:px-6 backdrop-blur-md">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-slate-500 truncate">
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
                        <AccountMenu portal="admin"/>
                    </div>
                </header>
                <WelcomeBack/>
                <main id="workspace" className="w-full flex-1 space-y-6 outline-none" tabIndex={-1}>
                    {children}
                </main>
                <AssistantWidget portal="ADMIN"/>
            </div>
        </div>
    );
}
