'use client';

import {createContext, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Button, UavLoader} from "@/components/ui";
import {AppShell} from "@/components/layout/AdminAppShell";
import {PermissionGate} from "@/components/data/WorkspaceState";
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {canUsePortal, portalForRole, portalHome} from '@/utils/auth/portal';
import {loginEntryForPage, navigatePortalPath} from '@/utils/auth/auth-entry';

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
    const {user, isAuthenticated, isLoading, isUnreachable, retryAuth} = useAuth();
    const {t} = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const [meta, setMeta] = useState<AdminPageMeta>({});
    const isAdmin = canUsePortal(user?.role, 'admin');
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) {
            if (!isUnreachable) router.replace(loginEntryForPage(pathname, '/admin/dashboard'));
        } else if (!isAdmin) {
            navigatePortalPath(portalHome(portalForRole(user?.role)), href => router.replace(href));
        }
    }, [isAuthenticated, isAdmin, isLoading, isUnreachable, pathname, router, user?.role]);
    if (!isLoading && !isAuthenticated && isUnreachable) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6" role="alert">
                <div className="w-full max-w-lg space-y-4 rounded-panel border border-slate-200 border-t-4 border-t-primary bg-white p-8 text-center">
                    <h1 className="m-0 text-xl font-extrabold text-slate-900">{t('errorPage.serverTitle')}</h1>
                    <p className="m-0 text-sm leading-6 text-slate-600">{t('errorPage.serverDetail')}</p>
                    <div className="flex justify-center pt-1">
                        <Button type="button" onClick={() => retryAuth?.()}>{t('errorPage.retry')}</Button>
                    </div>
                </div>
            </main>
        );
    }
    if (isLoading || !isAuthenticated || !isAdmin) return <UavLoader fullScreen label={t('admin.page.authenticating')}/>;
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
