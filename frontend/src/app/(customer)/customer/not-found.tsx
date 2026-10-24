'use client';

import Link from 'next/link';
import {useI18n} from '@/contexts/I18nContext';
import {Panel} from "@/components/customer/ui";

export default function CustomerNotFoundPage() {
    const {t} = useI18n();
    return (
        <main style={{maxWidth: 580, margin: '64px auto', padding: '0 20px'}}>
            <Panel title={t('opsShared.routes.customer.notFoundTitle')}>
                <p className="muted" style={{marginTop: 0, lineHeight: 1.6}}>
                    {t('opsShared.routes.customer.notFoundDetail')}
                </p>
                <div className="form-actions" style={{marginTop: 16}}>
                    <Link href="/customer/dashboard" className="button-link">
                        {t('opsShared.routes.customer.notFoundBack')}
                    </Link>
                </div>
            </Panel>
        </main>
    );
}
