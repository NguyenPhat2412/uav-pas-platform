'use client';
import {Fragment, useState} from 'react';
import {Check, Minus} from 'lucide-react';
import {displayLabel, permissionLabel} from "@/components/shared/presentation";
import {useAdminReferenceData} from "@/lib/query/admin";
import {EmptyState, QueryState} from "@/components/data/WorkspaceState";
import {useI18n} from '@/contexts/I18nContext';

/** Read-only roles × permissions grid, grouped by permission prefix, for comparing role templates side by side. */
export function RoleMatrix() {
    const {t} = useI18n();
    const {permissions, templates} = useAdminReferenceData();
    const [onlyDiff, setOnlyDiff] = useState(false);
    const [filter, setFilter] = useState('');
    const roles = templates.data ?? [];
    const granted = new Map(roles.map(r => [r.role, new Set(r.permissions)]));
    const rows = (permissions.data ?? [])
        .filter(p => (p.code + ' ' + permissionLabel(p.code, p.description)).toLowerCase().includes(filter.trim().toLowerCase()))
        .filter(p => !onlyDiff || new Set(roles.map(r => granted.get(r.role)?.has(p.code))).size > 1);
    const groups = [...new Set(rows.map(p => p.code.split('_')[0]))];
    return <QueryState query={permissions}><QueryState query={templates}>
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
                <label className="flex min-h-[44px] min-w-[160px] max-w-[320px] flex-1 items-center gap-2 rounded-[10px] border border-border-input bg-card px-2.5 text-muted focus-within:outline-2 focus-within:outline-primary"><span className="sr-only">{t('admin.access.matrix.search')}</span>
                    <input className="min-h-[42px] w-full min-w-0 bg-transparent text-sm text-foreground outline-none" placeholder={t('admin.access.matrix.search')} value={filter} onChange={e => setFilter(e.target.value)}/></label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyDiff}
                                                                                 onChange={e => setOnlyDiff(e.target.checked)}/>{t('admin.access.matrix.onlyDiff')}</label>
                <span className="ml-auto text-[13px] text-muted" role="status">{t('admin.access.matrix.count', {count: rows.length})}</span>
            </div>
            {rows.length ? <div className="max-h-[640px] overflow-auto" tabIndex={0} aria-label={t('admin.access.matrix.table')}>
                <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                    <thead>
                    <tr>
                        <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.access.matrix.permission')}</th>
                        {roles.map(r => <th key={r.role} className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-center text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{displayLabel(r.role)}
                            <small className="block font-normal normal-case tracking-normal">{t('admin.access.matrix.grantedCount', {count: r.permissions.length})}</small></th>)}
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-border">{groups.map(group => <Fragment key={group}>
                        <tr><th colSpan={roles.length + 1} className="border-b border-border bg-neutral-50 px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wider text-primary">{displayLabel(group)}</th></tr>
                        {rows.filter(p => p.code.split('_')[0] === group).map(p => <tr key={p.code} className="transition-colors hover:bg-background">
                            <td className="px-4 py-3.5 align-middle text-foreground"><strong className="font-semibold text-foreground">{permissionLabel(p.code, p.description)}</strong>
                                <span className="mt-0.5 block text-xs text-muted">{p.code}</span></td>
                            {roles.map(r => {
                                const has = granted.get(r.role)?.has(p.code);
                                return <td key={r.role} className="px-4 py-3.5 text-center align-middle text-foreground">
                                    {has ? <Check size={16} className="inline-block text-emerald-700" aria-label={t('admin.access.matrix.yes')}/> :
                                        <Minus size={16} className="inline-block text-slate-300" aria-label={t('admin.access.matrix.no')}/>}
                                </td>;
                            })}
                        </tr>)}
                    </Fragment>)}</tbody>
                </table>
            </div> : <EmptyState title={t('admin.access.matrix.empty')}/>}
        </div>
    </QueryState></QueryState>;
}
