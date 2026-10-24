'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Spinner} from "@/components/admin/ui";
import {AppShell} from "@/components/admin/layout/AppShell";
import {PageHeader} from '@/components/layout/PageHeader';
import {PermissionGate} from "@/components/admin/data/WorkspaceState";
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/features/auth/portal';

// title and meta may be catalog keys; plain text passes through t() unchanged.
export function AdminPage({title, meta, permission, activeResource, children}: {
    title: string;
    meta?: string;
    permission: string;
    activeResource: string;
    children: React.ReactNode
}) {
    const {user, isAuthenticated, isLoading} = useAuth();
    const {t} = useI18n();
    const router = useRouter();
    const isAdmin = canUsePortal(user?.role, 'admin');
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) router.replace("/admin/login");
        else if (!isAdmin) router.replace(portalHome(portalForRole(user?.role)));
    }, [isAuthenticated, isAdmin, isLoading, router, user?.role]);
    if (isLoading || !isAuthenticated || !isAdmin) return <div className="flex min-h-screen items-center justify-center"><Spinner
        size="lg" label={t('admin.page.authenticating')}/></div>;
    return <AppShell activeResource={activeResource}><PageHeader title={t(title)} meta={meta ? t(meta) : meta}/><PermissionGate
        code={permission}>{children}</PermissionGate></AppShell>;
}
