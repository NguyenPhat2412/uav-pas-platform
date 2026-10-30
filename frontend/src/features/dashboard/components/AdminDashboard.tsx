'use client';
import Link from 'next/link';
import {History, MapPin, Plane, Users} from 'lucide-react';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useAuth} from '@/providers/AuthContext';
import {KpiCard, MetricStrip} from "@/components/ui";
import {EmptyState, QueryState} from "@/components/data/WorkspaceState";
import {useAdminDashboardSummary} from '@/features/dashboard/hooks/useAdminDashboard';
import {useAdminAudit} from '@/features/audit/hooks/useAdminAudit';
import {useI18n} from '@/providers/I18nContext';
import {AdminMonitoringCard} from '@/features/dashboard/components/AdminMonitoringCard';

const NO_FILTERS = {};

export function Dashboard() {
    const {can} = useAuth();
    const {t} = useI18n();
    const summary = useAdminDashboardSummary();
    const audit = useAdminAudit(0, 5, NO_FILTERS);
    const fleet = summary.data;
    const cards = summary.data ? [
        {label: t('admin.dashboard.cards.users'), value: summary.data.totalUsers, icon: <Users size={18}/>, tone: 'red' as const},
        {label: t('admin.dashboard.cards.stations'), value: summary.data.totalStations, icon: <MapPin size={18}/>, tone: 'red' as const},
        {
            label: t('admin.dashboard.cards.readyUavs'),
            value: summary.data.availableUavs ?? '—',
            meta: t('admin.dashboard.cards.totalUavs', {total: summary.data.totalUavs ?? '—'}),
            icon: <Plane size={18}/>,
            tone: 'red' as const
        },
        {
            label: t('admin.dashboard.cards.auditEvents'),
            value: summary.data.totalAuditEvents,
            icon: <History size={18}/>,
            tone: 'red' as const
        },
    ] : [];
    const auditPanel = can('AUDIT_READ') && <QueryState query={audit}>
        <section className="min-w-0 overflow-hidden rounded-panel border border-rose-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200 px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-primary">{t('admin.dashboard.audit.title')}</h2><Link
                href="/admin/audit-logs" className="text-[13px] font-bold text-primary hover:underline">{t('admin.dashboard.audit.viewAll')}</Link>
            </header>
            {audit.data?.content.length ?
                <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.dashboard.audit.title')}>
                    <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-rose-200 bg-rose-50/70 px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-primary">{t('admin.auditTable.time')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-rose-200 bg-rose-50/70 px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-primary">{t('admin.auditTable.actor')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-rose-200 bg-rose-50/70 px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-primary">{t('admin.auditTable.action')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-rose-200 bg-rose-50/70 px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-primary">{t('admin.auditTable.entity')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-rose-200 bg-rose-50/70 px-4 py-3 text-left text-[11.5px] font-bold uppercase tracking-wider text-primary">{t('admin.auditTable.details')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-rose-100">{audit.data.content.map(log => <tr key={log.id} className="transition-colors hover:bg-rose-50/40">
                            <td data-label={t('admin.auditTable.time')} className="px-4 py-3.5 align-top text-foreground">
                                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                            </td>
                            <td data-label={t('admin.auditTable.actor')} className="px-4 py-3.5 align-top text-foreground"><span
                                className="font-semibold text-primary">{log.actorUsername || t('admin.auditTable.system')}</span></td>
                            <td data-label={t('admin.auditTable.action')} className="px-4 py-3.5 align-top text-foreground"><span
                                className="inline-block whitespace-nowrap rounded-badge bg-uav-red-light px-2 py-1 text-xs font-bold text-primary">{displayLabel(log.action)}</span></td>
                            <td data-label={t('admin.auditTable.entity')} className="px-4 py-3.5 align-top text-foreground">{displayLabel(log.entityType)} · {log.entityId}</td>
                            <td data-label={t('admin.auditTable.details')} className="max-w-[320px] px-4 py-3.5 align-top text-[13px] text-foreground">{auditDetail(log.details)}</td>
                        </tr>)}</tbody>
                    </table>
                </div> : <EmptyState title={t('admin.dashboard.audit.emptyTitle')}
                                     detail={t('admin.dashboard.audit.emptyDetail')}/>}
        </section>
    </QueryState>;
    return <div className="space-y-6">
        <QueryState query={summary}>{summary.data &&
            <MetricStrip>{cards.map(card => <KpiCard key={card.label} {...card} />)}</MetricStrip>}</QueryState>
        <div className="grid grid-cols-1 gap-px border border-rose-200 bg-rose-200 [&>*]:border-0 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col divide-y divide-rose-200 bg-white [&>*]:border-0">
                {auditPanel}
            </div>
            <aside className="flex min-w-0 flex-col divide-y divide-rose-200 bg-white [&>*]:border-0">
                <AdminMonitoringCard summaryLoaded={!!summary.data}
                                     fleet={fleet ? {totalUavs: fleet.totalUavs ?? 0, availableUavs: fleet.availableUavs ?? 0, maintenanceUavs: fleet.maintenanceUavs ?? 0} : null}/>
            </aside>
        </div>
    </div>;
}
