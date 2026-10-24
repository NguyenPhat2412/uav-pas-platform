'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {Spinner} from "@/components/ui";
import {AppShell} from "@/components/layout/AdminAppShell";
import {PermissionGate} from "@/components/data/WorkspaceState";
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/features/auth/utils/portal';

// title may be a catalog key; plain text passes through t() unchanged. It only names the page in the breadcrumb.
export function AdminPage({title, permission, activeResource, children}: {
    title: string;
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
    return <AppShell activeResource={activeResource} pageTitle={t(title)}><PermissionGate
        code={permission}>{children}</PermissionGate></AppShell>;
}
