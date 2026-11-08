'use client';

import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** A crashed public page (marketing site). */
export default function PublicErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return <PortalErrorView error={error} reset={reset} area="public" homeHref="/"/>;
}
