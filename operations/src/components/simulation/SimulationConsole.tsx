'use client';

import dynamic from 'next/dynamic';
import React, {useMemo, useState} from 'react';
import {Radio, ScrollText} from 'lucide-react';
import {Button, Card, CardContent, CardHeader, CardTitle} from '@/components/ui';
import type {DrawMode} from '@/components/simulation/SimulationMap';
import {SimulationRunHistoryCard} from '@/components/simulation/SimulationRunHistoryCard';
import {type SimulationParams, SimulationSetupCard} from '@/components/simulation/SimulationSetupCard';
import {SimulationTargetCard} from '@/components/simulation/SimulationTargetCard';
import {SimulationTelemetryHud} from '@/components/simulation/SimulationTelemetryHud';
import {UavModelViewer} from '@/components/visuals/UavModelViewer';
import {useAirspaceZones} from '@/hooks/airspace/useAirspace';
import {useMissions} from '@/hooks/mission/useOperationsMissions';
import {useSimulationMutations, useSimulationRuns, useSimulations} from '@/hooks/simulation/useSimulation';
import {useUavs} from '@/hooks/uav/useUavs';
import {cn} from '@/lib/utils';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import type {LatLng, SimCommand, SimEventLevel, SimulationState, SurveyPlan} from '@/types/simulation/simulation.types';

const SimulationMap = dynamic(() => import('@/components/simulation/SimulationMap').then(m => m.SimulationMap), {ssr: false});

const EVENT_LEVEL_TONE: Record<SimEventLevel, string> = {
    INFO: 'text-slate-600',
    WARNING: 'text-amber-700',
    CRITICAL: 'text-primary font-semibold',
};

const DEFAULTS: SimulationParams = {
    altitudeMeters: 50,
    cruiseSpeedMs: 8,
    packetLossPct: 0,
    latencyMs: 150,
    batteryPct: 100,
    sideOverlapPercent: 65,
    windSpeedMs: 3.5,
    windDirectionDeg: 120,
    timeScale: 1,
};

