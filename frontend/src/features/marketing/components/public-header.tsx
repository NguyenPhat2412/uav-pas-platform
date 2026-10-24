'use client';

import Link from 'next/link';
import {useState} from 'react';
import {Button} from "@/components/shared";
import {customerUrl} from "@/features/marketing/content/site-content";

const links = [
    ['/services', 'Dịch vụ'], ['/solutions', 'Giải pháp'], ['/how-it-works', 'Quy trình thực hiện'], ['/about', 'Giới thiệu'], ['/contact', 'Liên hệ'],
];

export function PublicHeader() {
    const [open, setOpen] = useState(false);

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
            <div className="mx-auto flex min-h-[72px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 relative">
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
                    className="menu-button lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-slate-100 cursor-pointer"
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
                            ? 'flex flex-col absolute left-4 right-4 top-full mt-2 rounded-2xl border border-border bg-card p-4 shadow-xl gap-2 z-40'
                            : 'hidden'
                    } lg:static lg:mt-0 lg:flex lg:flex-row lg:items-center lg:gap-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}
                    aria-label="Điều hướng chính"
                >
                    {links.map(([href, label]) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex min-h-11 lg:min-h-0 items-center text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
                        >
                            {label}
                        </Link>
                    ))}
                    <a
                        className="nav-login flex min-h-11 lg:min-h-0 items-center text-sm font-bold text-slate-800 hover:text-primary transition-colors"
                        href={`${customerUrl}/login?lang=vi`}
                    >
                        Đăng nhập
                    </a>
                    <a
                        className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs"
                        href={`${customerUrl}/register?lang=vi`}
                    >
                        Bắt đầu
                    </a>
                </nav>
            </div>
        </header>
    );
}
