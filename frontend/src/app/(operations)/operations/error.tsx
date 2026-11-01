'use client';

import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Errors in the operations frame itself; page errors are caught inside the shell by (portal)/error.tsx. */
export default function OperationsErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return <PortalErrorView error={error} reset={reset} area="operations" homeHref="/operations/overview"/>;
}
