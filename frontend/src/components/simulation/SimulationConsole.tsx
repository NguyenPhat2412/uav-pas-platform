'use client';

import dynamic from 'next/dynamic';
import React, {useMemo, useState} from 'react';
import {
    Battery, Compass, Eraser, Gauge, Home, MapPin, Mountain, Pause, Pentagon, Play, PlaneLanding, Radio,
    Route, ScrollText, Square, Timer, Undo2, Wand2,
} from 'lucide-react';
import {useUavs} from '@/hooks/uav/useUavs';
import {useSimulationMutations, useSimulations} from '@/hooks/simulation/useSimulation';
import {useAuth} from '@/providers/AuthContext';
import {useI18n} from '@/providers/I18nContext';
import {toast} from '@/providers/ToastContext';
import {cn} from '@/lib/utils';
import type {DrawMode} from '@/components/simulation/SimulationMap';
import type {LatLng, SimCommand, SimFlightMode, SimulationState, SurveyPlan} from '@/types/simulation/simulation.types';

const SimulationMap = dynamic(() => import('@/components/simulation/SimulationMap').then(m => m.SimulationMap), {ssr: false});

const modeTone: Record<SimFlightMode, string> = {
    TAKEOFF: 'bg-uav-blue-light text-uav-blue border-blue-200',
    MISSION: 'bg-uav-blue-light text-uav-blue border-blue-200',
    HOLD: 'bg-uav-amber-light text-amber-800 border-amber-200',
    RETURN_TO_HOME: 'bg-uav-amber-light text-amber-800 border-amber-200',
    LANDING: 'bg-uav-amber-light text-amber-800 border-amber-200',
    LANDED: 'bg-slate-100 text-slate-600 border-slate-200',
};
const levelTone = {INFO: 'text-slate-600', WARNING: 'text-amber-700', CRITICAL: 'text-primary font-semibold'};

/** Flight parameters an operator can tune before starting; units are in the labels. */
const DEFAULTS = {altitudeMeters: 50, cruiseSpeedMs: 8, packetLossPct: 0, latencyMs: 150, batteryPct: 100, sideOverlapPercent: 65};
type Params = typeof DEFAULTS;

