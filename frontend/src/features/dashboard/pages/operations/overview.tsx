'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {
    Activity,
    Boxes,
    Crosshair,
    FileKey2,
    MapPinned,
    PlaneTakeoff,
    RadioTower,
    Settings2,
    ShieldCheck,
    Users
} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {AppShell} from '@/components/layout/AppShell';
import {PageHeader} from '@/components/layout/PageHeader';
import {Spinner, StatusBadge} from '@/components/ui';
import {useAuth} from '@/contexts/AuthContext';
import {dashboardService} from '@/features/dashboard/services/dashboard.service';
import {missionService} from '@/features/missions/services/mission.service';
import type {DashboardSummary} from '@/features/dashboard/types/dashboard.types';
import type {MissionDashboard} from '@/features/missions/types/mission.types';
import {useCollection} from "@/hooks/useCollections";
import {useI18n} from '@/contexts/I18nContext';

const quickActions = [
    {icon: Settings2, labelKey: 'opsMissions.overview.quick.stations', href: "/operations/stations"},
    {icon: Activity, labelKey: 'opsMissions.overview.quick.dispatch', href: "/operations/dispatch/missions"},
    {icon: PlaneTakeoff, labelKey: 'opsMissions.overview.quick.uavs', href: "/operations/uavs"},
    {icon: FileKey2, labelKey: 'opsMissions.overview.quick.media', href: "/operations/media"},
];

