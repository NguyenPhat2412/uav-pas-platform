'use client';

import '@/styles/globals.css';
import {I18nProvider} from '@/providers/I18nContext';
import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Last-resort boundary when the root layout itself fails on the Operations portal. */
export default function OperationsGlobalErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return (
        <html lang="vi">
            <body className="min-h-screen bg-background font-sans text-sm leading-relaxed text-foreground antialiased">
                <I18nProvider area="operations">
                    <PortalErrorView error={error} reset={reset} area="operations" homeHref="/operations/overview"/>
                </I18nProvider>
            </body>
        </html>
    );
}
