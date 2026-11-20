'use client';

import {createContext, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {usePathname, useRouter} from 'next/navigation';
import {Button} from "@/components/ui";
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
 * Lightweight instant shell skeleton shown while verifying an admin session on direct navigation
 * so /admin/marketplace/* paints the workspace frame immediately instead of blocking behind a
 * full-screen 3D "Đang xác thực" wall (never renders protected page children until authorized).
 */
function AdminShellSkeleton({label}: { label: string }) {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label={label}
            className="flex min-h-dvh bg-background text-foreground"
        >
            <span className="sr-only">{label}</span>
            <aside className="hidden w-[256px] shrink-0 flex-col gap-3 border-r border-border bg-card p-3 lg:flex">
                <div className="h-9 w-36 animate-pulse rounded-control bg-slate-100"/>
                <div className="space-y-2 pt-2">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-8 w-full animate-pulse rounded-control bg-slate-100"/>
                    ))}
                </div>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex min-h-13 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
                    <div className="h-5 w-44 animate-pulse rounded-control bg-slate-100"/>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-36 animate-pulse rounded-control bg-slate-100"/>
                        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100"/>
                    </div>
                </header>
                <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4 sm:p-6">
                    <div className="h-24 animate-pulse rounded-panel border border-border bg-card"/>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className="h-24 animate-pulse rounded-panel border border-border bg-card"/>
                        ))}
                    </div>
                    <div className="h-64 animate-pulse rounded-panel border border-border bg-card"/>
                </main>
            </div>
        </div>
    );
}

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
            <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6" role="alert">
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
    if (isLoading || !isAuthenticated || !isAdmin) {
        return <AdminShellSkeleton label={t('admin.page.authenticating')}/>;
    }
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
