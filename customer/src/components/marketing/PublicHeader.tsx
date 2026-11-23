'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {Briefcase, ChevronDown, LogOut, Menu, Radar, ShieldCheck, Store, UserCheck, X} from 'lucide-react';
import {Button} from '@/components/ui';
import {customerUrl} from '@/content/marketing/origins';
import {supportedLocales} from '@/i18n/config';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {openAuthModal} from '@/components/auth/modal/AuthModalPopup';
import {canUsePortal, portalForRole, portalHome} from '@/utils/auth/portal';

const primaryNavLinks = [
    ['/services', 'publicHeader.services'],
    ['/how-it-works', 'publicHeader.howItWorks'],
    ['/digital-twin', 'publicHeader.digitalTwin'],
    ['/pricing', 'publicHeader.pricing'],
] as const;

const secondaryNavLinks = [
    ['/solutions', 'publicHeader.solutions'],
    ['/about', 'publicHeader.about'],
    ['/contact', 'publicHeader.contact'],
] as const;

const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks] as const;

export function PublicHeader() {
    const [open, setOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const {user, isAuthenticated, logout} = useAuth();
    const {t, locale, setLocale} = useI18n();
    const dashboardHref = user
        ? portalForRole(user.role) === 'operations'
            ? '/operations/overview'
            : portalHome(portalForRole(user.role))
        : `${customerUrl}/dashboard`;

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const secondaryActive = secondaryNavLinks.some(([href]) => isActive(href));
    const close = () => {
        setOpen(false);
        setMoreOpen(false);
    };

    useEffect(() => {
        if (!moreOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
                setMoreOpen(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [moreOpen]);

    const outline =
        'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary';
    const filled =
        'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
    const multiPortal = canUsePortal(user?.role ?? '', 'admin') || canUsePortal(user?.role ?? '', 'operations');

    const localeToggle = (
        <div
            className="inline-flex shrink-0 items-center whitespace-nowrap rounded-control border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label={t('publicSite.header.languageLabel')}
        >
            {supportedLocales.map(code => (
                <button
                    key={code}
                    type="button"
                    aria-pressed={locale === code}
                    onClick={() => setLocale(code)}
                    className={cn(
                        'cursor-pointer whitespace-nowrap rounded-badge px-2 py-1 text-[11px] font-bold uppercase transition-colors',
                        locale === code
                            ? 'bg-primary text-primary-foreground'
                            : 'text-slate-600 hover:text-slate-900',
                    )}
                >
                    {code}
                </button>
            ))}
        </div>
    );

    const renderActions = (inDrawer: boolean) =>
        isAuthenticated && user ? (
            <>
                <Link
                    href={`${customerUrl}/provider/onboarding`}
                    onClick={close}
                    className={cn(outline, !inDrawer && 'hidden 2xl:inline-flex')}
                >
                    <Store size={14} className="shrink-0" aria-hidden="true"/>
                    <span className="max-w-36 truncate">{t('publicSite.header.becomeProvider')}</span>
                </Link>
                {multiPortal ? (
                    <div
                        className="inline-flex shrink-0 items-center gap-1 rounded-control border border-slate-200 bg-slate-100/90 p-1"
                        aria-label={t('shell.portalSwitcher.ariaLabel')}
                    >
                        {canUsePortal(user.role, 'admin') && (
                            <Link
                                href="/admin/dashboard"
                                onClick={close}
                                className="inline-flex size-8 items-center justify-center rounded-badge bg-primary text-white transition-colors hover:bg-primary-hover"
                                title={t('publicHeader.adminPortal')}
                                aria-label={t('publicHeader.adminPortal')}
                            >
                                <ShieldCheck size={16} aria-hidden="true"/>
                                <span className="sr-only">{t('publicHeader.adminPortal')}</span>
                            </Link>
                        )}
                        {canUsePortal(user.role, 'operations') && (
                            <Link
                                href="/operations/overview"
                                onClick={close}
                                className="inline-flex size-8 items-center justify-center rounded-badge text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                                title={t('publicHeader.operationsPortal')}
                                aria-label={t('publicHeader.operationsPortal')}
                            >
                                <Radar size={16} className="text-uav-blue" aria-hidden="true"/>
                                <span className="sr-only">{t('publicHeader.operationsPortal')}</span>
                            </Link>
                        )}
                        <Link
                            href={`${customerUrl}/dashboard`}
                            onClick={close}
                            className="inline-flex size-8 items-center justify-center rounded-badge text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                            title={t('publicHeader.customerPortal')}
                            aria-label={t('publicHeader.customerPortal')}
                        >
                            <Briefcase size={16} aria-hidden="true"/>
                            <span className="sr-only">{t('publicHeader.customerPortal')}</span>
                        </Link>
                    </div>
                ) : (
                    <Link href={dashboardHref} onClick={close} className={filled}>
                        <UserCheck size={14} className="shrink-0"/>
                        <span className="max-w-40 truncate">
                            {t('publicHeader.customerPortalUser', {username: user.username})}
                        </span>
                    </Link>
                )}
                <button
                    type="button"
                    onClick={() => {
                        close();
                        void logout();
                    }}
                    className={`${outline} px-2.5`}
                    title={t('common.logout')}
                    aria-label={t('common.logout')}
                >
                    <LogOut size={14}/>
                </button>
            </>
        ) : (
            <>
                <Link
                    href={`${customerUrl}/provider/onboarding`}
                    onClick={close}
                    className={cn(outline, !inDrawer && 'hidden 2xl:inline-flex')}
                >
                    <Store size={14} className="shrink-0" aria-hidden="true"/>
                    <span className="max-w-36 truncate">{t('publicSite.header.becomeProvider')}</span>
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        close();
                        openAuthModal('login');
                    }}
                    className={`nav-login ${outline}`}
                >
                    {t('publicHeader.login')}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        close();
                        openAuthModal('register');
                    }}
                    className={filled}
                >
                    {t('publicHeader.register')}
                </button>
            </>
        );

    return (
        <header
            className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs"
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    if (moreOpen) setMoreOpen(false);
                    if (open) {
                        setOpen(false);
                        event.currentTarget.querySelector<HTMLButtonElement>('.menu-button')?.focus();
                    }
                }
            }}
        >
            <div className="relative mx-auto flex min-h-[72px] w-full max-w-[1380px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
                <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="UAV PAS">
                    <Image
                        src="/uav-pas-logo.svg"
                        alt="UAV PAS"
                        width={42}
                        height={42}
                        priority
                        className="size-[42px] shrink-0 rounded-full bg-white p-0.5 object-contain shadow-2xs ring-1 ring-slate-200"
                    />
                    <span className="border-l border-slate-200 pl-3">
                        <span className="hidden whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 2xl:block">
                            {t('publicHeader.tagline')}
                        </span>
                        <span className="block whitespace-nowrap text-[17px] font-extrabold tracking-tight text-slate-900">
                            UAV<span className="text-primary">PAS</span>
                        </span>
                    </span>
                </Link>

                <nav className="hidden min-w-0 items-center gap-5 xl:flex 2xl:gap-6" aria-label={t('publicHeader.services')}>
                    {primaryNavLinks.map(([href, labelKey]) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={isActive(href) ? 'page' : undefined}
                            className={`shrink-0 whitespace-nowrap text-xs transition-colors hover:text-primary ${
                                isActive(href) ? 'font-bold text-primary' : 'font-medium text-slate-600'
                            }`}
                        >
                            {t(labelKey)}
                        </Link>
                    ))}

                    <div ref={moreRef} className="relative">
                        <button
                            type="button"
                            aria-expanded={moreOpen}
                            aria-haspopup="menu"
                            onClick={() => setMoreOpen(prev => !prev)}
                            className={cn(
                                'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-control px-2.5 py-1.5 text-xs transition-colors hover:bg-slate-100 hover:text-primary',
                                secondaryActive || moreOpen ? 'font-bold text-primary' : 'font-medium text-slate-600',
                            )}
                        >
                            <span>{t('publicSite.header.moreMenu')}</span>
                            <ChevronDown size={14} className={cn('shrink-0 transition-transform', moreOpen && 'rotate-180')} aria-hidden="true"/>
                        </button>
                        {moreOpen && (
                            <div
                                role="menu"
                                className="absolute top-full right-0 z-40 mt-1.5 min-w-52 rounded-panel border border-slate-200 bg-white p-1.5 shadow-lg"
                            >
                                {secondaryNavLinks.map(([href, labelKey]) => (
                                    <Link
                                        key={href}
                                        role="menuitem"
                                        href={href}
                                        onClick={close}
                                        className={cn(
                                            'flex items-center whitespace-nowrap rounded-control px-3 py-2 text-xs transition-colors hover:bg-slate-50',
                                            isActive(href) ? 'font-bold text-primary' : 'font-medium text-slate-700',
                                        )}
                                    >
                                        {t(labelKey)}
                                    </Link>
                                ))}
                                <div className="my-1 border-t border-slate-100"/>
                                <Link
                                    role="menuitem"
                                    href={`${customerUrl}/provider/onboarding`}
                                    onClick={close}
                                    className="flex items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                                >
                                    <Store size={14} className="shrink-0 text-primary" aria-hidden="true"/>
                                    <span>{t('publicSite.header.becomeProvider')}</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="hidden shrink-0 items-center gap-2 xl:flex">
                    {localeToggle}
                    {renderActions(false)}
                </div>

                <div className="flex shrink-0 items-center gap-2 xl:hidden">
                    {localeToggle}
                    <Button
                        variant="outline"
                        size="sm"
                        className="menu-button grid size-10 shrink-0 cursor-pointer place-items-center rounded-control border border-slate-200 bg-white p-0 text-foreground hover:bg-slate-50"
                        type="button"
                        aria-expanded={open}
                        aria-controls="public-nav"
                        onClick={() => setOpen(!open)}
                    >
                        <span className="sr-only">{open ? t('shell.closeNavigation') : t('shell.openNavigation')}</span>
                        {open ? <X size={18} aria-hidden="true"/> : <Menu size={18} aria-hidden="true"/>}
                    </Button>
                </div>
            </div>
            {open && (
                <nav
                    id="public-nav"
                    className="absolute top-full right-0 left-0 grid gap-0.5 border-b border-slate-200 bg-white px-5 py-3 shadow-lg xl:hidden"
                    aria-label={t('publicHeader.services')}
                >
                    {allNavLinks.map(([href, labelKey]) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={close}
                            aria-current={isActive(href) ? 'page' : undefined}
                            className={`whitespace-nowrap rounded-control px-3 py-2.5 text-sm hover:bg-slate-50 ${
                                isActive(href) ? 'font-semibold text-primary' : 'text-slate-700'
                            }`}
                        >
                            {t(labelKey)}
                        </Link>
                    ))}
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {renderActions(true)}
                    </div>
                </nav>
            )}
        </header>
    );
}
