'use client';

import Link from 'next/link';
import {Button, Panel} from "@/components/customer/ui";
import {useI18n} from '@/contexts/I18nContext';

export default function CustomerErrorPage({
                                              error,
                                              reset,
                                          }: {
    error: Error & { digest?: string; code?: string; status?: number };
    reset: () => void;
}) {
    const {t} = useI18n();
    return (
        <main style={{maxWidth: 620, margin: '64px auto', padding: '0 20px'}}>
            <Panel
                title={t('opsShared.routes.customer.errorTitle')}
                action={
                    <span
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: '#fef2f2',
                            color: '#ab2523',
                            border: '1px solid #fecaca',
                        }}
                    >
            {error?.code || (error?.status ? `HTTP_${error.status}` : 'CLIENT_EXCEPTION')}
          </span>
                }
            >
                <p className="muted" style={{marginTop: 0, lineHeight: 1.6}}>
                    {error?.message || t('opsShared.routes.customer.errorDetail')}
                </p>
                <div className="form-actions" style={{marginTop: 18}}>
                    <Button type="button" onClick={reset}>
                        {t('opsShared.routes.customer.retry')}
                    </Button>
                    <Link href="/customer/dashboard" className="button-link"
                          style={{alignSelf: 'center', marginLeft: 8}}>
                        {t('opsShared.routes.customer.backOverview')}
                    </Link>
                </div>
            </Panel>
        </main>
    );
}
