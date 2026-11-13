'use client';

import {useEffect} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Button, UavLoader} from '@/components/ui';
import {AppShell, OperationsShellHost} from '@/components/layout/AppShell';
import {PermissionGate} from '@/components/data/WorkspaceState';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/utils/auth/portal';
import {loginEntryForPage, navigatePortalPath} from '@/utils/auth/auth-entry';

/**
 * Signs the visitor in (returning them to this page afterwards), preserves the route when the backend is temporarily
 * unreachable, and keeps roles without operations access out by sending them to their own portal home.
 */
function useOperationsAccess(): { allowed: boolean; unreachable: boolean; retryAuth?: () => void } {
    const {user, isAuthenticated, isLoading, isUnreachable, retryAuth} = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const allowed = canUsePortal(user?.role, 'operations');
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            if (!isUnreachable) router.replace(loginEntryForPage(pathname, '/operations/overview'));
        } else if (!allowed) {
            navigatePortalPath(portalHome(portalForRole(user?.role)), href => router.replace(href));
        }
    }, [allowed, isAuthenticated, isLoading, isUnreachable, pathname, router, user?.role]);
    return {
        allowed: !isLoading && isAuthenticated && allowed,
        unreachable: !isLoading && !isAuthenticated && !!isUnreachable,
        retryAuth,
    };
}

function OperationsUnreachableFallback({onRetry}: { onRetry?: () => void }) {
    const {t} = useI18n();
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6" role="alert">
            <div className="w-full max-w-lg space-y-4 rounded-panel border border-slate-200 border-t-4 border-t-primary bg-white p-8 text-center">
                <h1 className="m-0 text-xl font-extrabold text-slate-900">{t('errorPage.serverTitle')}</h1>
                <p className="m-0 text-sm leading-6 text-slate-600">{t('errorPage.serverDetail')}</p>
                <div className="flex justify-center pt-1">
                    <Button type="button" onClick={() => onRetry?.()}>{t('errorPage.retry')}</Button>
                </div>
            </div>
        </main>
    );
}

/** The portal layout's frame: signs the user in once and keeps one shell mounted across pages. */
export function OperationsPortalFrame({children}: { children: React.ReactNode }) {
    const {allowed, unreachable, retryAuth} = useOperationsAccess();
    const {t} = useI18n();
    if (unreachable) return <OperationsUnreachableFallback onRetry={retryAuth}/>;
    if (!allowed) return <UavLoader fullScreen label={t('opsShared.state.authenticating')}/>;
    return <OperationsShellHost>{children}</OperationsShellHost>;
}

/** Operations route wrapper: auth redirect, shell and permission gate. Pages carry no title block; the breadcrumb names them. */
export function OperationsPage({permission, activeResource, children}: {
    permission: string | null;
    activeResource: string;
    children: React.ReactNode
}) {
    const {allowed, unreachable, retryAuth} = useOperationsAccess();
    const {t} = useI18n();
    if (unreachable) return <OperationsUnreachableFallback onRetry={retryAuth}/>;
    if (!allowed) return <UavLoader fullScreen label={t('opsShared.state.authenticating')}/>;
    return <AppShell activeResource={activeResource}>{permission ?
        <PermissionGate code={permission}>{children}</PermissionGate> : children}</AppShell>;
}