function errorText(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Console for simulated flights & digital mission rehearsals: plan a route or a survey area, overlay active
 * civil airspace & NOTAM zones, tune wind vectors & time scale, inject RTK/battery faults live, and audit
 * persisted rehearsal history.
 */
export function SimulationConsole() {
    const {t, formatNumber, formatDate} = useI18n();
    const {can, permissionsReady} = useAuth();
    const canFly = can('UAV_UPDATE');
    const canViewMissions = permissionsReady && (can('MISSION_VIEW') || can('MISSION_VIEW_ALL'));

    const uavs = useUavs(0);
    const sims = useSimulations();
    const runs = useSimulationRuns();
    const airspace = useAirspaceZones(true);
    const {missions} = useMissions(undefined, canViewMissions);
    const {start, rehearseMission, command, stop, surveyPlan} = useSimulationMutations();

    const fleet = useMemo(() => uavs.data?.content ?? [], [uavs.data]);
    const [picked, setPicked] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        const raw = new URLSearchParams(window.location.search).get('uavId');
        const parsed = raw ? Number(raw) : NaN;
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
    });
    const [selectedMissionId, setSelectedMissionId] = useState<number | ''>('');

    const uavId = picked ?? sims.data?.[0]?.uavId ?? fleet[0]?.id ?? null;
    const selectedUav = fleet.find(u => u.id === uavId) ?? null;
    const active: SimulationState | null = sims.data?.find(s => s.uavId === uavId) ?? null;

    const [drawMode, setDrawMode] = useState<DrawMode>('waypoints');
    const [route, setRoute] = useState<LatLng[]>([]);
    const [area, setArea] = useState<LatLng[]>([]);
    const [sweep, setSweep] = useState<SurveyPlan | null>(null);
    const [params, setParams] = useState<SimulationParams>(DEFAULTS);

    const plannedRoute = drawMode === 'area' ? sweep?.waypoints ?? [] : route;
    const num = (v: number, digits = 0) => formatNumber(v, {maximumFractionDigits: digits, minimumFractionDigits: digits});

    const pick = (p: LatLng) => {
        if (active) return;
        if (drawMode === 'waypoints') setRoute(r => [...r, p]);
        if (drawMode === 'area') {
            setArea(a => [...a, p]);
            setSweep(null);
        }
    };

    const generateSweep = () => surveyPlan.mutate(
        {
            vertices: area,
            altitudeMeters: params.altitudeMeters,
            sideOverlapPercent: params.sideOverlapPercent,
            cruiseSpeedMs: params.cruiseSpeedMs,
        },
        {onSuccess: setSweep, onError: e => toast.error(errorText(e, t('simulation.failed')))},
    );

    const launch = () => {
        if (uavId == null) return;
        start.mutate({
            uavId,
            waypoints: plannedRoute,
            altitudeMeters: params.altitudeMeters,
            cruiseSpeedMs: params.cruiseSpeedMs,
            packetLossPct: params.packetLossPct,
            latencyMs: params.latencyMs,
            batteryPct: params.batteryPct,
            windSpeedMs: params.windSpeedMs,
            windDirectionDeg: params.windDirectionDeg,
            timeScale: params.timeScale,
        }, {
            onSuccess: () => toast.success(t('simulation.started')),
            onError: e => toast.error(errorText(e, t('simulation.failed'))),
        });
    };

    const launchMissionRehearsal = () => {
        if (selectedMissionId === '') return;
        rehearseMission.mutate({
            missionId: selectedMissionId,
            windSpeedMs: params.windSpeedMs,
            windDirectionDeg: params.windDirectionDeg,
            timeScale: params.timeScale,
        }, {
            onSuccess: started => {
                setPicked(started.uavId);
                toast.success(t('simulation.rehearseStarted', {code: started.missionCode ?? `#${selectedMissionId}`}));
            },
            onError: e => toast.error(errorText(e, t('simulation.failed'))),
        });
    };

    const send = (c: SimCommand) => active && command.mutate({uavId: active.uavId, command: c}, {
        onError: e => toast.error(errorText(e, t('simulation.failed'))),
    });

    const end = () => active && stop.mutate(active.uavId, {
        onError: e => toast.error(errorText(e, t('simulation.failed'))),
    });

    const handleUndoPoint = () => drawMode === 'area' ? (setArea(a => a.slice(0, -1)), setSweep(null)) : setRoute(r => r.slice(0, -1));
    const handleClearPoints = () => drawMode === 'area' ? (setArea([]), setSweep(null)) : setRoute([]);

    const busy = start.isPending || rehearseMission.isPending || command.isPending || stop.isPending;
    const airspaceZones = airspace.data ?? [];

    return (
        <div className="space-y-4">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">{t('simulation.title')}</h1>
                    <p className="m-0 mt-1 text-xs text-slate-500">{t('simulation.subtitle')}</p>
                </div>
                {!!sims.data?.length && (
                    <div className="flex flex-wrap gap-1.5" aria-label={t('simulation.running')}>
                        {sims.data.map(s => (
                            <Button
                                key={s.uavId}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setPicked(s.uavId)}
                                leftIcon={<Radio size={12} aria-hidden="true"/>}
                                className={cn(
                                    'h-7 rounded-badge px-2.5 text-[11px] font-bold',
                                    s.uavId === uavId
                                        ? 'border-primary bg-uav-red-light text-primary hover:bg-uav-red-light'
                                        : 'bg-card text-slate-600',
                                )}
                            >
                                {s.uavCode}{s.missionCode ? ` · ${s.missionCode}` : ''}
                            </Button>
                        ))}
                    </div>
                )}
            </header>

            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <SimulationTargetCard
                        fleet={fleet}
                        isLoadingUavs={uavs.isLoading}
                        uavId={uavId}
                        onSelectUav={setPicked}
                        canViewMissions={canViewMissions}
                        missions={missions}
                        selectedMissionId={selectedMissionId}
                        onSelectMission={setSelectedMissionId}
                        onRehearseMission={launchMissionRehearsal}
                        canFly={canFly}
                        busy={busy}
                    />

                    {active ? (
                        <SimulationTelemetryHud
                            state={active}
                            busy={busy}
                            canFly={canFly}
                            onCommand={send}
                            onToggleGpsFault={() => send('SIMULATE_GPS_DEGRADE')}
                            onInjectBatteryDrop={() => send('SIMULATE_BATTERY_DROP')}
                            onStop={end}
                            num={num}
                        />
                    ) : (
                        <SimulationSetupCard
                            uavId={uavId}
                            canFly={canFly}
                            busy={busy}
                            isGeneratingSweep={surveyPlan.isPending}
                            drawMode={drawMode}
                            onChangeDrawMode={setDrawMode}
                            routeCount={route.length}
                            areaCount={area.length}
                            plannedRouteCount={plannedRoute.length}
                            sweep={sweep}
                            onUndoPoint={handleUndoPoint}
                            onClearPoints={handleClearPoints}
                            onGenerateSweep={generateSweep}
                            params={params}
                            onChangeParams={setParams}
                            onClearSweep={() => setSweep(null)}
                            onLaunch={launch}
                            num={num}
                        />
                    )}
                </aside>

                <div className="space-y-4">
                    <div className="h-[560px]">
                        <SimulationMap
                            state={active}
                            draftRoute={active ? [] : plannedRoute}
                            draftArea={active ? [] : area}
                            drawMode={active ? 'none' : drawMode}
                            airspaceZones={airspaceZones}
                            airspaceBadgeLabel={airspaceZones.length ? t('simulation.airspaceZonesOverlay', {count: airspaceZones.length}) : undefined}
                            onPick={pick}
                        />
                    </div>
                    <UavModelViewer
                        serial={selectedUav?.serialNumber ?? active?.uavCode ?? 'UAV-350-RTK'}
                        model={selectedUav?.model ?? 'Enterprise RTK Quadcopter'}
                        status={active && active.mode !== 'LANDED' ? 'IN_USE' : (selectedUav?.status ?? 'AVAILABLE')}
                    />
                    {active && (
                        <Card>
                            <CardHeader className="px-4 py-2.5">
                                <CardTitle className="flex items-center gap-2 text-xs font-bold text-slate-900">
                                    <ScrollText size={15} className="text-primary" aria-hidden="true"/>
                                    {t('simulation.events')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-2.5">
                                <ol className="m-0 max-h-48 list-none space-y-1 overflow-y-auto p-0 text-xs">
                                    {active.events.map((e, i) => (
                                        <li key={`${e.at}-${i}`} className="flex gap-2">
                                            <time className="shrink-0 tabular-nums text-slate-400">{e.at.slice(11, 19)}</time>
                                            <span className={EVENT_LEVEL_TONE[e.level]}>{e.message}</span>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <SimulationRunHistoryCard runs={runs.data ?? []} num={num} formatDate={formatDate}/>

            <p className="m-0 text-[11px] text-slate-400">{t('simulation.disclaimer')}</p>
        </div>
    );
}
