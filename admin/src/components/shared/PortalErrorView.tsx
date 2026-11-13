'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {
    AlertTriangle,
    Clock,
    FileQuestion,
    Home,
    Lock,
    LogIn,
    RefreshCw,
    RotateCcw,
    ServerOff,
    ShieldAlert,
    WifiOff,
    Wrench,
} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {
    classifyRuntimeException,
    errorReference,
    type ExceptionKind,
    shouldAutoReload,
} from '@/utils/errors/runtime-error';
import {authEntryUrl, resolvePortalHref} from '@/utils/auth/auth-entry';
import {readBrowserStorage} from '@/hooks/useBrowserStorage';

const CHUNK_RELOAD_KEY = 'uav_chunk_reload_at';
const showTechnicalDetails = process.env.NODE_ENV !== 'production';

export type PortalArea = 'admin' | 'operations' | 'customer' | 'public';

function metaForKind(kind: ExceptionKind) {
    switch (kind) {
        case 'stale_build':
            return {icon: RefreshCw, titleKey: 'errorPage.staleTitle', detailKey: 'errorPage.staleDetail'};
        case 'offline':
            return {icon: WifiOff, titleKey: 'errorPage.offlineTitle', detailKey: 'errorPage.offlineDetail'};
        case 'server_unreachable':
            return {icon: ServerOff, titleKey: 'errorPage.serverTitle', detailKey: 'errorPage.serverDetail'};
        case 'maintenance':
            return {icon: Wrench, titleKey: 'errorPage.maintenanceTitle', detailKey: 'errorPage.maintenanceDetail'};
        case 'rate_limited':
            return {icon: Clock, titleKey: 'errorPage.rateLimitedTitle', detailKey: 'errorPage.rateLimitedDetail'};
        case 'forbidden':
            return {icon: ShieldAlert, titleKey: 'errorPage.forbiddenTitle', detailKey: 'errorPage.forbiddenDetail'};
        case 'not_found':
            return {icon: FileQuestion, titleKey: 'errorPage.notFoundTitle', detailKey: 'errorPage.notFoundDetail'};
        case 'unauthorized':
            return {icon: Lock, titleKey: 'errorPage.unauthorizedTitle', detailKey: 'errorPage.unauthorizedDetail'};
        default:
            return {icon: AlertTriangle, titleKey: 'errorPage.title', detailKey: 'errorPage.detail'};
    }
}

/**
 * Shared portal exception screen across Customer, Operations, Admin and Public areas.
 * Classifies chunk updates, offline/server outages, maintenance (502/503/504), rate-limits (429),
 * access restrictions (401/403/404), and runtime exceptions with a stable 6-char support reference.
 */
export function PortalErrorView({error, reset, area, homeHref, inShell = false}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
    area: PortalArea;
    homeHref: string;
    inShell?: boolean;
}) {
    const {t} = useI18n();
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const kind = classifyRuntimeException(error, online);
    const staleBuild = kind === 'stale_build';
    const reference = errorReference(error);
    const [reloading, setReloading] = useState(false);
    const resolvedHome = resolvePortalHref(homeHref);
    const {icon: StatusIcon, titleKey, detailKey} = metaForKind(kind);

    useEffect(() => {
        console.error(`[UAV-PAS] ${area} page error ${reference} (${kind}) at ${window.location.pathname}`, error);
        if (!staleBuild) return;
        const last = Number(readBrowserStorage(CHUNK_RELOAD_KEY) ?? sessionStorageValue()) || null;
        if (!shouldAutoReload(last, Date.now())) return;
        try {
            window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
        } catch { /* without storage the window below still reloads once per page load */
        }
        window.location.reload();
    }, [area, error, kind, reference, staleBuild]);

    const reloadPage = () => {
        setReloading(true);
        window.location.reload();
    };

    const showRetry = !staleBuild && kind !== 'forbidden' && kind !== 'unauthorized';

    return (
        <main className={cn('flex items-center justify-center p-6', inShell ? 'min-h-[60vh]' : 'min-h-[80vh] bg-slate-50')} role="alert">
            <div className="w-full max-w-xl space-y-4 rounded-panel border border-slate-200 border-t-4 border-t-primary bg-white px-5 py-8 text-center sm:p-8">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-uav-red-light text-primary">
                    <StatusIcon size={24} aria-hidden="true"/>
                </span>
                <h1 className={cn('m-0 font-extrabold text-slate-900', kind === 'not_found' ? 'whitespace-nowrap text-[clamp(0.95rem,4vw,1.25rem)]' : 'text-xl')}>
                    {t(titleKey)}
                </h1>
                <p className="m-0 text-sm leading-6 text-slate-600">
                    {t(detailKey)}
                </p>
                <p className="m-0 text-xs text-slate-500">
                    {t('errorPage.reference')}{' '}
                    <code className="rounded-badge bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-800">{reference}</code>
                    {typeof error?.status === 'number' && error.status > 0 && <> · <code className="font-mono">HTTP {error.status}</code></>}
                    {error?.code && <> · <code className="font-mono">{error.code}</code></>}
                </p>
                {showTechnicalDetails && error?.message && (
                    <details className="rounded-control border border-slate-200 bg-slate-50 p-3 text-left text-xs text-slate-700">
                        <summary className="cursor-pointer font-semibold">{t('errorPage.technical')}</summary>
                        <p className="m-0 mt-2 font-mono break-words">{error.message}</p>
                        {error.stack && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-slate-500">{error.stack.split('\n').slice(0, 8).join('\n')}</pre>}
                    </details>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {kind === 'unauthorized' && (
                        <Link href={authEntryUrl('login', homeHref)}
                              className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover">
                            <LogIn size={14} aria-hidden="true"/>{t('errorPage.signIn')}
                        </Link>
                    )}
                    {showRetry && (
                        <button type="button" onClick={reset}
                                className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover">
                            <RotateCcw size={14} aria-hidden="true"/>{t('errorPage.retry')}
                        </button>
                    )}
                    <button type="button" onClick={reloadPage} disabled={reloading}
                            className="inline-flex items-center gap-1.5 rounded-control border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                        <RefreshCw size={14} aria-hidden="true" className={cn(reloading && 'animate-spin')}/>{t('errorPage.reload')}
                    </button>
                    <Link href={resolvedHome}
                          className="inline-flex items-center gap-1.5 rounded-control border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-200">
                        <Home size={14} aria-hidden="true"/>{t('errorPage.home')}
                    </Link>
                </div>
            </div>
        </main>
    );
}

function sessionStorageValue(): string | null {
    try {
        return window.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    } catch {
        return null;
    }
}
