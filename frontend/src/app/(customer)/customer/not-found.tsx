'use client';

import Link from 'next/link';
import {useI18n} from '@/contexts/I18nContext';
import {Panel} from "@/components/customer/ui";

export default function CustomerNotFoundPage() {
    const {t} = useI18n();
    return (
        <main className="mx-auto my-16 max-w-xl px-5">
            <Panel title={t('opsShared.routes.customer.notFoundTitle')}>
                <p className="text-sm leading-relaxed text-slate-600">
                    {t('opsShared.routes.customer.notFoundDetail')}
                </p>
                <div className="mt-4">
                    <Link href="/customer/dashboard" className="text-sm font-bold text-primary hover:underline">
                        {t('opsShared.routes.customer.notFoundBack')}
                    </Link>
                </div>
            </Panel>
        </main>
    );
}
