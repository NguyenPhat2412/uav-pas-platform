'use client';

import {useEffect} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Spinner} from '@/components/ui';
import {AppShell, OperationsShellHost} from '@/components/layout/AppShell';
import {PermissionGate} from '@/components/data/WorkspaceState';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/features/auth/utils/portal';
import {loginEntryForPage} from '@/features/auth/utils/auth-entry';

/**
 * Signs the visitor in (returning them to this page afterwards) and keeps roles without operations access out:
 * they are sent to their own portal home and nothing of this portal renders meanwhile.
 */
function useOperationsAccess(): boolean {
    const {user, isAuthenticated, isLoading} = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const allowed = canUsePortal(user?.role, 'operations');
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) router.replace(loginEntryForPage(pathname, '/operations/overview'));
        else if (!allowed) router.replace(portalHome(portalForRole(user?.role)));
    }, [allowed, isAuthenticated, isLoading, pathname, router, user?.role]);
    return !isLoading && isAuthenticated && allowed;
}

/** The portal layout's frame: signs the user in once and keeps one shell mounted across pages. */
export function OperationsPortalFrame({children}: { children: React.ReactNode }) {
    const allowed = useOperationsAccess();
    const {t} = useI18n();
    if (!allowed) return <div className="flex min-h-screen items-center justify-center"><Spinner
        size="lg" label={t('opsShared.state.authenticating')}/></div>;
    return <OperationsShellHost>{children}</OperationsShellHost>;
}

/** Operations route wrapper: auth redirect, shell and permission gate. Pages carry no title block; the breadcrumb names them. */
export function OperationsPage({permission, activeResource, children}: {
    permission: string | null;
    activeResource: string;
    children: React.ReactNode
}) {
    const allowed = useOperationsAccess();
    const {t} = useI18n();
    if (!allowed) return <div className="flex min-h-screen items-center justify-center"><Spinner
        size="lg" label={t('opsShared.state.authenticating')}/></div>;
    return <AppShell activeResource={activeResource}>{permission ?
        <PermissionGate code={permission}>{children}</PermissionGate> : children}</AppShell>;
}
