'use client';

import Link from 'next/link';
import {useState} from 'react';
import {Briefcase, LogOut, Radar, Shield, ShieldCheck, UserCheck} from 'lucide-react';
import {Button} from '@/components/shared';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
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
    const {user, isAuthenticated, logout} = useAuth();
    const {t} = useI18n();
    const dashboardHref = user ? (portalForRole(user.role) === 'operations' ? '/operations/overview' : portalHome(portalForRole(user.role))) : '/customer/dashboard';

    return (
        <header
            className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md"
            onKeyDown={(event) => {
                if (event.key === 'Escape' && open) {
                    setOpen(false);
                    event.currentTarget.querySelector<HTMLButtonElement>('.menu-button')?.focus();
                }
            }}
        >
            <div className="relative mx-auto flex min-h-[68px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link
                    className="inline-flex items-center gap-2.5 text-base font-extrabold tracking-wider text-foreground"
                    href="/"
                    aria-label="UAV PAS - Đại học Việt Nhật"
                >
                    <img
                        src="/vju-logo.svg"
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                    />
                    <span>UAV PAS</span>
                </Link>
                <Button
                    className="menu-button inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-control border border-border bg-card text-foreground hover:bg-slate-100 lg:hidden"
                    type="button"
                    aria-expanded={open}
                    aria-controls="public-nav"
                    onClick={() => setOpen(!open)}
                >
                    <span className="sr-only">{open ? t('shell.closeNavigation') : t('shell.openNavigation')}</span>
                    <span aria-hidden="true">☰</span>
                </Button>
                <nav
                    id="public-nav"
                    className={`${
                        open
                            ? 'absolute left-4 right-4 top-full z-40 mt-2 flex flex-col gap-2 rounded-overlay border border-border bg-card p-4 shadow-xl'
                            : 'hidden'
                    } lg:static lg:mt-0 lg:flex lg:flex-row lg:items-center lg:gap-5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
                    aria-label="Điều hướng chính"
                >
                    {navLinks.map(([href, labelKey]) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex min-h-10 items-center text-sm font-semibold text-slate-700 transition-colors hover:text-primary lg:min-h-0"
                        >
                            {t(labelKey)}
                        </Link>
                    ))}

                    {isAuthenticated && user ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {canUsePortal(user.role, 'admin') && (
                                <Link
                                    href="/admin/dashboard"
                                    onClick={() => setOpen(false)}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover"
                                >
                                    <ShieldCheck size={14} />
                                    {t('publicHeader.adminPortal')}
                                </Link>
                            )}
                            {canUsePortal(user.role, 'operations') && (
                                <Link
                                    href="/operations/overview"
                                    onClick={() => setOpen(false)}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-colors hover:bg-slate-50"
                                >
                                    <Radar size={14} className="text-uav-blue" />
                                    {t('publicHeader.operationsPortal')}
                                </Link>
                            )}
                            <Link
                                href={canUsePortal(user.role, 'admin') || canUsePortal(user.role, 'operations') ? '/customer/dashboard' : dashboardHref}
                                onClick={() => setOpen(false)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 transition-colors hover:bg-slate-50"
                            >
                                {canUsePortal(user.role, 'admin') || canUsePortal(user.role, 'operations') ? (
                                    <>
                                        <Briefcase size={14} className="text-primary" />
                                        {t('publicHeader.customerPortal')}
                                    </>
                                ) : (
                                    <>
                                        <UserCheck size={14} />
                                        {t('publicHeader.customerPortalUser', {username: user.username})}
                                    </>
                                )}
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    void logout();
                                }}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                                title={t('common.logout')}
                            >
                                <LogOut size={13} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    openAuthModal('login');
                                }}
                                className="nav-login flex min-h-10 cursor-pointer items-center text-sm font-bold text-slate-800 transition-colors hover:text-primary lg:min-h-0"
                            >
                                {t('publicHeader.login')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    openAuthModal('register');
                                }}
                                className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover"
                            >
                                <Shield size={13} />
                                {t('publicHeader.start')}
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