export default function HomePage() {
    const router = useRouter();
    const {user, isAuthenticated, isLoading, permissionsReady, can} = useAuth();
    const {t, formatNumber} = useI18n();
    const count = (value?: number) => value == null ? '—' : formatNumber(value);
    const canReadSummary = can('DASHBOARD_READ');
    const canReadMissions = can('DASHBOARD_MISSION');
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [missions, setMissions] = useState<MissionDashboard | null>(null);
    const uavsQuery = useCollection('uavs');
    const stationsQuery = useCollection('stations');
    const [error, setError] = useState(false);
    const [selectedUavId, setSelectedUavId] = useState<number>(1);
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace("/operations/login");
    }, [isAuthenticated, isLoading, router]);
    useEffect(() => {
        if (!isAuthenticated || !permissionsReady) return;
        let active = true;
        Promise.allSettled([
            canReadSummary ? dashboardService.getSummary() : Promise.resolve(null),
            canReadMissions ? missionService.dashboard() : Promise.resolve(null),
        ]).then(([resources, mission]) => {
            if (!active) return;
            setSummary(resources.status === 'fulfilled' ? resources.value : null);
            setMissions(mission.status === 'fulfilled' ? mission.value : null);
            setError(resources.status === 'rejected' || mission.status === 'rejected');
        });
        return () => {
            active = false;
        };
    }, [isAuthenticated, permissionsReady, canReadSummary, canReadMissions]);
    if (isLoading || !isAuthenticated || !user) return <div
        className="flex min-h-screen items-center justify-center bg-[#f3f6fb]"><Spinner size="lg"
                                                                                        label={t('opsMissions.overview.authenticating')}/></div>;

    const uavList = (uavsQuery.data ?? []).slice(0, 6);
    const activeUav = uavList.find(u => u.id === selectedUavId) ?? uavList[0];

    return <AppShell activeResource="overview">
        <div className="w-full">
            <PageHeader title={t('opsMissions.overview.title')}
                        action={{label: t('opsMissions.overview.openDispatch'), href: "/operations/dispatch/missions"}}/>
            {(error || uavsQuery.isError || stationsQuery.isError) && <div
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{t('opsMissions.overview.partialError')}</div>}
            {canReadSummary &&
                <section className="inline-summary mb-5" aria-label={t('opsMissions.overview.summary.label')}>
                    <span><Users
                        size={15}/> {t('opsMissions.overview.summary.users')} <strong>{count(summary?.totalUsers)}</strong></span><span><MapPinned
                    size={15}/> {t('opsMissions.overview.summary.stations')} <strong>{count(summary?.totalStations)}</strong></span><span><PlaneTakeoff
                    size={15}/> {t('opsMissions.overview.summary.availableUavs')} <strong>{count(summary?.availableUavs)}</strong></span><span><Boxes
                    size={15}/> {t('opsMissions.overview.summary.equipment')} <strong>{count(summary?.totalEquipmentUnits)}</strong></span><span><Activity
                    size={15}/> {t('opsMissions.overview.summary.auditEvents')} <strong>{count(summary?.totalAuditEvents)}</strong></span></section>}
            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(370px,.75fr)]">
                <div className="min-w-0 space-y-5">
                    {canReadMissions && <div className="console-panel">
                        <div className="console-panel-header">
                            <div><h2>{t('opsMissions.overview.missions.title')}</h2><span>{t('opsMissions.overview.missions.subtitle')}</span></div>
                            <Link href="/operations/dispatch/missions"
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">{t('opsMissions.overview.missions.openList')}</Link></div>
                        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                            <MissionMetric label={t('opsMissions.overview.missions.total')} value={count(missions?.totalMissions)}
                                           icon={<Activity size={15}/>}/>
                            <MissionMetric label={t('opsMissions.overview.missions.inProgress')} value={count(missions?.inProgressMissions)}
                                           icon={<RadioTower size={15}/>} tone="blue"/>
                            <MissionMetric label={t('opsMissions.overview.missions.completed')} value={count(missions?.completedMissions)}
                                           icon={<ShieldCheck size={15}/>} tone="green"/>
                            <MissionMetric label={t('opsMissions.overview.missions.failed')} value={count(missions?.failedMissions)}
                                           icon={<Activity size={15}/>} tone="red"/>
                        </div>
                        <div
                            className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs">
                            <span className="text-slate-500">{t('opsMissions.overview.missions.pending')} <strong
                                className="text-slate-800">{count(missions?.pendingMissions)}</strong></span><span
                            className="text-slate-500">{t('opsMissions.overview.missions.ready')} <strong
                            className="text-slate-800">{count(missions?.readyMissions)}</strong></span><Link
                            href="/operations/dispatch/missions" className="font-semibold text-primary hover:underline">{t('opsMissions.overview.openDispatch')}</Link></div>
                    </div>}
                    <div className="console-panel">
                        <div className="console-panel-header">
                            <div><h2>{t('opsMissions.overview.fleet.title')}</h2><span>{t('opsMissions.overview.fleet.subtitle')}</span></div>
                            <Link href="/operations/uavs"
                                  className="text-xs font-semibold text-primary hover:underline">{t('opsMissions.overview.fleet.viewAll')}</Link></div>
                        <div className="overflow-x-auto">
                            <table className="console-table">
                                <thead>
                                <tr>
                                    <th>{t('opsMissions.overview.fleet.asset')}</th>
                                    <th>{t('opsMissions.overview.fleet.status')}</th>
                                    <th>{t('opsMissions.overview.fleet.station')}</th>
                                    <th>{t('opsMissions.overview.fleet.manufacturer')}</th>
                                    <th>{t('opsMissions.overview.fleet.actions')}</th>
                                </tr>
                                </thead>
                                <tbody>{!uavList.length && <tr>
                                    <td colSpan={5}>{t('opsMissions.overview.fleet.empty')}</td>
                                </tr>}{uavList.map(uav => <tr key={uav.id} onClick={() => setSelectedUavId(uav.id)}
                                                              className={`cursor-pointer transition ${activeUav?.id === uav.id ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                                    <td>
                                        <div className="table-primary">{uav.model}</div>
                                        <div className="table-secondary">{uav.serialNumber}</div>
                                    </td>
                                    <td><StatusBadge status={uav.status}/></td>
                                    <td>{uav.stationName || t('opsMissions.overview.fleet.unassigned')}</td>
                                    <td>{uav.manufacturer}</td>
                                    <td><Link href="/operations/uavs"
                                              className="text-xs font-semibold text-primary hover:underline">{t('opsMissions.overview.fleet.details')}</Link></td>
                                </tr>)}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="console-panel flex flex-col justify-between p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                            <Crosshair size={16} className="text-[#ab2523]"/>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{activeUav?.model ?? t('opsMissions.overview.hud.noUav')}</h3>
                                <span
                                    className="font-mono text-[11px] text-slate-500">{activeUav?.serialNumber ?? '—'} · {activeUav?.stationName || t('opsMissions.overview.hud.noStation')}</span>
                            </div>
                        </div>
                        <StatusBadge status={activeUav?.status ?? 'UNKNOWN'}/>
                    </div>
                    <div
                        className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-lg border border-[#333842] bg-[#181a1e]">
                        <div
                            className="pointer-events-none absolute flex h-[240px] w-[240px] items-center justify-center rounded-full border border-[#ab2523]/30">
                            <div className="h-[165px] w-[165px] rounded-full border border-dashed border-[#ab2523]/25"/>
                        </div>
                        <div className="z-10 p-4 text-center">
                            <div
                                className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ab2523]/40 bg-[#ab2523]/20 shadow-lg shadow-[#ab2523]/30">
                                <PlaneTakeoff size={34} className="text-white"/>
                            </div>
                            <span
                                className="block text-xs font-extrabold tracking-wider text-white">{t('opsMissions.overview.hud.frame')}</span>
                            <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{t('opsMissions.overview.hud.noTelemetry')}</span>
                        </div>
                        <span className="absolute left-2.5 top-2 font-mono text-[10px] font-bold text-[#ab2523]">┌ HUD-01</span>
                        <span className="absolute right-2.5 top-2 font-mono text-[10px] font-bold text-[#ab2523]">┐ D-RTK</span>
                        <span className="absolute bottom-2 left-2.5 font-mono text-[10px] font-bold text-[#ab2523]">└ 5.8G</span>
                        <span className="absolute bottom-2 right-2.5 font-mono text-[10px] font-bold text-[#ab2523]">┘ 360°</span>
                    </div>
                    <div
                        className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-semibold">
                        <span className="text-slate-500">{t('opsMissions.overview.hud.battery')} <strong className="text-emerald-600">—</strong></span>
                        <span className="text-slate-500">{t('opsMissions.overview.hud.altitude')} <strong className="text-slate-900">—</strong></span>
                        <span className="text-slate-500">RTK: <strong className="text-emerald-600">—</strong></span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                        <Link href="/operations/sar-cockpit" className="font-semibold text-[#ab2523] hover:underline">{t('opsMissions.overview.hud.openSar')}</Link>
                        <Link href="/operations/uavs"
                              className="inline-flex items-center font-semibold text-slate-600 hover:text-slate-900">{t('opsMissions.overview.hud.openFleet')}</Link>
                    </div>
                </div>
            </section>
            <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
                <div className="console-panel">
                    <div className="console-panel-header">
                        <div><h2>{t('opsMissions.overview.stations.title')}</h2><span>{t('opsMissions.overview.stations.subtitle')}</span></div>
                        <Link href="/operations/stations"
                              className="text-xs font-semibold text-primary hover:underline">{t('opsMissions.overview.stations.manage')}</Link></div>
                    <div className="overflow-x-auto">
                        <table className="console-table">
                            <thead>
                            <tr>
                                <th>{t('opsMissions.overview.stations.station')}</th>
                                <th>{t('opsMissions.overview.stations.status')}</th>
                                <th>{t('opsMissions.overview.stations.address')}</th>
                                <th>{t('opsMissions.overview.stations.coordinates')}</th>
                            </tr>
                            </thead>
                            <tbody>{(stationsQuery.data ?? []).slice(0, 6).map(station => <tr key={station.id}>
                                <td className="table-primary">{station.code}<span
                                    className="table-secondary">{station.name}</span></td>
                                <td><StatusBadge status={station.status}/></td>
                                <td>{station.address || '—'}</td>
                                <td>{station.latitude != null && station.longitude != null ? String(station.latitude) + ', ' + String(station.longitude) : '—'}</td>
                            </tr>)}</tbody>
                        </table>
                    </div>
                </div>
                <div className="console-panel">
                    <div className="console-panel-header">
                        <div><h2>{t('opsMissions.overview.quickActions.title')}</h2><span>{t('opsMissions.overview.quickActions.subtitle')}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3">{quickActions.map(({icon: Icon, labelKey, href}) => <Link
                        key={href} href={href}
                        className="group flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 p-3 transition hover:border-primary/40 hover:bg-primary/5"><span
                        className="text-slate-400 group-hover:text-primary"><Icon size={17}/></span><span
                        className="text-xs font-semibold text-slate-700">{t(labelKey)}</span></Link>)}</div>
                </div>
            </section>
        </div>
    </AppShell>;
}

function MissionMetric({label, value, icon, tone = 'slate'}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    tone?: 'slate' | 'blue' | 'green' | 'red'
}) {
    const colors = {slate: 'text-slate-500', blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-rose-600'};
    return <div className="bg-white p-4">
        <div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${colors[tone]}`}>{icon}{label}</div>
        <strong className="text-2xl tracking-tight text-slate-900">{value}</strong></div>;
}
