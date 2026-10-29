'use client';

import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {LifeBuoy, RotateCcw, Send} from 'lucide-react';
import {ErrorBoundary, Spinner} from '@/components/ui';
import {AiViewfinder} from '@/features/sar/components/AiViewfinder';
import {SarTacticalMap} from '@/features/sar/components/SarTacticalMap';
import {UavTelemetryHud} from '@/features/sar/components/UavTelemetryHud';
import {Kv260EdgeStatusCard} from '@/features/sar/components/Kv260EdgeStatusCard';
import {sarKeys, sarService} from '@/lib/api/services';
import {TELEMETRY_POLL_MS, telemetryService} from '@/lib/api/services';
import type {AiDetection, SarCockpitMission, SarDispatchResult} from '@/features/sar/types/sar.types';
import {useAuth} from '@/contexts/AuthContext';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {cn} from '@/lib/utils';

const DETECTION_POLL_MS = 10000;

const sarStatusTone: Record<string, string> = {
    SEARCHING: 'bg-uav-blue-light text-uav-blue border-blue-200',
    SUSPENDED: 'bg-uav-amber-light text-amber-800 border-amber-200',
    TARGET_LOCATED: 'bg-uav-red-light text-primary border-rose-200',
    RESCUED: 'bg-uav-blue-light text-uav-blue border-blue-200',
};

export function SarCockpitPanel() {
    const {t} = useI18n();
    const {can} = useAuth();
    const missionsQuery = useQuery({
        queryKey: sarKeys.missions,
        queryFn: ({signal}) => sarService.missions(false, signal),
    });
    const missions = useMemo(() => missionsQuery.data ?? [], [missionsQuery.data]);
    const [chosenId, setChosenId] = useState<number | null>(null);
    const mission = missions.find(m => m.missionId === chosenId) ?? missions[0] ?? null;

    if (missionsQuery.isPending) return <div className="flex min-h-[320px] items-center justify-center"><Spinner label={t('opsShared.sar.cockpit.loading')}/></div>;
    if (missionsQuery.isError) return <p role="alert" className="m-0 rounded-panel border border-l-4 border-rose-200 border-l-primary bg-uav-red-light p-4 text-sm text-primary">
        {t('opsShared.sar.cockpit.loadError')}</p>;
    if (!mission) return <div className="rounded-panel border border-border bg-card p-8 text-center">
        <LifeBuoy size={28} className="mx-auto text-slate-400" aria-hidden="true"/>
        <h2 className="mt-3 text-base font-bold text-slate-900">{t('opsShared.sar.cockpit.emptyTitle')}</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{t('opsShared.sar.cockpit.emptyBody')}</p>
        <Link href="/operations/dispatch/missions" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
            {t('opsShared.sar.cockpit.openDispatch')}</Link>
    </div>;

    return <MissionCockpit key={mission.missionId} mission={mission} missions={missions} onChoose={setChosenId}
                           canOperate={can('MISSION_STATUS_UPDATE') || can('MISSION_VIEW_ALL')}/>;
}

