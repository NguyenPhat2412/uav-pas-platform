'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Spinner} from '@/components/ui';
import {AppShell} from '@/components/layout/AppShell';
import {PermissionGate} from '@/components/data/WorkspaceState';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';

/** Operations route wrapper: auth redirect, shell and permission gate. Pages carry no title block; the breadcrumb names them. */
export function OperationsPage({permission, activeResource, children}: {
    permission: string | null;
    activeResource: string;
    children: React.ReactNode
}) {
    const {isAuthenticated, isLoading} = useAuth();
    const {t} = useI18n();
    const router = useRouter();
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace("/operations/login");
    }, [isAuthenticated, isLoading, router]);

    if (isLoading || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center"><Spinner
        size="lg" label={t('opsShared.state.authenticating')}/></div>;
    return <AppShell activeResource={activeResource}>{permission ?
        <PermissionGate code={permission}>{children}</PermissionGate> : children}</AppShell>;
}
