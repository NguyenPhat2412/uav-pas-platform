'use client';
import {displayLabel, permissionLabel} from "@/components/shared/presentation";
import {Search} from 'lucide-react';
import {useState} from 'react';
import {useAdminReferenceData} from "@/lib/query/admin";
import {EmptyState, QueryState} from "@/components/data/WorkspaceState";
import {useI18n} from '@/contexts/I18nContext';

export function Registry() {
    const {permissions} = useAdminReferenceData();
    const [filter, setFilter] = useState('');
    const {t} = useI18n();
    const rows = permissions.data?.filter(p => (p.code + ' ' + permissionLabel(p.code, p.description)).toLowerCase().includes(filter.toLowerCase()));
    return <div className="min-w-0 overflow-hidden rounded-none border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
            <label className="flex min-h-[44px] min-w-[160px] max-w-[320px] flex-1 items-center gap-2 rounded-none border border-border-input bg-card px-2.5 text-muted focus-within:outline-2 focus-within:outline-primary"><Search size={18} aria-hidden="true"/><span
                className="sr-only">{t('admin.access.registry.search')}</span><input className="min-h-[42px] w-full min-w-0 bg-transparent text-sm text-foreground outline-none" placeholder={t('admin.access.registry.placeholder')} value={filter}
                                                           onChange={e => setFilter(e.target.value)}/></label>
            {permissions.data && <span className="ml-auto text-[13px] text-muted" role="status">{t('admin.access.registry.count', {count: rows?.length ?? 0})}</span>}
        </div>
        <QueryState query={permissions}>{rows?.length ?
            <div className="max-h-[640px] overflow-auto" tabIndex={0} aria-label={t('admin.access.registry.table')}>
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                    <thead>
                    <tr>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.registry.colAccess')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.registry.colGroup')}</th>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.registry.colSupport')}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">{rows.map(p => <tr key={p.code} className="transition-colors hover:bg-background">
                        <td data-label={t('admin.access.registry.labelPermission')} className="px-4 py-3.5 align-middle text-foreground"><strong
                            className="font-semibold text-foreground">{permissionLabel(p.code, p.description)}</strong><span
                            className="mt-0.5 block text-xs text-muted">{p.code}</span></td>
                        <td data-label={t('admin.access.registry.labelGroup')} className="px-4 py-3.5 align-middle text-foreground">{displayLabel(p.code.split('_')[0])}</td>
                        <td data-label={t('admin.access.registry.colSupport')} className="px-4 py-3.5 align-middle text-foreground">{t('admin.access.registry.supported')}</td>
                    </tr>)}</tbody>
                </table>
            </div> : <EmptyState title={t('admin.access.registry.emptyTitle')}
                                 detail={t('admin.access.registry.emptyDetail')}/>}</QueryState>
    </div>;
}
