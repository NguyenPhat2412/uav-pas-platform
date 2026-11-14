'use client';

import {I18nProvider} from '@/providers/I18nContext';
import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Catches any root-level exception outside route groups on the Operations portal. */
export default function OperationsRootErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return (
        <I18nProvider area="operations">
            <PortalErrorView error={error} reset={reset} area="operations" homeHref="/operations/overview"/>
        </I18nProvider>
    );
}
