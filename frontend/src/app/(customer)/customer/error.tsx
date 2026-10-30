'use client';

import Link from 'next/link';
import {Button, Panel} from "@/components/customer/CustomerUi";
import {useI18n} from '@/providers/I18nContext';

export default function CustomerErrorPage({
                                              error,
                                              reset,
                                          }: {
    error: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    const {t} = useI18n();
    return (
        <main className="mx-auto my-16 max-w-xl px-5">
            <Panel
                title={t('opsShared.routes.customer.errorTitle')}
                action={
                    <span className="rounded-panel border border-red-200 bg-uav-red-light px-2.5 py-1 text-[11px] font-bold text-primary">
                        {error?.code || (error?.status ? `HTTP_${error.status}` : 'CLIENT_EXCEPTION')}
                    </span>
                }
            >
                <p className="text-sm leading-relaxed text-slate-600">
                    {error?.message || t('opsShared.routes.customer.errorDetail')}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button type="button" onClick={reset}>
                        {t('opsShared.routes.customer.retry')}
                    </Button>
                    <Link href="/customer/dashboard" className="text-sm font-bold text-primary hover:underline">
                        {t('opsShared.routes.customer.backOverview')}
                    </Link>
                </div>
            </Panel>
        </main>
    );
}
