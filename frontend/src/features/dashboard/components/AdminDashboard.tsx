'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {ChevronRight, CreditCard, History, MapPin, Plane, Settings, ShieldCheck, Users} from 'lucide-react';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useAuth} from '@/contexts/AuthContext';
import {KpiCard} from "@/components/admin/ui";
import {EmptyState, QueryState} from "@/components/admin/data/WorkspaceState";
import {adminService} from "@/lib/api/admin";
import {useI18n} from '@/contexts/I18nContext';

export function Dashboard() {
    const {user, can, permissionsReady} = useAuth();
    const {t} = useI18n();
    const summary = useQuery({
        queryKey: ['session', user?.id, 'admin-dashboard'],
        queryFn: ({signal}) => adminService.dashboard(signal),
        enabled: permissionsReady && can('DASHBOARD_READ')
    });
    const audit = useQuery({
        queryKey: ['session', user?.id, 'admin-audit', 'recent'],
        queryFn: ({signal}) => adminService.audit(0, 5, signal),
        enabled: permissionsReady && can('AUDIT_READ')
    });
    const pending = useQuery({
        queryKey: ['session', user?.id, 'admin-pending-missions'],
        queryFn: ({signal}) => adminService.pendingMissions(signal),
        enabled: permissionsReady && can('MISSION_VIEW_ALL')
    });
    const fleet = summary.data;
    const fleetAlert = fleet && fleet.totalUavs > 0 && (fleet.maintenanceUavs > 0 || fleet.availableUavs === 0);
    const cards = summary.data ? [
        {label: t('admin.dashboard.cards.users'), value: summary.data.totalUsers, icon: <Users size={18}/>, tone: 'blue' as const},
        {label: t('admin.dashboard.cards.stations'), value: summary.data.totalStations, icon: <MapPin size={18}/>, tone: 'green' as const},
        {
            label: t('admin.dashboard.cards.readyUavs'),
            value: summary.data.availableUavs ?? '—',
            meta: t('admin.dashboard.cards.totalUavs', {total: summary.data.totalUavs ?? '—'}),
            icon: <Plane size={18}/>,
            tone: 'amber' as const
        },
        {
            label: t('admin.dashboard.cards.auditEvents'),
            value: summary.data.totalAuditEvents,
            icon: <History size={18}/>,
            tone: 'slate' as const
        },
    ] : [];
    const shortcuts = [
        {
            href: "/admin/users",
            label: t('admin.dashboard.shortcuts.users'),
            detail: t('admin.dashboard.shortcuts.usersDetail'),
            icon: <Users size={16}/>,
            permission: 'USER_READ'
        },
        {
            href: "/admin/access-control",
            label: t('admin.dashboard.shortcuts.access'),
            detail: t('admin.dashboard.shortcuts.accessDetail'),
            icon: <ShieldCheck size={16}/>,
            permission: 'PERMISSION_MANAGE'
        },
        {
            href: "/admin/billing",
            label: t('admin.dashboard.shortcuts.billing'),
            detail: t('admin.dashboard.shortcuts.billingDetail'),
            icon: <CreditCard size={16}/>,
            permission: 'PERMISSION_MANAGE'
        },
        {
            href: "/admin/settings",
            label: t('admin.dashboard.shortcuts.settings'),
            detail: t('admin.dashboard.shortcuts.settingsDetail'),
            icon: <Settings size={16}/>,
            permission: 'PERMISSION_MANAGE'
        },
    ].filter(item => can(item.permission));
    const pendingPanel = can('MISSION_VIEW_ALL') && <section className="console-panel">
        <header className="console-panel-header"><h2>{t('admin.dashboard.pending.title')}</h2>
            <Link href="/operations/dispatch/missions" className="text-primary font-semibold">{t('admin.dashboard.pending.openDispatch')}</Link>
        </header>
        <QueryState query={pending}>{pending.data?.content.length ?
            <ul className="pending-list">{pending.data.content.map(mission => <li key={mission.id}>
                <Link href={`/operations/missions/${mission.id}`}><strong>{mission.code}</strong>
                    <span>{mission.title}</span></Link>
                <small>{formatDate(mission.startTime)}</small>
            </li>)}</ul> :
            <div className="admin-inline-empty"><strong>{t('admin.dashboard.pending.emptyTitle')}</strong>
                <span>{t('admin.dashboard.pending.emptyDetail')}</span></div>}
        </QueryState>
    </section>;
    const auditPanel = can('AUDIT_READ') && <QueryState query={audit}>
        <section className="data-table audit-table">
            <header className="console-panel-header"><h2>{t('admin.dashboard.audit.title')}</h2><Link
                href="/admin/audit-logs" className="text-primary font-semibold">{t('admin.dashboard.audit.viewAll')}</Link>
            </header>
            {audit.data?.content.length ?
                <div className="table-scroll" tabIndex={0} aria-label={t('admin.dashboard.audit.title')}>
                    <table className="console-table">
                        <thead>
                        <tr>
                            <th>{t('admin.auditTable.time')}</th>
                            <th>{t('admin.auditTable.actor')}</th>
                            <th>{t('admin.auditTable.action')}</th>
                            <th>{t('admin.auditTable.entity')}</th>
                            <th>{t('admin.auditTable.details')}</th>
                        </tr>
                        </thead>
                        <tbody>{audit.data.content.map(log => <tr key={log.id}>
                            <td data-label={t('admin.auditTable.time')}>
                                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                            </td>
                            <td data-label={t('admin.auditTable.actor')}><span
                                className="table-primary">{log.actorUsername || t('admin.auditTable.system')}</span></td>
                            <td data-label={t('admin.auditTable.action')}><span
                                className="audit-action">{displayLabel(log.action)}</span></td>
                            <td data-label={t('admin.auditTable.entity')}>{displayLabel(log.entityType)} · {log.entityId}</td>
                            <td data-label={t('admin.auditTable.details')} className="audit-details">{auditDetail(log.details)}</td>
                        </tr>)}</tbody>
                    </table>
                </div> : <EmptyState title={t('admin.dashboard.audit.emptyTitle')}
                                     detail={t('admin.dashboard.audit.emptyDetail')}/>}
        </section>
    </QueryState>;
    return <div className="admin-dashboard space-y-6">
        <QueryState query={summary}>{summary.data &&
            <div className="kpi-grid">{cards.map(card => <KpiCard key={card.label} {...card} />)}</div>}</QueryState>
        <div className="admin-dashboard-grid">
            <div className="admin-dashboard-main">
                {pendingPanel}
                {auditPanel}
            </div>
            <aside className="admin-dashboard-side">
                {shortcuts.length > 0 && <section className="console-panel">
                    <header className="console-panel-header"><h2>{t('admin.dashboard.quickAccess')}</h2></header>
                    <div className="portal-shortcuts">{shortcuts.map(item => <Link key={item.href} href={item.href}
                                                                                   className="portal-shortcut admin-shortcut">
                        <span className="admin-shortcut-icon" aria-hidden="true">{item.icon}</span>
                        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                        <ChevronRight size={16} aria-hidden="true"/>
                    </Link>)}</div>
                </section>}
                <section className="console-panel">
                    <header className="console-panel-header"><h2>{t('admin.dashboard.status.title')}</h2></header>
                    <ul className="admin-status-list">
                        <li><span className={summary.data ? 'admin-dot admin-dot-ok' : 'admin-dot'} aria-hidden="true"/>
                            <span>{t('admin.dashboard.status.api')}</span><small>{summary.data ? t('admin.dashboard.status.operational') : t('admin.dashboard.status.checking')}</small></li>
                        <li><span className="admin-dot admin-dot-muted" aria-hidden="true"/>
                            <span>{t('admin.dashboard.status.realtime')}</span><small>{t('admin.dashboard.status.noData')}</small></li>
                        <li><span className={fleetAlert ? 'admin-dot admin-dot-warn' : 'admin-dot admin-dot-ok'} aria-hidden="true"/>
                            <span>{t('admin.dashboard.status.fleet')}</span><small>{fleet ? t('admin.dashboard.status.fleetReady', {available: fleet.availableUavs ?? 0, total: fleet.totalUavs ?? 0}) : '—'}</small></li>
                    </ul>
                    {can('PERMISSION_MANAGE') && <div className="panel-body pt-0">
                        <Link href="/admin/webhooks" className="portal-button portal-button-outline inline-flex items-center gap-2 px-4">{t('admin.dashboard.status.manageIntegrations')}</Link></div>}
                </section>
            </aside>
        </div>
    </div>;
}