function errorText(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Console for simulated flights: plan a route or a survey area, start a virtual UAV whose telemetry goes
 * through the same ingest path as a real gateway, then watch it and send PAUSE / RESUME / RTH / LAND.
 */
export function SimulationConsole() {
    const {t, formatNumber} = useI18n();
    const {can} = useAuth();
    const canFly = can('UAV_UPDATE');
    const uavs = useUavs(0);
    const sims = useSimulations();
    const {start, command, stop, surveyPlan} = useSimulationMutations();

    const fleet = useMemo(() => uavs.data?.content ?? [], [uavs.data]);
    const [picked, setPicked] = useState<number | null>(null);
    const uavId = picked ?? fleet[0]?.id ?? null;
    const active: SimulationState | null = sims.data?.find(s => s.uavId === uavId) ?? null;

    const [drawMode, setDrawMode] = useState<DrawMode>('waypoints');
    const [route, setRoute] = useState<LatLng[]>([]);
    const [area, setArea] = useState<LatLng[]>([]);
    const [sweep, setSweep] = useState<SurveyPlan | null>(null);
    const [params, setParams] = useState<Params>(DEFAULTS);

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
        {vertices: area, altitudeMeters: params.altitudeMeters, sideOverlapPercent: params.sideOverlapPercent, cruiseSpeedMs: params.cruiseSpeedMs},
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
        }, {
            onSuccess: () => toast.success(t('simulation.started')),
            onError: e => toast.error(errorText(e, t('simulation.failed'))),
        });
    };

    const send = (c: SimCommand) => active && command.mutate({uavId: active.uavId, command: c}, {
        onError: e => toast.error(errorText(e, t('simulation.failed'))),
    });

    const end = () => active && stop.mutate(active.uavId, {
        onError: e => toast.error(errorText(e, t('simulation.failed'))),
    });

    const busy = start.isPending || command.isPending || stop.isPending;

    return <div className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">{t('simulation.title')}</h1>
                <p className="m-0 mt-1 text-xs text-slate-500">{t('simulation.subtitle')}</p>
            </div>
            {!!sims.data?.length && <div className="flex flex-wrap gap-1.5" aria-label={t('simulation.running')}>
                {sims.data.map(s => <button key={s.uavId} type="button" onClick={() => setPicked(s.uavId)}
                    className={cn('flex items-center gap-1.5 rounded-badge border px-2.5 py-1 text-[11px] font-bold',
                        s.uavId === uavId ? 'border-primary bg-uav-red-light text-primary' : 'border-border bg-card text-slate-600')}>
                    <Radio size={12} aria-hidden="true"/>{s.uavCode}
                </button>)}
            </div>}
        </header>

        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4">
                <section className="rounded-panel border border-border bg-card p-4">
                    <label htmlFor="sim-uav" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">UAV</label>
                    <select id="sim-uav" value={uavId ?? ''} onChange={e => setPicked(Number(e.target.value))}
                            className="h-9 w-full rounded-control border border-border bg-white px-2 text-sm">
                        {fleet.map(u => <option key={u.id} value={u.id}>{u.serialNumber} · {u.model}</option>)}
                    </select>
                    {!uavs.isLoading && !fleet.length && <p className="m-0 mt-2 text-xs text-slate-500">{t('simulation.noUav')}</p>}
                </section>

                {active ? <LivePanel state={active} busy={busy} canFly={canFly} onCommand={send} onStop={end} num={num}/> :
                    <section className="space-y-4 rounded-panel border border-border bg-card p-4">
                        <div className="grid grid-cols-2 gap-1.5" role="tablist">
                            <ModeTab active={drawMode === 'waypoints'} onClick={() => setDrawMode('waypoints')} icon={<MapPin size={14}/>} label={t('simulation.route')}/>
                            <ModeTab active={drawMode === 'area'} onClick={() => setDrawMode('area')} icon={<Pentagon size={14}/>} label={t('simulation.area')}/>
                        </div>
                        <p className="m-0 text-xs text-slate-500">{t(drawMode === 'area' ? 'simulation.drawAreaHint' : 'simulation.drawRouteHint')}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <IconButton title={t('simulation.undo')} onClick={() => drawMode === 'area' ? (setArea(a => a.slice(0, -1)), setSweep(null)) : setRoute(r => r.slice(0, -1))}>
                                <Undo2 size={14}/></IconButton>
                            <IconButton title={t('simulation.clear')} onClick={() => drawMode === 'area' ? (setArea([]), setSweep(null)) : setRoute([])}>
                                <Eraser size={14}/></IconButton>
                            <span className="text-xs font-semibold tabular-nums text-slate-600">
                                {drawMode === 'area' ? t('simulation.vertices', {count: area.length}) : t('simulation.points', {count: route.length})}
                            </span>
                            {drawMode === 'area' && <button type="button" disabled={area.length < 3 || surveyPlan.isPending} onClick={generateSweep}
                                className="ml-auto flex items-center gap-1.5 rounded-control bg-uav-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-uav-blue-hover disabled:opacity-50">
                                <Wand2 size={14} aria-hidden="true"/>{t('simulation.generateSweep')}</button>}
                        </div>
                        {drawMode === 'area' && sweep && <p className="m-0 rounded-control bg-slate-50 px-3 py-2 text-xs tabular-nums text-slate-600">
                            {t('simulation.sweepInfo', {
                                count: sweep.waypoints.length, spacing: num(sweep.lineSpacingMeters),
                                length: num(sweep.lengthMeters / 1000, 2), minutes: num(sweep.estimatedMinutes, 1),
                            })}</p>}

                        <div className="grid grid-cols-2 gap-3">
                            <NumberField id="sim-alt" label={t('simulation.altitude')} value={params.altitudeMeters} min={10} max={120}
                                         onChange={v => setParams(p => ({...p, altitudeMeters: v}))}/>
                            <NumberField id="sim-speed" label={t('simulation.speed')} value={params.cruiseSpeedMs} min={2} max={20}
                                         onChange={v => setParams(p => ({...p, cruiseSpeedMs: v}))}/>
                            <NumberField id="sim-loss" label={t('simulation.loss')} value={params.packetLossPct} min={0} max={60}
                                         onChange={v => setParams(p => ({...p, packetLossPct: v}))}/>
                            <NumberField id="sim-latency" label={t('simulation.latency')} value={params.latencyMs} min={0} max={5000} step={50}
                                         onChange={v => setParams(p => ({...p, latencyMs: v}))}/>
                            <NumberField id="sim-battery" label={t('simulation.battery')} value={params.batteryPct} min={25} max={100}
                                         onChange={v => setParams(p => ({...p, batteryPct: v}))}/>
                            {drawMode === 'area' && <NumberField id="sim-overlap" label={t('simulation.overlap')} value={params.sideOverlapPercent} min={0} max={90}
                                         onChange={v => {
                                             setParams(p => ({...p, sideOverlapPercent: v}));
                                             setSweep(null);
                                         }}/>}
                        </div>

                        <button type="button" onClick={launch} disabled={!canFly || uavId == null || !plannedRoute.length || busy}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-control bg-primary text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-hover disabled:opacity-50">
                            <Play size={15} aria-hidden="true"/>{t('simulation.start')}
                        </button>
                        {!plannedRoute.length && <p className="m-0 text-center text-[11px] text-slate-400">{t('simulation.needRoute')}</p>}
                    </section>}
            </aside>

            <div className="space-y-4">
                <div className="h-[560px]">
                    <SimulationMap state={active} draftRoute={active ? [] : plannedRoute} draftArea={active ? [] : area}
                                   drawMode={active ? 'none' : drawMode} onPick={pick}/>
                </div>
                {active && <section className="rounded-panel border border-border bg-card p-4">
                    <h2 className="m-0 mb-2 flex items-center gap-2 text-xs font-bold text-slate-900">
                        <ScrollText size={15} className="text-primary" aria-hidden="true"/>{t('simulation.events')}</h2>
                    <ol className="m-0 max-h-48 list-none space-y-1 overflow-y-auto p-0 text-xs">
                        {active.events.map((e, i) => <li key={`${e.at}-${i}`} className="flex gap-2">
                            <time className="shrink-0 tabular-nums text-slate-400">{e.at.slice(11, 19)}</time>
                            <span className={levelTone[e.level]}>{e.message}</span>
                        </li>)}
                    </ol>
                </section>}
            </div>
        </div>
        <p className="m-0 text-[11px] text-slate-400">{t('simulation.disclaimer')}</p>
    </div>;
}

