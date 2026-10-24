'use client';

import Link from 'next/link';
import {useState} from 'react';
import {LogOut, Shield, UserCheck} from 'lucide-react';
import {Button} from '@/components/shared';
import {useAuth} from '@/contexts/AuthContext';
import {openAuthModal} from '@/features/auth/components/AuthModalPopup';
import {portalForRole, portalHome} from '@/features/auth/utils/portal';

const links = [
    ['/services', 'Dịch vụ'],
    ['/solutions', 'Giải pháp'],
    ['/how-it-works', 'Quy trình thực hiện'],
    ['/about', 'Giới thiệu'],
    ['/contact', 'Liên hệ'],
];

export function PublicHeader() {
    const [open, setOpen] = useState(false);
    const {user, isAuthenticated, logout} = useAuth();
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
                    <span className="sr-only">{open ? 'Đóng trình đơn' : 'Mở trình đơn'}</span>
                    <span aria-hidden="true">☰</span>
                </Button>
                <nav
                    id="public-nav"
                    className={`${
                        open
                            ? 'absolute left-4 right-4 top-full z-40 mt-2 flex flex-col gap-2 rounded-overlay border border-border bg-card p-4 shadow-xl'
                            : 'hidden'
                    } lg:static lg:mt-0 lg:flex lg:flex-row lg:items-center lg:gap-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
                    aria-label="Điều hướng chính"
                >
                    {links.map(([href, label]) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex min-h-10 items-center text-sm font-semibold text-slate-700 transition-colors hover:text-primary lg:min-h-0"
                        >
                            {label}
                        </Link>
                    ))}

                    {isAuthenticated && user ? (
                        <div className="flex flex-wrap items-center gap-2.5">
                            <Link
                                href={dashboardHref}
                                onClick={() => setOpen(false)}
                                className="inline-flex min-h-9 items-center gap-2 rounded-control bg-primary px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary-hover"
                            >
                                <UserCheck size={14} />
                                Cổng điều hành ({user.username})
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    void logout();
                                }}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                            >
                                <LogOut size={13} />
                                Đăng xuất
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
                                Đăng nhập
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
                                Bắt đầu
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
