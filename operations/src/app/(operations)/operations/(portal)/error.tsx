'use client';

import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** A crashed operations page: the sidebar and header stay, only the page area shows the error. */
export default function OperationsPageError({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return <PortalErrorView error={error} reset={reset} area="operations" homeHref="/operations/overview" inShell/>;
}