function MissionCockpit({mission, missions, onChoose, canOperate}: {
    mission: SarCockpitMission; missions: SarCockpitMission[]; onChoose: (id: number) => void; canOperate: boolean;
}) {
    const {t, formatDate} = useI18n();
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const detectionsQuery = useQuery({
        queryKey: sarKeys.detections(mission.missionId),
        queryFn: ({signal}) => sarService.detections(mission.missionId, signal),
        refetchInterval: DETECTION_POLL_MS,
    });
    const tasksQuery = useQuery({
        queryKey: sarKeys.tasks(mission.missionId),
        queryFn: ({signal}) => sarService.tasks(mission.missionId, signal),
        refetchInterval: DETECTION_POLL_MS,
    });
    const telemetryQuery = useQuery({
        queryKey: sarKeys.telemetry(mission.missionId),
        queryFn: ({signal}) => telemetryService.forMission(mission.missionId, signal).then(v => v ?? null),
        enabled: mission.uavId != null,
        refetchInterval: TELEMETRY_POLL_MS,
    });
    const detections = useMemo(() => detectionsQuery.data ?? [], [detectionsQuery.data]);
    const selected = detections.find(d => d.id === selectedId) ?? null;
    const telemetry = telemetryQuery.data ?? null;
    const latestTask = useMemo(() => [...(tasksQuery.data ?? [])]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null, [tasksQuery.data]);

    const refreshMissions = () => void queryClient.invalidateQueries({queryKey: sarKeys.missions});
    const report = (result: SarDispatchResult, queuedKey: string, unconfiguredKey: string) => {
        if (result.status === 'QUEUED') toast.success(t(queuedKey, {code: mission.missionCode}));
        else toast.warning(t(unconfiguredKey, {event: result.eventType}));
        refreshMissions();
    };
    const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : t('opsShared.sar.cockpit.actionFailed'));

    const dispatch = useMutation({
        mutationFn: (target: AiDetection) => sarService.dispatchRescue(mission.missionId, {
            detectionId: target.id,
            label: target.label,
            confidence: target.confidence,
            latitude: target.latitude,
            longitude: target.longitude,
            coordinates: `${target.latitude}, ${target.longitude}`,
            verified: target.verified,
        }),
        onSuccess: r => report(r, 'opsShared.sar.cockpit.dispatchQueued', 'opsShared.sar.cockpit.dispatchUnconfigured'),
        onError: fail,
    });
    const rth = useMutation({
        mutationFn: () => sarService.returnToHome(mission.missionId),
        onSuccess: r => report(r, 'opsShared.sar.cockpit.rthQueued', 'opsShared.sar.cockpit.rthUnconfigured'),
        onError: fail,
    });

    const targetReady = selected?.latitude != null && selected.longitude != null;
    const onDispatch = () => {
        if (!selected || !targetReady) {
            toast.info(t('opsShared.sar.cockpit.selectTarget'));
            return;
        }
        dispatch.mutate(selected);
    };
    const onRth = () => {
        if (!window.confirm(t('opsShared.sar.cockpit.rthConfirm', {uav: mission.uavSerialNumber ?? ''}))) return;
        rth.mutate();
    };

    return <div className="space-y-5">
        <div className="flex flex-col gap-4 rounded-panel border border-l-4 border-border border-l-primary bg-card p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    {(mission.priority === 'HIGH' || mission.priority === 'URGENT') &&
                        <span className="flex items-center gap-1.5 rounded-badge border border-rose-200 bg-uav-red-light px-2.5 py-0.5 text-[11px] font-bold text-primary">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true"/>{t('opsShared.sar.cockpit.urgent')}</span>}
                    <span className={cn('rounded-badge border px-2.5 py-0.5 text-[11px] font-bold', sarStatusTone[mission.sarStatus])}>
                        {t(`opsShared.sar.status.${mission.sarStatus}`)}</span>
                    {missions.length > 1 ? <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="sr-only">{t('opsShared.sar.cockpit.chooseMission')}</span>
                        <select value={mission.missionId} onChange={e => onChoose(Number(e.target.value))}
                                className="h-7 rounded-control border border-border bg-card px-2 text-xs font-semibold tabular-nums text-slate-800">
                            {missions.map(m => <option key={m.missionId} value={m.missionId}>{m.missionCode} · {m.missionTitle}</option>)}
                        </select>
                    </label> : <span className="text-xs font-semibold tabular-nums text-slate-500">{mission.missionCode}</span>}
                </div>
                <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900">{mission.missionTitle}</h2>
                <p className="mt-1 text-xs text-slate-500">
                    {t('opsShared.sar.cockpit.station')} <strong className="text-slate-800">{mission.stationName ?? '—'}</strong>
                    {' · '}{t('opsShared.sar.cockpit.pilot')} <strong className="text-slate-800">{mission.operatorName ?? t('opsShared.sar.cockpit.unassigned')}</strong>
                    {' · '}{t('opsShared.sar.cockpit.flightTime')} <FlightClock start={mission.startTime}/>
                    {mission.victimCountEstimated != null && <>{' · '}{t('opsShared.sar.cockpit.victims', {count: mission.victimCountEstimated})}</>}
                </p>
                {mission.updatedAt && <p className="mt-0.5 text-[11px] text-slate-400">{t('opsShared.sar.cockpit.updated', {at: formatDate(mission.updatedAt, {dateStyle: 'short', timeStyle: 'short'})})}</p>}
            </div>
            {canOperate && <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={onDispatch} disabled={dispatch.isPending}
                        title={targetReady ? undefined : t('opsShared.sar.cockpit.selectTarget')}
                        className={cn('flex min-h-11 items-center gap-2 rounded-control px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-60',
                            targetReady ? 'bg-uav-blue hover:bg-uav-blue-hover' : 'bg-slate-400')}>
                    <Send size={15} aria-hidden="true"/>{t('opsShared.sar.cockpit.dispatchButton')}</button>
                <button type="button" onClick={onRth} disabled={rth.isPending || mission.uavId == null}
                        className="flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 py-2.5 text-xs font-bold text-white transition hover:bg-primary-hover disabled:opacity-60">
                    <RotateCcw size={15} aria-hidden="true"/>{t('opsShared.sar.cockpit.rthButton')}</button>
            </div>}
        </div>

        <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 xl:grid-cols-2">
            <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.cameraError')}>
                <AiViewfinder missionId={mission.missionId} detections={detections} task={latestTask}
                              loading={detectionsQuery.isPending} failed={detectionsQuery.isError}
                              selectedId={selectedId} onSelect={setSelectedId} canVerify={canOperate}/>
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.mapError')}>
                <SarTacticalMap mission={mission} detections={detections} telemetry={telemetry}
                                selectedId={selectedId} onSelect={setSelectedId}/>
            </ErrorBoundary>
        </div>

        <div className="grid grid-cols-1 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 xl:grid-cols-2">
            <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.hudError')}>
                <UavTelemetryHud mission={mission} telemetry={telemetry} loading={telemetryQuery.isPending && mission.uavId != null}/>
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.kv260Error')}>
                <Kv260EdgeStatusCard task={latestTask} loading={tasksQuery.isPending}/>
            </ErrorBoundary>
        </div>
    </div>;
}

/** Elapsed time since the mission started, ticking once a second. */
function FlightClock({start}: { start: string | null }) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!start) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [start]);
    const begin = start ? Date.parse(start) : NaN;
    if (!Number.isFinite(begin) || begin > now) return <strong className="tabular-nums text-slate-800">—</strong>;
    const s = Math.floor((now - begin) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return <strong className="tabular-nums font-bold text-slate-800">{pad(Math.floor(s / 3600))}:{pad(Math.floor(s / 60) % 60)}:{pad(s % 60)}</strong>;
}
