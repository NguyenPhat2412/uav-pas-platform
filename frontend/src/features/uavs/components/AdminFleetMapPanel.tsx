'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useMemo, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {ExternalLink, Info, MapPin, Navigation, RefreshCw, Search, X} from 'lucide-react';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {displayLabel} from '@/components/shared/presentation';
import {QueryState} from '@/components/data/WorkspaceState';
import {Pagination} from '@/components/data/Pagination';
import {useUavHistory} from '@/hooks/useOperations';
import {cn} from '@/lib/utils';
import {fleetMapService} from '@/features/uavs/services/fleet-map.service';
import {uavStatuses, type FleetStation, type FleetUav, type UavStatus} from '@/features/uavs/types/fleet-map.types';
import {uavStatusColor} from '@/features/uavs/components/FleetMap';

const FleetMap = dynamic(() => import('@/features/uavs/components/FleetMap').then(m => m.FleetMap), {ssr: false});

export function AdminFleetMapPanel() {
    const {user, can} = useAuth();
    const {t, formatDate} = useI18n();
    const [status, setStatus] = useState<UavStatus | null>(null);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const query = useQuery({
        queryKey: ['session', user?.id, 'fleet-map'],
        queryFn: ({signal}) => fleetMapService.get(signal),
        enabled: can('UAV_READ'),
        refetchInterval: 60_000,
    });
    const all = useMemo(() => query.data?.uavs ?? [], [query.data]);
    const term = search.trim().toLowerCase();
    const visible = useMemo(() => all.filter(u => (!status || u.status === status)
        && (!term || `${u.model} ${u.serialNumber} ${u.stationName ?? ''} ${u.activeMission?.code ?? ''}`.toLowerCase().includes(term))), [all, status, term]);
    const selected = all.find(u => u.id === selectedId) ?? null;
    const counts = useMemo(() => Object.fromEntries(uavStatuses.map(s => [s, all.filter(u => u.status === s).length])), [all]);
    const located = visible.filter(u => u.positionSource !== 'NONE');
    const unlocated = visible.filter(u => u.positionSource === 'NONE');

    const where = (u: FleetUav) => u.positionSource === 'TELEMETRY' ? t('admin.fleetMap.liveGps')
        : u.positionSource === 'MISSION'
        ? t('admin.fleetMap.atMission', {code: u.activeMission?.code ?? ''})
        : u.positionSource === 'STATION' ? t('admin.fleetMap.atStation', {name: u.stationName ?? ''}) : t('admin.fleetMap.noPosition');
    const labels = useMemo(() => ({
        aria: t('admin.fleetMap.mapAria', {count: located.length}),
        uav: (u: FleetUav) => `${u.model} · ${u.serialNumber} — ${displayLabel(u.status)}`,
        station: (s: FleetStation) => t('admin.fleetMap.stationTooltip', {name: s.name, count: s.uavCount}),
    }), [t, located.length]);

    return <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
            <StatusChip active={status === null} onClick={() => setStatus(null)} label={t('admin.fleetMap.all')} count={all.length}/>
            {uavStatuses.map(s => <StatusChip key={s} active={status === s} onClick={() => setStatus(status === s ? null : s)}
                                              label={displayLabel(s)} count={counts[s] ?? 0} color={uavStatusColor[s]}/>)}
            <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching}
                        className="inline-flex h-9 items-center gap-1.5 border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    <RefreshCw size={14} className={cn(query.isFetching && 'animate-spin')} aria-hidden="true"/>{t('admin.fleetMap.refresh')}
                </button>
                <Link href="/operations/uavs"
                      className="inline-flex h-9 items-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:opacity-90">
                    {t('admin.fleetMap.manage')}<ExternalLink size={14} aria-hidden="true"/>
                </Link>
            </div>
        </div>

        <p className="flex items-start gap-2 border-l-[3px] border-l-blue-600 bg-blue-50/60 px-3 py-2 text-xs text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true"/>{t('admin.fleetMap.positionNote')}
        </p>

        <QueryState query={query}>{query.data && <>
            <div className="grid gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 lg:grid-cols-[320px_minmax(0,1fr)]">
                <section className="flex max-h-[560px] flex-col border border-slate-200 bg-white" aria-label={t('admin.fleetMap.listLabel')}>
                    <label className="relative block border-b border-slate-100 p-3">
                        <span className="sr-only">{t('admin.fleetMap.search')}</span>
                        <Search size={15} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true"/>
                        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.fleetMap.search')}
                               className="h-9 w-full border border-slate-200 pl-9 pr-3 text-[13px] focus:border-primary focus:outline-none"/>
                    </label>
                    <ul className="m-0 flex-1 list-none divide-y divide-slate-100 overflow-y-auto p-0">
                        {visible.length ? [...located, ...unlocated].map(u => <li key={u.id}>
                            <button type="button" onClick={() => setSelectedId(u.id)} aria-pressed={u.id === selectedId}
                                    className={cn('flex w-full items-start gap-3 border-l-[3px] px-3 py-2.5 text-left hover:bg-slate-50',
                                        u.id === selectedId ? 'border-l-primary bg-[#fdf2f2]' : 'border-l-transparent')}>
                                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{background: uavStatusColor[u.status]}} aria-hidden="true"/>
                                <span className="min-w-0 flex-1">
                                    <strong className="block truncate text-[13px] text-slate-900">{u.model}</strong>
                                    <small className="block truncate font-mono text-[11px] text-slate-500">{u.serialNumber}</small>
                                    <small className={cn('mt-0.5 flex items-center gap-1 text-[11.5px]', u.positionSource === 'NONE' ? 'text-amber-700' : 'text-slate-500')}>
                                        {u.positionSource === 'MISSION' || u.positionSource === 'TELEMETRY' ? <Navigation size={11} aria-hidden="true"/> : <MapPin size={11} aria-hidden="true"/>}
                                        <span className="truncate">{where(u)}</span>
                                    </small>
                                </span>
                                <span className="shrink-0 text-[11px] font-semibold text-slate-500">{displayLabel(u.status)}</span>
                            </button>
                        </li>) : <li className="p-6 text-center text-[13px] text-slate-500">{t('admin.fleetMap.emptyFilter')}</li>}
                    </ul>
                    <footer className="border-t border-slate-100 px-3 py-2 text-[11.5px] text-slate-500">
                        {t('admin.fleetMap.summary', {located: located.length, total: visible.length})}
                    </footer>
                </section>
                <section className="relative min-h-[420px] border border-slate-200 bg-white lg:h-[560px]">
                    <FleetMap uavs={visible} stations={query.data.stations} selectedId={selectedId} onSelect={setSelectedId} labels={labels}/>
                    <ul className="absolute bottom-3 left-3 z-[400] m-0 flex list-none flex-wrap gap-x-3 gap-y-1 border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-600">
                        {uavStatuses.map(s => <li key={s} className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{background: uavStatusColor[s]}} aria-hidden="true"/>{displayLabel(s)}</li>)}
                        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 border-2 border-primary bg-white" aria-hidden="true"/>
                            {t('admin.fleetMap.station')}</li>
                    </ul>
                </section>
            </div>
            {selected && <UavDetail uav={selected} where={where(selected)} onClose={() => setSelectedId(null)}
                                    formatDate={value => value ? formatDate(value, {dateStyle: 'short', timeStyle: 'short'}) : '—'}/>}
            <p className="text-right text-[11px] text-slate-400">
                {t('admin.fleetMap.updatedAt', {time: formatDate(query.data.generatedAt, {timeStyle: 'medium'})})}
            </p>
        </>}</QueryState>
    </div>;
}

