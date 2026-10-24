'use client';
import {useState, type FormEvent} from 'react';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useAdminAnalytics, useAdminAudit} from "@/lib/query/admin";
import {EmptyState, QueryState} from "@/components/admin/data/WorkspaceState";
import {Pagination} from "@/components/data/Pagination";
import {Button} from "@/components/admin/ui";
import {Heatmap} from "@/components/admin/charts/AdminCharts";
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import type {AuditFilters} from "@/types/admin";

const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'GRANT', 'REVOKE', 'ASSIGN', 'STATUS_CHANGE',
    'STOCK_IN', 'STOCK_OUT', 'RESERVE', 'RELEASE', 'TRANSFER', 'UPLOAD', 'DOWNLOAD'];
const entityTypes = ['USER', 'USER_PROFILE', 'USER_PERMISSION', 'ROLE_TEMPLATE', 'MISSION', 'UAV', 'STATION', 'MAINTENANCE_SCHEDULE', 'REPAIR_ORDER', 'EQUIPMENT', 'MEDIA'];
const emptyFilters: AuditFilters = {actor: '', action: '', entityType: '', from: '', to: ''};

export function AuditLogs() {
    const {t} = useI18n();
    const {can} = useAuth();
    const [page, setPage] = useState(0);
    const [draft, setDraft] = useState<AuditFilters>(emptyFilters);
    const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
    const q = useAdminAudit(page, 25, filters);
    const analytics = useAdminAnalytics(30);
    const active = Object.values(filters).some(Boolean);
    const set = (field: keyof AuditFilters) => (e: { target: { value: string } }) => setDraft(d => ({...d, [field]: e.target.value}));
    const apply = (e: FormEvent) => {
        e.preventDefault();
        setFilters({...draft, actor: draft.actor?.trim()});
        setPage(0);
    };
    const weekdays = t('admin.audit.weekdays').split(',');

    return <div className="space-y-5">
        {can('DASHBOARD_READ') && analytics.data && <section className="console-panel">
            <header className="console-panel-header"><h2>{t('admin.audit.heatmapTitle')}</h2>
                <span className="text-xs text-slate-500">{t('admin.audit.heatmapRange')}</span></header>
            <div className="panel-body">
                <Heatmap grid={analytics.data.auditHeatmap} rowLabels={weekdays} ariaLabel={t('admin.audit.heatmapAria')}
                         cellTitle={(row, hour, value) => t('admin.audit.heatmapCell', {day: weekdays[row], hour, count: value})}/>
            </div>
        </section>}
        <div className="data-table audit-table">
            <form className="audit-filters" onSubmit={apply} aria-label={t('admin.audit.filtersLabel')}>
                <label>{t('admin.audit.filter.actor')}<input type="search" value={draft.actor} onChange={set('actor')}
                                                            placeholder={t('admin.audit.filter.actorPlaceholder')}/></label>
                <label>{t('admin.audit.filter.action')}<select value={draft.action} onChange={set('action')}>
                    <option value="">{t('admin.audit.filter.all')}</option>
                    {actions.map(a => <option key={a} value={a}>{displayLabel(a)}</option>)}</select></label>
                <label>{t('admin.audit.filter.entity')}<select value={draft.entityType} onChange={set('entityType')}>
                    <option value="">{t('admin.audit.filter.all')}</option>
                    {entityTypes.map(a => <option key={a} value={a}>{displayLabel(a)}</option>)}</select></label>
                <label>{t('admin.audit.filter.from')}<input type="date" value={draft.from} max={draft.to || undefined} onChange={set('from')}/></label>
                <label>{t('admin.audit.filter.to')}<input type="date" value={draft.to} min={draft.from || undefined} onChange={set('to')}/></label>
                <div className="audit-filter-actions">
                    <Button type="submit" size="sm">{t('admin.audit.filter.apply')}</Button>
                    {active && <Button type="button" size="sm" variant="outline" onClick={() => {
                        setDraft(emptyFilters);
                        setFilters(emptyFilters);
                        setPage(0);
                    }}>{t('admin.audit.filter.reset')}</Button>}
                </div>
            </form>
            <QueryState query={q}>{q.data?.content.length ? <>
                <div className="table-scroll" tabIndex={0} aria-label={t('admin.audit.table')}>
                    <table className="console-table">
                        <thead>
                        <tr>
                            <th>{t('admin.auditTable.time')}</th>
                            <th>{t('admin.auditTable.actor')}</th>
                            <th>{t('admin.auditTable.action')}</th>
                            <th>{t('admin.auditTable.entity')}</th>
                            <th>{t('admin.auditTable.id')}</th>
                            <th>{t('admin.auditTable.details')}</th>
                        </tr>
                        </thead>
                        <tbody>{q.data.content.map(log => <tr key={log.id}>
                            <td data-label={t('admin.auditTable.time')}>
                                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                            </td>
                            <td data-label={t('admin.auditTable.actor')}><span
                                className="table-primary">{log.actorUsername || t('admin.auditTable.system')}</span></td>
                            <td data-label={t('admin.auditTable.action')}><span className="audit-action">{displayLabel(log.action)}</span></td>
                            <td data-label={t('admin.auditTable.entity')}>{displayLabel(log.entityType)}</td>
                            <td data-label={t('admin.auditTable.id')}>{log.entityId}</td>
                            <td data-label={t('admin.auditTable.details')} className="audit-details">{auditDetail(log.details)}</td>
                        </tr>)}</tbody>
                    </table>
                </div>
                <Pagination page={page} totalPages={q.data.totalPages} total={q.data.totalElements} onChange={setPage}/>
            </> : active ? <EmptyState title={t('admin.audit.noMatchTitle')} detail={t('admin.audit.noMatchDetail')}/> :
                <EmptyState title={t('admin.audit.emptyTitle')}/>}</QueryState>
        </div>
    </div>;
}