function LivePanel({state, busy, canFly, onCommand, onStop, num}: {
    state: SimulationState;
    busy: boolean;
    canFly: boolean;
    onCommand: (c: SimCommand) => void;
    onStop: () => void;
    num: (v: number, digits?: number) => string;
}) {
    const {t} = useI18n();
    const minutes = Math.floor(state.elapsedSeconds / 60);
    const seconds = Math.floor(state.elapsedSeconds % 60);
    const airborne = state.mode !== 'LANDED';
    const lowBattery = state.batteryPct <= 30;

    return <section className="space-y-4 rounded-panel border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
            <span className={cn('rounded-badge border px-2.5 py-0.5 text-[11px] font-bold', modeTone[state.mode])}>
                {t(`simulation.modes.${state.mode}`)}</span>
            <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-500">
                <Timer size={13} aria-hidden="true"/>{minutes}:{String(seconds).padStart(2, '0')}</span>
        </div>

        <dl className="m-0 grid grid-cols-3 gap-2">
            <Tile icon={<Mountain size={14}/>} label={t('simulation.hud.altitude')} value={`${num(state.altitudeMeters)} m`}/>
            <Tile icon={<Gauge size={14}/>} label={t('simulation.hud.speed')} value={`${num(state.groundSpeedMs, 1)} m/s`}/>
            <Tile icon={<Battery size={14}/>} label={t('simulation.hud.battery')} value={`${num(state.batteryPct)}%`} alert={lowBattery}/>
            <Tile icon={<Compass size={14}/>} label={t('simulation.hud.heading')} value={`${num(state.headingDeg)}°`}/>
            <Tile icon={<Route size={14}/>} label={t('simulation.hud.waypoint')} value={`${Math.min(state.nextWaypoint, state.waypointCount)}/${state.waypointCount}`}/>
            <Tile icon={<Home size={14}/>} label={t('simulation.hud.toHome')} value={`${num(state.distanceToHomeMeters)} m`}/>
        </dl>

        <div className="grid grid-cols-4 gap-1.5">
            {state.mode === 'HOLD'
                ? <CommandButton icon={<Play size={15}/>} label={t('simulation.resume')} disabled={!canFly || busy} onClick={() => onCommand('RESUME')}/>
                : <CommandButton icon={<Pause size={15}/>} label={t('simulation.pause')} disabled={!canFly || busy || !['MISSION', 'RETURN_TO_HOME'].includes(state.mode)} onClick={() => onCommand('PAUSE')}/>}
            <CommandButton icon={<Home size={15}/>} label={t('simulation.rth')} disabled={!canFly || busy || ['RETURN_TO_HOME', 'LANDING', 'LANDED'].includes(state.mode)} onClick={() => onCommand('RETURN_TO_HOME')}/>
            <CommandButton icon={<PlaneLanding size={15}/>} label={t('simulation.land')} disabled={!canFly || busy || !airborne || state.mode === 'LANDING'} onClick={() => onCommand('LAND')}/>
            <CommandButton icon={<Square size={14}/>} label={t('simulation.stop')} disabled={!canFly || busy} onClick={onStop} danger/>
        </div>

        <div>
            <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Radio size={13} aria-hidden="true"/>{t('simulation.link.title')}</h3>
            <dl className="m-0 grid grid-cols-3 gap-2">
                <Tile label={t('simulation.link.delivered')} value={`${state.link.delivered}/${state.link.sent}`}/>
                <Tile label={t('simulation.link.lost')} value={`${num(state.link.lossPct, 1)}%`} alert={state.link.lossPct > 10}/>
                <Tile label={t('simulation.link.latency')} value={`${num(state.link.averageLatencyMs)} ms`}/>
            </dl>
            <p className="m-0 mt-2 text-[11px] tabular-nums text-slate-400">
                {t('simulation.link.config', {loss: num(state.settings.packetLossPct), latency: num(state.settings.latencyMs), fence: num(state.settings.geofenceRadiusMeters)})}
            </p>
        </div>
    </section>;
}

