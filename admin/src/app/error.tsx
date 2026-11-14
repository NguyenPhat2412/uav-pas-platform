'use client';

import {I18nProvider} from '@/providers/I18nContext';
import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Catches any root-level exception outside route groups on the Admin portal. */
export default function AdminRootErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return (
        <I18nProvider area="admin">
            <PortalErrorView error={error} reset={reset} area="admin" homeHref="/admin/dashboard"/>
        </I18nProvider>
    );
}
