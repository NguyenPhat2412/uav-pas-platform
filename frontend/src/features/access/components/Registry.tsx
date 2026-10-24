'use client';
import {displayLabel, permissionLabel} from "@/components/shared/presentation";
import {Search} from 'lucide-react';
import {useState} from 'react';
import {useAdminReferenceData} from "@/lib/query/admin";
import {EmptyState, QueryState} from "@/components/admin/data/WorkspaceState";
import {useI18n} from '@/contexts/I18nContext';

export function Registry() {
    const {permissions} = useAdminReferenceData();
    const [filter, setFilter] = useState('');
    const {t} = useI18n();
    const rows = permissions.data?.filter(p => (p.code + ' ' + permissionLabel(p.code, p.description)).toLowerCase().includes(filter.toLowerCase()));
    return <div className="data-table portal-responsive-table">
        <div className="table-toolbar">
            <label className="table-search"><Search size={18} aria-hidden="true"/><span
                className="sr-only">{t('admin.access.registry.search')}</span><input placeholder={t('admin.access.registry.placeholder')} value={filter}
                                                           onChange={e => setFilter(e.target.value)}/></label>
            {permissions.data && <span className="table-result-count" role="status">{t('admin.access.registry.count', {count: rows?.length ?? 0})}</span>}
        </div>
        <QueryState query={permissions}>{rows?.length ?
            <div className="table-scroll" tabIndex={0} aria-label={t('admin.access.registry.table')}>
                <table className="console-table">
                    <thead>
                    <tr>
                        <th>{t('admin.access.registry.colAccess')}</th>
                        <th>{t('admin.access.registry.colGroup')}</th>
                        <th>{t('admin.access.registry.colSupport')}</th>
                    </tr>
                    </thead>
                    <tbody>{rows.map(p => <tr key={p.code}>
                        <td data-label={t('admin.access.registry.labelPermission')}><strong
                            className="table-primary">{permissionLabel(p.code, p.description)}</strong><span
                            className="table-secondary">{p.code}</span></td>
                        <td data-label={t('admin.access.registry.labelGroup')}>{displayLabel(p.code.split('_')[0])}</td>
                        <td data-label={t('admin.access.registry.colSupport')}>{t('admin.access.registry.supported')}</td>
                    </tr>)}</tbody>
                </table>
            </div> : <EmptyState title={t('admin.access.registry.emptyTitle')}
                                 detail={t('admin.access.registry.emptyDetail')}/>}</QueryState>
    </div>;
}
