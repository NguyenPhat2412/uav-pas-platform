'use client';

import {useQuery} from '@tanstack/react-query';
import {Receipt} from 'lucide-react';
import {Metadata} from '@/components/data/Drawer';
import {QueryState} from '@/components/data/WorkspaceState';
import {useI18n} from '@/contexts/I18nContext';
import {commerceAdminApi} from '@/features/billing/admin-api';

/** Read-only invoicing details a customer saved in their profile; editing stays with the customer. */
export function CustomerBillingProfileCard({userId}: { userId: number }) {
    const {t, formatDate} = useI18n();
    const query = useQuery({
        queryKey: ['admin', 'users', userId, 'billing-profile'],
        queryFn: ({signal}) => commerceAdminApi.userBillingProfile(userId, signal),
    });
    const p = query.data;
    return <section className="min-w-0 space-y-3 rounded-panel border border-border bg-card p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-semibold"><Receipt size={16} aria-hidden="true" className="text-primary"/>
                {t('adminCommerce.profile.title')}</h2>
            <span className="text-xs text-slate-500">{t('adminCommerce.profile.readOnly')}</span>
        </header>
        <QueryState query={query}>{p && (p.version === 0
            ? <p className="text-[13px] text-slate-500">{t('adminCommerce.profile.empty')}</p>
            : <>
                <Metadata items={[
                    [t('adminCommerce.profile.organizationName'), p.organizationName],
                    [t('adminCommerce.profile.taxCode'), p.taxCode ? <span key="tax" className="font-mono">{p.taxCode}</span> : null],
                    [t('adminCommerce.profile.billingAddress'), p.billingAddress],
                    [t('adminCommerce.profile.emergencyContactName'), p.emergencyContactName],
                    [t('adminCommerce.profile.emergencyContactPhone'), p.emergencyContactPhone],
                ]}/>
                {p.updatedAt && <p className="text-xs text-slate-500">{t('adminCommerce.profile.updatedAt', {date: formatDate(p.updatedAt)})}</p>}
            </>)}</QueryState>
    </section>;
}
