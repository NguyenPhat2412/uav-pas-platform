'use client';

import Link from 'next/link';
import {Bot, CheckCircle2, CircleSlash, Lock, ShieldAlert, XCircle} from 'lucide-react';
import {useI18n} from '@/providers/I18nContext';
import {Alert} from '@/components/ui';
import {QueryState} from '@/components/data/WorkspaceState';
import {cn} from '@/lib/utils';
import {useSecuritySecrets} from '@/features/security/hooks/useSecurity';
import {WarningList} from '@/features/security/components/SecurityShared';
import type {SecretHealth, SecretsOverview} from '@/features/security/types/security.types';

const healthStyle: Record<SecretHealth, { text: string; icon: typeof CheckCircle2 }> = {
    OK: {text: 'text-uav-blue', icon: CheckCircle2},
    NOT_REQUIRED: {text: 'text-slate-500', icon: CircleSlash},
    TOO_SHORT: {text: 'text-amber-700', icon: ShieldAlert},
    KNOWN_DEFAULT: {text: 'text-red-700', icon: XCircle},
    MISSING: {text: 'text-red-700', icon: XCircle},
};

export function SecuritySecretsPanel() {
    const {t} = useI18n();
    const query = useSecuritySecrets();
    return <div className="space-y-4">
        <Alert variant="info" icon={<Lock size={18} className="shrink-0 text-slate-600"/>} title={t('adminSecurity.secrets.notice.title')}>
            {t('adminSecurity.secrets.notice.body')}</Alert>
        <QueryState query={query}>{query.data && <Body data={query.data}/>}</QueryState>
    </div>;
}

function Body({data}: { data: SecretsOverview }) {
    const {t, formatDate} = useI18n();
    const rotationKeys = [...new Set(data.secrets.map(s => s.rotationKey))];
    return <>
        <WarningList warnings={data.warnings} okKey="adminSecurity.secrets.allGood"/>
        <div className="overflow-x-auto border border-slate-200 bg-white">
            <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
                <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.secrets.columns.secret')}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.secrets.columns.status')}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.secrets.columns.configured')}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.secrets.columns.length')}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.secrets.columns.default')}</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">{t('adminSecurity.secrets.columns.managedIn')}</th>
                </tr>
                </thead>
                <tbody>{data.secrets.map(s => {
                    const style = healthStyle[s.status] ?? healthStyle.NOT_REQUIRED;
                    const Icon = style.icon;
                    return <tr key={s.property} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                            <strong className="block text-slate-900">{t(`adminSecurity.secrets.names.${s.property.replace(/[.-]/g, '_')}`)}</strong>
                            <code className="block text-[11.5px] text-slate-500">{s.envVar}</code>
                            <code className="block text-[11px] text-slate-400">{s.property}</code>
                            {s.note && <span className="mt-1 block text-xs text-slate-500">{t(`adminSecurity.secrets.notes.${s.note}`)}</span>}
                        </td>
                        <td className="px-4 py-3"><span className={cn('inline-flex items-center gap-1 text-xs font-semibold', style.text)}>
                            <Icon size={14} aria-hidden="true"/>{t(`adminSecurity.secrets.status.${s.status}`)}</span>
                            <span className="mt-0.5 block text-[11.5px] text-slate-500">{t(s.required ? 'adminSecurity.secrets.required' : 'adminSecurity.secrets.optional')}</span></td>
                        <td className="px-4 py-3">{t(s.configured ? 'adminSecurity.common.yes' : 'adminSecurity.common.no')}</td>
                        <td className="px-4 py-3">{s.configured
                            ? <span className={s.meetsMinimumLength ? 'text-slate-700' : 'font-semibold text-amber-700'}>
                                {t(s.meetsMinimumLength ? 'adminSecurity.secrets.lengthOk' : 'adminSecurity.secrets.lengthShort', {min: s.minimumLength})}</span>
                            : <span className="text-slate-400">—</span>}</td>
                        <td className="px-4 py-3">{s.configured
                            ? <span className={s.usesKnownDefault ? 'font-semibold text-red-700' : 'text-slate-700'}>
                                {t(s.usesKnownDefault ? 'adminSecurity.secrets.defaultYes' : 'adminSecurity.secrets.defaultNo')}</span>
                            : <span className="text-slate-400">—</span>}</td>
                        <td className="px-4 py-3"><code className="text-[12px] text-slate-700">{s.managedIn}</code></td>
                    </tr>;
                })}</tbody>
            </table>
        </div>

        <section className="flex flex-wrap items-center gap-3 border border-slate-200 bg-white px-4 py-3" aria-labelledby="ai-provider-key">
            <Bot size={18} className="text-slate-500" aria-hidden="true"/>
            <div className="min-w-0 flex-1">
                <h3 id="ai-provider-key" className="m-0 text-[14px] font-bold text-slate-900">{t('adminSecurity.secrets.aiKey.title')}</h3>
                <p className="m-0 text-[12.5px] text-slate-600">{data.aiProviderKey.configured
                    ? (data.aiProviderKey.updatedAt
                        ? t('adminSecurity.secrets.aiKey.configuredAt', {time: formatDate(data.aiProviderKey.updatedAt), name: data.aiProviderKey.updatedBy ?? '—'})
                        : t('adminSecurity.secrets.aiKey.configured'))
                    : t('adminSecurity.secrets.aiKey.missing')}</p>
            </div>
            <Link href="/admin/ai-router" className="text-[13px] font-semibold text-primary">{t('adminSecurity.secrets.aiKey.manage')}</Link>
        </section>

        <section className="border border-slate-200 bg-white" aria-labelledby="rotation-guide">
            <h3 id="rotation-guide" className="m-0 border-b border-slate-100 px-4 py-3 text-[14px] font-bold text-slate-900">{t('adminSecurity.secrets.rotation.title')}</h3>
            <p className="m-0 px-4 pt-3 text-[12.5px] text-slate-600">{t('adminSecurity.secrets.rotation.general')}</p>
            <dl className="m-0 space-y-2 px-4 py-3 text-[13px]">{rotationKeys.map(key => <div key={key}>
                <dt className="font-semibold text-slate-900">{t(`adminSecurity.secrets.rotation.items.${key}.title`)}</dt>
                <dd className="m-0 text-slate-600">{t(`adminSecurity.secrets.rotation.items.${key}.body`)}</dd>
            </div>)}</dl>
        </section>
    </>;
}
