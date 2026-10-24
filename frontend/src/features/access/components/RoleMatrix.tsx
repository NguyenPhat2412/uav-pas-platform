'use client';
import {Fragment, useState} from 'react';
import {Check, Minus} from 'lucide-react';
import {displayLabel, permissionLabel} from "@/components/shared/presentation";
import {useAdminReferenceData} from "@/lib/query/admin";
import {EmptyState, QueryState} from "@/components/admin/data/WorkspaceState";
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
        <div className="data-table">
            <div className="table-toolbar">
                <label className="table-search"><span className="sr-only">{t('admin.access.matrix.search')}</span>
                    <input placeholder={t('admin.access.matrix.search')} value={filter} onChange={e => setFilter(e.target.value)}/></label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyDiff}
                                                                                 onChange={e => setOnlyDiff(e.target.checked)}/>{t('admin.access.matrix.onlyDiff')}</label>
                <span className="table-result-count" role="status">{t('admin.access.matrix.count', {count: rows.length})}</span>
            </div>
            {rows.length ? <div className="table-scroll" tabIndex={0} aria-label={t('admin.access.matrix.table')}>
                <table className="console-table role-matrix">
                    <thead>
                    <tr>
                        <th>{t('admin.access.matrix.permission')}</th>
                        {roles.map(r => <th key={r.role} className="text-center">{displayLabel(r.role)}
                            <small>{t('admin.access.matrix.grantedCount', {count: r.permissions.length})}</small></th>)}
                    </tr>
                    </thead>
                    <tbody>{groups.map(group => <Fragment key={group}>
                        <tr className="role-matrix-group"><th colSpan={roles.length + 1}>{displayLabel(group)}</th></tr>
                        {rows.filter(p => p.code.split('_')[0] === group).map(p => <tr key={p.code}>
                            <td><strong className="table-primary">{permissionLabel(p.code, p.description)}</strong>
                                <span className="table-secondary">{p.code}</span></td>
                            {roles.map(r => {
                                const has = granted.get(r.role)?.has(p.code);
                                return <td key={r.role} className="text-center">
                                    {has ? <Check size={16} className="matrix-yes" aria-label={t('admin.access.matrix.yes')}/> :
                                        <Minus size={16} className="matrix-no" aria-label={t('admin.access.matrix.no')}/>}
                                </td>;
                            })}
                        </tr>)}
                    </Fragment>)}</tbody>
                </table>
            </div> : <EmptyState title={t('admin.access.matrix.empty')}/>}
        </div>
    </QueryState></QueryState>;
}