function StatusChip({active, onClick, label, count, color}: {
    active: boolean; onClick: () => void; label: string; count: number; color?: string
}) {
    return <button type="button" onClick={onClick} aria-pressed={active}
                   className={cn('inline-flex h-9 items-center gap-2 border px-3 text-[13px] font-medium',
                       active ? 'border-primary bg-[#fdf2f2] text-primary' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{background: color}} aria-hidden="true"/>}
        {label}<span className="text-xs font-bold">{count}</span>
    </button>;
}

function UavDetail({uav, where, onClose, formatDate}: {
    uav: FleetUav; where: string; onClose: () => void; formatDate: (value?: string | null) => string
}) {
    const {t} = useI18n();
    const [page, setPage] = useState(0);
    const history = useUavHistory(uav.id, page);
    const fields: [string, React.ReactNode][] = [
        [t('admin.fleetMap.field.serial'), <span key="s" className="font-mono">{uav.serialNumber}</span>],
        [t('admin.fleetMap.field.manufacturer'), uav.manufacturer || '—'],
        [t('admin.fleetMap.field.status'), <span key="st" className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{background: uavStatusColor[uav.status]}} aria-hidden="true"/>{displayLabel(uav.status)}</span>],
        [t('admin.fleetMap.field.station'), uav.stationName || t('admin.fleetMap.noStation')],
        [t('admin.fleetMap.field.position'), where],
        [t('admin.fleetMap.field.lastMaintenance'), formatDate(uav.lastMaintenanceAt)],
    ];
    return <section className="border border-slate-200 bg-white" aria-labelledby="fleet-uav-title">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 id="fleet-uav-title" className="text-[15px] font-bold text-slate-900">{uav.model}</h2>
            <div className="flex items-center gap-2">
                <Link href="/operations/uavs" className="text-xs font-semibold text-primary hover:underline">{t('admin.fleetMap.editInOperations')}</Link>
                <button type="button" onClick={onClose} aria-label={t('admin.fleetMap.closeDetail')}
                        className="p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16}/></button>
            </div>
        </header>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
                <dl className="m-0 grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
                    {fields.map(([label, value]) => <div key={label} className="contents">
                        <dt className="text-slate-500">{label}</dt><dd className="m-0 text-slate-900">{value}</dd></div>)}
                </dl>
                <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">{t('admin.fleetMap.activeMission')}</h3>
                {uav.activeMission ? <div className="border-l-[3px] border-l-primary bg-slate-50 px-3 py-2 text-[13px]">
                    <Link href={`/operations/missions/${uav.activeMission.id}`} className="font-mono font-semibold text-primary hover:underline">
                        {uav.activeMission.code}</Link>
                    <span className="ml-2 text-xs text-slate-500">{displayLabel(uav.activeMission.status)}</span>
                    <p className="m-0 mt-1 text-slate-800">{uav.activeMission.title}</p>
                    <p className="m-0 mt-0.5 text-xs text-slate-500">
                        {[uav.activeMission.locationName, formatDate(uav.activeMission.startTime)].filter(Boolean).join(' · ')}</p>
                </div> : <p className="m-0 text-[13px] text-slate-500">{t('admin.fleetMap.noActiveMission')}</p>}
            </div>
            <div className="p-4">
                <h3 className="mb-2 mt-0 text-xs font-bold uppercase tracking-wide text-slate-500">{t('admin.fleetMap.history')}</h3>
                <QueryState query={history}>{history.data?.content.length ? <>
                    <ol className="m-0 list-none divide-y divide-slate-100 p-0">
                        {history.data.content.map(item => <li key={item.id} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2 text-[13px]">
                            <time dateTime={item.createdAt} className="text-xs text-slate-500">{formatDate(item.createdAt)}</time>
                            <div className="min-w-0">
                                <span className="font-semibold text-slate-900">{displayLabel(item.fromStatus)} → {displayLabel(item.toStatus)}</span>
                                {item.reason && <p className="m-0 mt-0.5 text-slate-600">{item.reason}</p>}
                                {item.changedBy && <p className="m-0 text-xs text-slate-400">{t('admin.fleetMap.changedBy', {name: item.changedBy})}</p>}
                            </div>
                        </li>)}
                    </ol>
                    {history.data.totalPages > 1 &&
                        <Pagination page={page} totalPages={history.data.totalPages} total={history.data.totalElements} onChange={setPage}/>}
                </> : <p className="m-0 text-[13px] text-slate-500">{t('admin.fleetMap.noHistory')}</p>}</QueryState>
            </div>
        </div>
    </section>;
}
