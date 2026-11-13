'use client';

import '@/styles/globals.css';
import {I18nProvider} from '@/providers/I18nContext';
import {PortalErrorView} from '@/components/shared/PortalErrorView';

/** Last-resort boundary when the root layout itself fails on the Customer / Public site. */
export default function GlobalErrorPage({error, reset}: {
    error?: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    return (
        <html lang="vi">
            <body className="min-h-screen bg-background font-sans text-sm leading-relaxed text-foreground antialiased">
                <I18nProvider area="customer">
                    <PortalErrorView error={error} reset={reset} area="public" homeHref="/"/>
                </I18nProvider>
            </body>
        </html>
    );
}
