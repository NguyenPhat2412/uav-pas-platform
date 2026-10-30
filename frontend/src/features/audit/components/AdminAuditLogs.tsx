'use client';
import {useState, type FormEvent} from 'react';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useAdminAnalytics} from '@/features/dashboard/hooks/useAdminDashboard';
import {useAdminAudit} from '@/features/audit/hooks/useAdminAudit';
import {EmptyState, QueryState} from "@/components/data/WorkspaceState";
import {Pagination} from "@/components/data/Pagination";
import {Button} from "@/components/ui";
import {Heatmap} from "@/features/dashboard/components/AdminCharts";
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
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
    const filterInputClass = "h-9 rounded-control border border-border-input bg-card px-2.5 text-[13px] font-normal text-foreground";

    return <div className="space-y-5">
        {can('DASHBOARD_READ') && analytics.data && <section className="min-w-0 rounded-panel border border-border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.audit.heatmapTitle')}</h2>
                <span className="text-xs text-slate-500">{t('admin.audit.heatmapRange')}</span></header>
            <div className="p-6">
                <Heatmap grid={analytics.data.auditHeatmap} rowLabels={weekdays} ariaLabel={t('admin.audit.heatmapAria')}
                         cellTitle={(row, hour, value) => t('admin.audit.heatmapCell', {day: weekdays[row], hour, count: value})}/>
            </div>
        </section>}
        <div className="min-w-0 overflow-hidden rounded-panel border border-border bg-card">
            <form className="grid grid-cols-1 items-end gap-2.5 border-b border-border px-4 py-3.5 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1.2fr)_repeat(2,minmax(130px,1fr))_repeat(2,minmax(130px,0.9fr))_auto]" onSubmit={apply} aria-label={t('admin.audit.filtersLabel')}>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{t('admin.audit.filter.actor')}<input className={filterInputClass} type="search" value={draft.actor} onChange={set('actor')}
                                                            placeholder={t('admin.audit.filter.actorPlaceholder')}/></label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{t('admin.audit.filter.action')}<select className={filterInputClass} value={draft.action} onChange={set('action')}>
                    <option value="">{t('admin.audit.filter.all')}</option>
                    {actions.map(a => <option key={a} value={a}>{displayLabel(a)}</option>)}</select></label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{t('admin.audit.filter.entity')}<select className={filterInputClass} value={draft.entityType} onChange={set('entityType')}>
                    <option value="">{t('admin.audit.filter.all')}</option>
                    {entityTypes.map(a => <option key={a} value={a}>{displayLabel(a)}</option>)}</select></label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{t('admin.audit.filter.from')}<input className={filterInputClass} type="date" value={draft.from} onChange={set('from')}/></label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">{t('admin.audit.filter.to')}<input className={filterInputClass} type="date" value={draft.to} onChange={set('to')}/></label>
                <div className="flex gap-2">
                    <Button type="submit" size="sm">{t('admin.audit.filter.apply')}</Button>
                    {active && <Button type="button" size="sm" variant="outline" onClick={() => {
                        setDraft(emptyFilters);
                        setFilters(emptyFilters);
                        setPage(0);
                    }}>{t('admin.audit.filter.reset')}</Button>}
                </div>
            </form>
            <QueryState query={q}>{q.data?.content.length ? <>
                <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.audit.table')}>
                    <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.time')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.actor')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.action')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.entity')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.id')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.details')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">{q.data.content.map(log => <tr key={log.id} className="transition-colors hover:bg-background">
                            <td data-label={t('admin.auditTable.time')} className="px-4 py-3.5 align-top text-foreground">
                                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                            </td>
                            <td data-label={t('admin.auditTable.actor')} className="px-4 py-3.5 align-top text-foreground"><span
                                className="font-semibold text-foreground">{log.actorUsername || t('admin.auditTable.system')}</span></td>
                            <td data-label={t('admin.auditTable.action')} className="px-4 py-3.5 align-top text-foreground"><span className="inline-block whitespace-nowrap rounded-badge bg-uav-red-light px-2 py-1 text-xs font-medium text-primary">{displayLabel(log.action)}</span></td>
                            <td data-label={t('admin.auditTable.entity')} className="px-4 py-3.5 align-top text-foreground">{displayLabel(log.entityType)}</td>
                            <td data-label={t('admin.auditTable.id')} className="px-4 py-3.5 align-top text-foreground">{log.entityId}</td>
                            <td data-label={t('admin.auditTable.details')} className="max-w-[320px] px-4 py-3.5 align-top text-[13px] text-foreground">{auditDetail(log.details)}</td>
                        </tr>)}</tbody>
                    </table>
                </div>
                <Pagination page={page} totalPages={q.data.totalPages} total={q.data.totalElements} onChange={setPage}/>
            </> : active ? <EmptyState title={t('admin.audit.noMatchTitle')} detail={t('admin.audit.noMatchDetail')}/> :
                <EmptyState title={t('admin.audit.emptyTitle')}/>}</QueryState>
        </div>
    </div>;
}
