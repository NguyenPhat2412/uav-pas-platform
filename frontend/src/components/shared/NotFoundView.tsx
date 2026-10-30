'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';

export type NotFoundLink = { href: string; label: string };
/** Sends a portal URL home to that portal: the first entry whose prefix matches the path wins. */
export type NotFoundHome = { prefix: string; href: string; label: string };

/**
 * The 404 screen shared by the public site and the three portals: a drone that lost its route,
 * the code, a short explanation, a way home, a way back and a few useful destinations. Text comes
 * in as props because the root not-found renders outside the i18n provider.
 */
export function NotFoundView({title, detail, homeHref, homeLabel, backLabel, links = [], linksLabel, fullScreen = false, portalHomes = []}: {
    title: string;
    detail: string;
    homeHref: string;
    homeLabel: string;
    backLabel: string;
    links?: NotFoundLink[];
    linksLabel?: string;
    /** The root 404 has no site header, so it fills the screen and shows the logo itself. */
    fullScreen?: boolean;
    portalHomes?: NotFoundHome[];
}) {
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const portal = portalHomes.find(home => pathname.startsWith(home.prefix));
    const home = portal ? {href: portal.href, label: portal.label} : {href: homeHref, label: homeLabel};
    // Inside a portal the public suggestions would be off-topic.
    const shownLinks = portal ? [] : links;
    const goBack = () => {
        if (window.history.length > 1) router.back();
        else router.push(home.href);
    };
    return (
        <main className={fullScreen
            ? 'flex min-h-screen flex-col bg-white px-4 py-8 text-slate-900'
            : 'flex min-h-[70vh] flex-col bg-white px-4 py-12 text-slate-900'}>
            {fullScreen && (
                <Link href="/" className="mx-auto mb-auto inline-flex items-center gap-2.5 text-sm font-semibold text-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/vju-logo.svg" alt="" width={32} height={32} className="h-8 w-8"/>
                    <span>UAV<span className="text-primary">PAS</span></span>
                </Link>
            )}
            <div className="m-auto flex w-full max-w-xl flex-col items-center text-center">
                <LostDrone/>
                <p className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"/>
                    Lỗi 404
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 text-balance">{detail}</p>
                <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                    <Link href={home.href}
                          className="inline-flex h-10 items-center justify-center rounded-control bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
                        {home.label}
                    </Link>
                    <button type="button" onClick={goBack}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                        <ArrowLeft size={15} aria-hidden="true"/>{backLabel}
                    </button>
                </div>
                {shownLinks.length > 0 && (
                    <nav aria-label={linksLabel} className="mt-10 w-full border-t border-slate-200 pt-6">
                        {linksLabel && <p className="mb-3 text-xs font-medium text-slate-500">{linksLabel}</p>}
                        <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
                            {shownLinks.map(link => (
                                <li key={link.href}>
                                    <Link href={link.href}
                                          className="inline-flex h-8 items-center rounded-control border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-700 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}
            </div>
            {fullScreen && <p className="mx-auto mt-auto pt-8 text-xs text-slate-400">Trường Đại học Việt Nhật · ĐHQGHN</p>}
        </main>
    );
}

/** A quadcopter beside a dashed route that breaks off at a "?" waypoint. Decorative only. */
function LostDrone() {
    return (
        <svg viewBox="0 0 280 150" className="h-auto w-56 sm:w-64" role="presentation" aria-hidden="true">
            <path d="M14 122 C 60 122, 70 70, 120 72" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"/>
            <path d="M188 66 C 216 60, 238 78, 250 104" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round"/>
            <circle cx="14" cy="122" r="5" fill="#fff" stroke="#94a3b8" strokeWidth="2"/>
            <g>
                <circle cx="254" cy="112" r="15" fill="#fff" stroke="#c43a4a" strokeWidth="2" strokeDasharray="4 4"/>
                <text x="254" y="118" textAnchor="middle" fontSize="16" fontWeight="600" fill="#c43a4a" fontFamily="inherit">?</text>
            </g>
            <g className="motion-safe:animate-[nf-hover_3.2s_ease-in-out_infinite]" style={{transformBox: 'fill-box', transformOrigin: 'center'}}>
                <line x1="128" y1="56" x2="180" y2="56" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
                <line x1="128" y1="56" x2="122" y2="48" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
                <line x1="180" y1="56" x2="186" y2="48" stroke="#334155" strokeWidth="3" strokeLinecap="round"/>
                <ellipse cx="122" cy="46" rx="16" ry="3" fill="#cbd5e1"/>
                <ellipse cx="186" cy="46" rx="16" ry="3" fill="#cbd5e1"/>
                <rect x="140" y="52" width="28" height="18" rx="6" fill="#1f1f1f"/>
                <circle cx="154" cy="61" r="4" fill="#fff"/>
                <circle cx="154" cy="61" r="1.8" fill="#c43a4a"/>
                <line x1="146" y1="70" x2="142" y2="80" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="162" y1="70" x2="166" y2="80" stroke="#334155" strokeWidth="2.5" strokeLinecap="round"/>
            </g>
            <style>{'@keyframes nf-hover{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}'}</style>
        </svg>
    );
}
