'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {AlertTriangle, Home, RefreshCw, RotateCcw} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import {errorReference, isChunkLoadError, shouldAutoReload} from '@/utils/errors/runtime-error';
import {readBrowserStorage} from '@/hooks/useBrowserStorage';

const CHUNK_RELOAD_KEY = 'uav_chunk_reload_at';
const showTechnicalDetails = process.env.NODE_ENV !== 'production';

export type PortalArea = 'admin' | 'operations' | 'customer' | 'public';

/**
 * What a crashed page shows, in every portal. Users get a plain explanation, a short reference to quote to support,
 * and retry / reload / home; the technical message and stack appear only in development builds. A chunk that no
 * longer exists after a deployment triggers one automatic reload (guarded against loops) instead of an error.
 * `inShell` renders inside the portal frame (sidebar and header stay); without it the screen stands alone.
 */
export function PortalErrorView({error, reset, area, homeHref, inShell = false}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
    area: PortalArea;
    homeHref: string;
    inShell?: boolean;
}) {
    const {t} = useI18n();
    const reference = errorReference(error);
    const staleBuild = isChunkLoadError(error);
    const [reloading, setReloading] = useState(false);

    useEffect(() => {
        // One log line with everything support needs to match a user's report to this failure.
        console.error(`[UAV-PAS] ${area} page error ${reference} at ${window.location.pathname}`, error);
        if (!staleBuild) return;
        const last = Number(readBrowserStorage(CHUNK_RELOAD_KEY) ?? sessionStorageValue()) || null;
        if (!shouldAutoReload(last, Date.now())) return;
        try {
            window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
        } catch { /* without storage the window below still reloads once per page load */
        }
        window.location.reload();
    }, [area, error, reference, staleBuild]);

    const reloadPage = () => {
        setReloading(true);
        window.location.reload();
    };

    return (
        <main className={cn('flex items-center justify-center p-6', inShell ? 'min-h-[60vh]' : 'min-h-[80vh] bg-slate-50')} role="alert">
            <div className="w-full max-w-lg space-y-4 rounded-panel border border-slate-200 border-t-4 border-t-primary bg-white p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-uav-red-light text-primary">
                    <AlertTriangle size={24} aria-hidden="true"/>
                </span>
                <h1 className="m-0 text-xl font-extrabold text-slate-900">
                    {t(staleBuild ? 'errorPage.staleTitle' : 'errorPage.title')}
                </h1>
                <p className="m-0 text-sm leading-6 text-slate-600">
                    {t(staleBuild ? 'errorPage.staleDetail' : 'errorPage.detail')}
                </p>
                <p className="m-0 text-xs text-slate-500">
                    {t('errorPage.reference')}{' '}
                    <code className="rounded-badge bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-800">{reference}</code>
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
                    {!staleBuild && (
                        <button type="button" onClick={reset}
                                className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-hover">
                            <RotateCcw size={14} aria-hidden="true"/>{t('errorPage.retry')}
                        </button>
                    )}
                    <button type="button" onClick={reloadPage} disabled={reloading}
                            className="inline-flex items-center gap-1.5 rounded-control border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                        <RefreshCw size={14} aria-hidden="true" className={cn(reloading && 'animate-spin')}/>{t('errorPage.reload')}
                    </button>
                    <Link href={homeHref}
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