function Tile({icon, label, value, alert}: { icon?: React.ReactNode; label: string; value: string; alert?: boolean }) {
    return <div className={cn('rounded-control border px-2.5 py-2', alert ? 'border-rose-200 bg-uav-red-light' : 'border-slate-100 bg-slate-50/70')}>
        <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {icon && <span aria-hidden="true">{icon}</span>}{label}</dt>
        <dd className={cn('m-0 mt-0.5 text-sm font-extrabold tabular-nums', alert ? 'text-primary' : 'text-slate-900')}>{value}</dd>
    </div>;
}

function CommandButton({icon, label, onClick, disabled, danger}: {
    icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
    return <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
                   className={cn('flex h-12 flex-col items-center justify-center gap-0.5 rounded-control border text-[10px] font-bold transition disabled:opacity-40',
                       danger ? 'border-rose-200 text-primary hover:bg-uav-red-light' : 'border-border text-slate-700 hover:bg-slate-50')}>
        <span aria-hidden="true">{icon}</span>{label}
    </button>;
}

function ModeTab({active, onClick, icon, label}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return <button type="button" role="tab" aria-selected={active} onClick={onClick}
                   className={cn('flex h-9 items-center justify-center gap-1.5 rounded-control border text-xs font-bold',
                       active ? 'border-primary bg-uav-red-light text-primary' : 'border-border text-slate-600 hover:bg-slate-50')}>
        <span aria-hidden="true">{icon}</span>{label}
    </button>;
}

function IconButton({title, onClick, children}: { title: string; onClick: () => void; children: React.ReactNode }) {
    return <button type="button" title={title} aria-label={title} onClick={onClick}
                   className="flex size-8 items-center justify-center rounded-control border border-border text-slate-600 hover:bg-slate-50">{children}</button>;
}

function NumberField({id, label, value, min, max, step = 1, onChange}: {
    id: string; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
    return <div>
        <label htmlFor={id} className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
        <input id={id} type="number" inputMode="decimal" value={value} min={min} max={max} step={step}
               onChange={e => {
                   const v = Number(e.target.value);
                   if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
               }}
               className="h-9 w-full rounded-control border border-border bg-white px-2 text-sm tabular-nums"/>
    </div>;
}
