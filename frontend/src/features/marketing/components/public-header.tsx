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
        <header className="site-header" onKeyDown={(event) => {
            if (event.key === 'Escape' && open) {
                setOpen(false);
                event.currentTarget.querySelector<HTMLButtonElement>('.menu-button')?.focus();
            }
        }}>
            <div className="shell nav-wrap">
                <Link className="brand" href="/" aria-label="UAV PAS - Đại học Việt Nhật"
                      style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <img src="/vju-logo.svg" alt="" width={32} height={32}
                         style={{width: 32, height: 32, objectFit: 'contain'}}/>
                    <span>UAV PAS</span>
                </Link>
                <Button className="menu-button" type="button" aria-expanded={open} aria-controls="public-nav"
                        onClick={() => setOpen(!open)}><span
                    className="sr-only">{open ? 'Đóng trình đơn' : 'Mở trình đơn'}</span><span
                    aria-hidden="true">☰</span></Button>
                <nav id="public-nav" className={open ? 'public-nav is-open' : 'public-nav'}
                     aria-label="Điều hướng chính">
                    {links.map(([href, label]) => <Link key={href} href={href}
                                                        onClick={() => setOpen(false)}>{label}</Link>)}
                    <a className="nav-login" href={`${customerUrl}/login?lang=vi`}>Đăng nhập</a>
                    <a className="button button-small" href={`${customerUrl}/register?lang=vi`}>Bắt đầu</a>
                </nav>
            </div>
        </header>
    );
}
