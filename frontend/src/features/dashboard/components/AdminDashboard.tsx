'use client';
import Link from 'next/link';
import {useQuery} from '@tanstack/react-query';
import {ChevronRight, CreditCard, History, MapPin, Plane, Settings, ShieldCheck, Users} from 'lucide-react';
import {auditDetail, displayLabel, formatDate} from "@/components/shared/presentation";
import {useAuth} from '@/contexts/AuthContext';
import {KpiCard} from "@/components/ui";
import {EmptyState, QueryState} from "@/components/data/WorkspaceState";
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
    const pendingPanel = can('MISSION_VIEW_ALL') && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.dashboard.pending.title')}</h2>
            <Link href="/operations/dispatch/missions" className="text-[13px] font-semibold text-primary hover:underline">{t('admin.dashboard.pending.openDispatch')}</Link>
        </header>
        <QueryState query={pending}>{pending.data?.content.length ?
            <ul className="m-0 list-none px-5 pb-3">{pending.data.content.map(mission => <li key={mission.id} className="flex items-center justify-between gap-3 border-t border-border py-3 first:border-t-0">
                <Link href={`/operations/missions/${mission.id}`} className="flex min-w-0 flex-col text-foreground"><strong>{mission.code}</strong>
                    <span className="truncate text-muted">{mission.title}</span></Link>
                <small className="shrink-0 text-muted">{formatDate(mission.startTime)}</small>
            </li>)}</ul> :
            <div className="flex flex-col gap-0.5 p-[18px] text-[13px] text-muted"><strong className="text-[13.5px] text-foreground">{t('admin.dashboard.pending.emptyTitle')}</strong>
                <span>{t('admin.dashboard.pending.emptyDetail')}</span></div>}
        </QueryState>
    </section>;
    const auditPanel = can('AUDIT_READ') && <QueryState query={audit}>
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.dashboard.audit.title')}</h2><Link
                href="/admin/audit-logs" className="text-[13px] font-semibold text-primary hover:underline">{t('admin.dashboard.audit.viewAll')}</Link>
            </header>
            {audit.data?.content.length ?
                <div className="overflow-x-auto" tabIndex={0} aria-label={t('admin.dashboard.audit.title')}>
                    <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
                        <thead>
                        <tr>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.time')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.actor')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.action')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.entity')}</th>
                            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-slate-50 px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{t('admin.auditTable.details')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">{audit.data.content.map(log => <tr key={log.id} className="transition-colors hover:bg-background">
                            <td data-label={t('admin.auditTable.time')} className="px-4 py-3.5 align-top text-foreground">
                                <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                            </td>
                            <td data-label={t('admin.auditTable.actor')} className="px-4 py-3.5 align-top text-foreground"><span
                                className="font-semibold text-foreground">{log.actorUsername || t('admin.auditTable.system')}</span></td>
                            <td data-label={t('admin.auditTable.action')} className="px-4 py-3.5 align-top text-foreground"><span
                                className="inline-block whitespace-nowrap rounded-md bg-uav-red-light px-2 py-1 text-xs font-medium text-primary">{displayLabel(log.action)}</span></td>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <KpiCard key={card.label} {...card} />)}</div>}</QueryState>
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-5">
                {pendingPanel}
                {auditPanel}
            </div>
            <aside className="flex min-w-0 flex-col gap-5">
                {shortcuts.length > 0 && <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.dashboard.quickAccess')}</h2></header>
                    <div className="divide-y divide-border px-[18px] py-1">{shortcuts.map(item => <Link key={item.href} href={item.href}
                                                                                   className="group flex items-center justify-between gap-3 py-3 text-foreground transition-colors hover:text-primary">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-uav-red-light text-primary" aria-hidden="true">{item.icon}</span>
                        <span className="flex min-w-0 flex-1 flex-col"><strong>{item.label}</strong><small className="mt-1 block text-xs text-muted">{item.detail}</small></span>
                        <ChevronRight size={16} aria-hidden="true" className="text-slate-300 transition-colors group-hover:text-primary"/>
                    </Link>)}</div>
                </section>}
                <section className="min-w-0 rounded-xl border border-border bg-card shadow-sm">
                    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-[18px] py-3.5"><h2 className="text-[15px] font-bold tracking-tight text-foreground">{t('admin.dashboard.status.title')}</h2></header>
                    <ul className="m-0 list-none px-[18px] pb-3.5 pt-1.5">
                        <li className="flex items-center gap-2.5 border-b border-dashed border-border py-2.5 text-[13px] last:border-b-0"><span className={`h-2 w-2 shrink-0 rounded-full ${summary.data ? 'bg-emerald-600' : 'bg-slate-300'}`} aria-hidden="true"/>
                            <span className="flex-1 text-foreground">{t('admin.dashboard.status.api')}</span><small className="text-xs text-muted">{summary.data ? t('admin.dashboard.status.operational') : t('admin.dashboard.status.checking')}</small></li>
                        <li className="flex items-center gap-2.5 border-b border-dashed border-border py-2.5 text-[13px] last:border-b-0"><span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-hidden="true"/>
                            <span className="flex-1 text-foreground">{t('admin.dashboard.status.realtime')}</span><small className="text-xs text-muted">{t('admin.dashboard.status.noData')}</small></li>
                        <li className="flex items-center gap-2.5 border-b border-dashed border-border py-2.5 text-[13px] last:border-b-0"><span className={`h-2 w-2 shrink-0 rounded-full ${fleetAlert ? 'bg-amber-600' : 'bg-emerald-600'}`} aria-hidden="true"/>
                            <span className="flex-1 text-foreground">{t('admin.dashboard.status.fleet')}</span><small className="text-xs text-muted">{fleet ? t('admin.dashboard.status.fleetReady', {available: fleet.availableUavs ?? 0, total: fleet.totalUavs ?? 0}) : '—'}</small></li>
                    </ul>
                    {can('PERMISSION_MANAGE') && <div className="px-6 pb-6 pt-0">
                        <Link href="/admin/webhooks" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-card px-4 font-bold text-foreground transition hover:-translate-y-px hover:bg-background">{t('admin.dashboard.status.manageIntegrations')}</Link></div>}
                </section>
            </aside>
        </div>
    </div>;
}
