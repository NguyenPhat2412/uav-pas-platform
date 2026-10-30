'use client';

import {createContext, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Spinner} from "@/components/ui";
import {AppShell} from "@/components/layout/AdminAppShell";
import {PermissionGate} from "@/components/data/WorkspaceState";
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/features/auth/utils/portal';
import {loginEntryForPage} from '@/features/auth/utils/auth-entry';

interface AdminPageMeta {
    activeResource?: string;
    pageTitle?: string;
}

const AdminFrameContext = createContext<((meta: AdminPageMeta) => void) | null>(null);

/**
 * The admin shell (sidebar, header, alerts, assistant) for every portal page. It lives in the portal
 * layout so it stays mounted while the user moves between pages; each page only reports its title.
 */
export function AdminPortalFrame({children, page}: { children: React.ReactNode; page?: AdminPageMeta }) {
    const {user, isAuthenticated, isLoading} = useAuth();
    const {t} = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const [meta, setMeta] = useState<AdminPageMeta>({});
    const isAdmin = canUsePortal(user?.role, 'admin');
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) router.replace(loginEntryForPage(pathname, '/admin/dashboard'));
        else if (!isAdmin) router.replace(portalHome(portalForRole(user?.role)));
    }, [isAuthenticated, isAdmin, isLoading, pathname, router, user?.role]);
    if (isLoading || !isAuthenticated || !isAdmin) return <div className="flex min-h-screen items-center justify-center"><Spinner
        size="lg" label={t('admin.page.authenticating')}/></div>;
    return <AdminFrameContext.Provider value={setMeta}>
        <AppShell activeResource={(page ?? meta).activeResource} pageTitle={(page ?? meta).pageTitle}>{children}</AppShell>
    </AdminFrameContext.Provider>;
}

// title may be a catalog key; plain text passes through t() unchanged. It only names the page in the breadcrumb.
export function AdminPage({title, permission, activeResource, children}: {
    title: string;
    permission: string;
    activeResource: string;
    children: React.ReactNode
}) {
    const {t} = useI18n();
    const setMeta = useContext(AdminFrameContext);
    const pageTitle = t(title);
    useLayoutEffect(() => {
        setMeta?.({activeResource, pageTitle});
    }, [setMeta, activeResource, pageTitle]);
    const content = <PermissionGate code={permission}>{children}</PermissionGate>;
    // Outside the portal layout (e.g. a page rendered on its own) the page still gets a full shell.
    return setMeta ? content : <AdminPortalFrame page={{activeResource, pageTitle}}>{content}</AdminPortalFrame>;
}
