'use client';

import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Errors in the admin frame itself (layout, providers); page errors are caught inside the shell by (portal)/error.tsx. */
export default function AdminErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return <PortalErrorView error={error} reset={reset} area="admin" homeHref="/admin/dashboard"/>;
}
