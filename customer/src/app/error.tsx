'use client';

import {I18nProvider} from '@/providers/I18nContext';
import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Catches any root-level exception outside route groups on the Customer / Public site. */
export default function RootErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return (
        <I18nProvider area="customer">
            <PortalErrorView error={error} reset={reset} area="public" homeHref="/"/>
        </I18nProvider>
    );
}
