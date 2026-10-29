'use client';

import {ShieldCheck} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {displayLabel, permissionLabel, planName} from '@/components/shared/presentation';
import {useBilling} from '@/lib/query/customer';

/** Current plan and the permissions the signed-in account actually holds. */
export function EnterpriseAccessCard() {
    const {t} = useI18n();
    const {user, permissions} = useAuth();
    const {quota} = useBilling();
    return <section className="flex h-full flex-col bg-card" aria-labelledby="access-title">
        <header className="border-b border-slate-200 bg-slate-50/70 px-4 py-3">
            <h2 id="access-title" className="m-0 flex items-center gap-2 text-sm font-bold text-slate-800">
                <ShieldCheck size={17} className="text-primary" aria-hidden="true"/>{t('enterprise.accessTitle')}</h2>
        </header>
        <div className="grid flex-1 gap-5 p-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] sm:p-5">
            <dl className="m-0 grid gap-3 text-sm">
                <div><dt className="text-[13px] text-slate-500">{t('enterprise.role')}</dt><dd className="m-0 font-semibold">{displayLabel(user?.role)}</dd></div>
                <div><dt className="text-[13px] text-slate-500">{t('enterprise.plan')}</dt>
                    <dd className="m-0 font-semibold">{quota.data?.planName ? planName(quota.data.planName) : '—'}</dd></div>
                <div><dt className="text-[13px] text-slate-500">{t('enterprise.hours')}</dt>
                    <dd className="m-0 font-semibold tabular-nums">{quota.data ? `${quota.data.flightHoursUsed} / ${quota.data.flightHoursLimit} h` : '—'}</dd></div>
            </dl>
            <div>
                <h3 className="mb-2 mt-0 text-[13px] font-semibold text-slate-500">{t('enterprise.permissions', {count: permissions.length})}</h3>
                <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                    {permissions.map(code => <li key={code} className="border border-border bg-slate-50 px-2 py-1 text-xs text-slate-700" title={code}>{permissionLabel(code)}</li>)}
                </ul>
            </div>
        </div>
    </section>;
}
