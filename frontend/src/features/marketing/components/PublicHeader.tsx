'use client';

import Link from 'next/link';
import {useState} from 'react';
import {usePathname} from 'next/navigation';
import {Briefcase, LogOut, Menu, Radar, ShieldCheck, UserCheck, X} from 'lucide-react';
import {Button} from '@/components/shared';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {openAuthModal} from '@/features/auth/components/AuthModalPopup';
import {canUsePortal, portalForRole, portalHome} from '@/features/auth/utils/portal';

const navLinks = [
    ['/services', 'publicHeader.services'],
    ['/solutions', 'publicHeader.solutions'],
    ['/pricing', 'publicHeader.pricing'],
    ['/how-it-works', 'publicHeader.howItWorks'],
    ['/about', 'publicHeader.about'],
    ['/contact', 'publicHeader.contact'],
] as const;

export function PublicHeader() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const {user, isAuthenticated, logout} = useAuth();
    const {t} = useI18n();
    const dashboardHref = user ? (portalForRole(user.role) === 'operations' ? '/operations/overview' : portalHome(portalForRole(user.role))) : '/customer/dashboard';

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const close = () => setOpen(false);
    const outline = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary';
    const filled = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
    const multiPortal = canUsePortal(user?.role ?? '', 'admin') || canUsePortal(user?.role ?? '', 'operations');

    const actions = isAuthenticated && user ? <>
        {multiPortal ? (
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1" aria-label={t('shell.portalSwitcher.ariaLabel')}>
                {canUsePortal(user.role, 'admin') && (
                    <Link
                        href="/admin/dashboard"
                        onClick={close}
                        className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-white shadow-2xs transition-colors hover:bg-primary-hover"
                        title={t('publicHeader.adminPortal')}
                        aria-label={t('publicHeader.adminPortal')}
                    >
                        <ShieldCheck size={16} aria-hidden="true" />
                        <span className="sr-only">{t('publicHeader.adminPortal')}</span>
                    </Link>
                )}
                {canUsePortal(user.role, 'operations') && (
                    <Link
                        href="/operations/overview"
                        onClick={close}
                        className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                        title={t('publicHeader.operationsPortal')}
                        aria-label={t('publicHeader.operationsPortal')}
                    >
                        <Radar size={16} className="text-uav-blue" aria-hidden="true" />
                        <span className="sr-only">{t('publicHeader.operationsPortal')}</span>
                    </Link>
                )}
                <Link
                    href="/customer/dashboard"
                    onClick={close}
                    className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                    title={t('publicHeader.customerPortal')}
                    aria-label={t('publicHeader.customerPortal')}
                >
                    <Briefcase size={16} aria-hidden="true" />
                    <span className="sr-only">{t('publicHeader.customerPortal')}</span>
                </Link>
            </div>
        ) : (
            <Link href={dashboardHref} onClick={close} className={filled}>
                <UserCheck size={14}/>{t('publicHeader.customerPortalUser', {username: user.username})}
            </Link>
        )}
        <button type="button" onClick={() => {
            close();
            void logout();
        }} className={`${outline} px-2.5`} title={t('common.logout')} aria-label={t('common.logout')}>
            <LogOut size={14}/>
        </button>
    </> : <>
        <button type="button" onClick={() => {
            close();
            openAuthModal('login');
        }} className={`nav-login ${outline}`}>{t('publicHeader.login')}</button>
        <button type="button" onClick={() => {
            close();
            openAuthModal('register');
        }} className={filled}>{t('publicHeader.register')}</button>
    </>;

    return (
        <>
            {/* University strip, as on the other VJU sites; it scrolls away while the header stays. */}
            <div className="bg-primary px-5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white sm:text-[11px]">
                <span className="whitespace-nowrap">{t('publicHeader.stripSchool')}</span> · <span className="whitespace-nowrap">{t('publicHeader.stripUniversity')}</span>
            </div>
            <header
                className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs"
                onKeyDown={(event) => {
                    if (event.key === 'Escape' && open) {
                        setOpen(false);
                        event.currentTarget.querySelector<HTMLButtonElement>('.menu-button')?.focus();
                    }
                }}
            >
                <div className="relative mx-auto flex min-h-[76px] w-full max-w-[1380px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
                    <Link href="/" className="flex min-w-0 items-center gap-3.5" aria-label="UAV PAS - Đại học Việt Nhật">
                        <img src="/vju-logo.svg" alt="" width={46} height={46}
                             className="size-[46px] shrink-0 rounded-full bg-white p-0.5 object-contain shadow-2xs ring-1 ring-slate-200"/>
                        <span className="min-w-0 border-l border-slate-200 pl-3.5">
                            <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">Vietnam Japan University</span>
                            <span className="mt-0.5 block text-[17px] font-extrabold tracking-tight text-slate-900">UAV<span className="text-primary">PAS</span></span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-7 xl:flex" aria-label="Điều hướng chính">
                        {navLinks.map(([href, labelKey]) => (
                            <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}
                                  className={`text-xs transition-colors hover:text-primary ${isActive(href) ? 'font-bold text-primary' : 'font-medium text-slate-600'}`}>
                                {t(labelKey)}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-2.5 xl:flex">{actions}</div>

                    <Button
                        className="menu-button grid size-10 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-foreground hover:bg-slate-50 xl:hidden"
                        type="button"
                        aria-expanded={open}
                        aria-controls="public-nav"
                        onClick={() => setOpen(!open)}
                    >
                        <span className="sr-only">{open ? t('shell.closeNavigation') : t('shell.openNavigation')}</span>
                        {open ? <X size={18} aria-hidden="true"/> : <Menu size={18} aria-hidden="true"/>}
                    </Button>
                </div>
                {open && <nav id="public-nav" className="absolute left-0 right-0 top-full grid gap-0.5 border-b border-slate-200 bg-white px-5 py-3 shadow-lg xl:hidden" aria-label="Điều hướng chính">
                    {navLinks.map(([href, labelKey]) => (
                        <Link key={href} href={href} onClick={close} aria-current={isActive(href) ? 'page' : undefined}
                              className={`rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50 ${isActive(href) ? 'font-semibold text-primary' : 'text-slate-700'}`}>
                            {t(labelKey)}
                        </Link>
                    ))}
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{actions}</div>
                </nav>}
            </header>
        </>
    );
}
