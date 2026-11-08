'use client';

import Link from 'next/link';
import React from 'react';
import {
    AlertTriangle, Battery, Compass, Gauge, Home, Mountain, Pause, Play,
    PlaneLanding, Radio, Route, Satellite, ShieldAlert, Square, Timer, Wind, Zap,
} from 'lucide-react';
import {Badge, Button, Card, CardContent, CardHeader, StatusBadge} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {SimCommand, SimulationState} from '@/types/simulation/simulation.types';

export interface SimulationTelemetryHudProps {
    state: SimulationState;
    busy: boolean;
    canFly: boolean;
    onCommand: (command: SimCommand) => void;
    onToggleGpsFault: () => void;
    onInjectBatteryDrop: () => void;
    onStop: () => void;
    num: (value: number, digits?: number) => string;
}

export function SimulationTelemetryHud({
    state,
    busy,
    canFly,
    onCommand,
    onToggleGpsFault,
    onInjectBatteryDrop,
    onStop,
    num,
}: SimulationTelemetryHudProps) {
    const {t} = useI18n();
    const minutes = Math.floor(state.elapsedSeconds / 60);
    const seconds = Math.floor(state.elapsedSeconds % 60);
    const airborne = state.mode !== 'LANDED';
    const lowBattery = state.batteryPct <= 30;

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={state.mode} label={t(`simulation.modes.${state.mode}`)}/>
                    {state.missionCode && state.missionId != null && (
                        <Link href={`/operations/missions/${state.missionId}`} className="inline-flex no-underline">
                            <Badge
                                variant="outline"
                                className="border-slate-200 bg-slate-50 text-slate-700 hover:border-uav-blue hover:text-uav-blue"
                            >
                                {state.missionCode}
                            </Badge>
                        </Link>
                    )}
                </div>
                <span className="flex items-center gap-1 text-xs font-semibold tabular-nums text-slate-500">
                    <Timer size={13} aria-hidden="true"/>
                    {minutes}:{String(seconds).padStart(2, '0')}
                </span>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                <dl className="m-0 grid grid-cols-3 gap-2">
                    <TelemetryTile icon={<Mountain size={14}/>} label={t('simulation.hud.altitude')} value={`${num(state.altitudeMeters)} m`}/>
                    <TelemetryTile icon={<Gauge size={14}/>} label={t('simulation.hud.speed')} value={`${num(state.groundSpeedMs, 1)} m/s`}/>
                    <TelemetryTile icon={<Battery size={14}/>} label={t('simulation.hud.battery')} value={`${num(state.batteryPct)}%`} alert={lowBattery}/>
                    <TelemetryTile icon={<Compass size={14}/>} label={t('simulation.hud.heading')} value={`${num(state.headingDeg)}°`}/>
                    <TelemetryTile icon={<Route size={14}/>} label={t('simulation.hud.waypoint')} value={`${Math.min(state.nextWaypoint, state.waypointCount)}/${state.waypointCount}`}/>
                    <TelemetryTile icon={<Home size={14}/>} label={t('simulation.hud.toHome')} value={`${num(state.distanceToHomeMeters)} m`}/>
                    <TelemetryTile icon={<Satellite size={14}/>} label={t('simulation.hud.rtk')} value={`${state.rtkStatus} (${state.satelliteCount})`} alert={state.gpsDegraded}/>
                    <TelemetryTile icon={<ShieldAlert size={14}/>} label={t('simulation.hud.airspace')} value={String(state.airspaceBreaches)} alert={state.airspaceBreaches > 0}/>
                    <TelemetryTile icon={<Wind size={14}/>} label={t('simulation.hud.wind')} value={`${num(state.settings.windSpeedMs, 1)} · ${num(state.settings.timeScale)}x`}/>
                </dl>

                <div className="grid grid-cols-4 gap-1.5">
                    {state.mode === 'HOLD' ? (
                        <CommandButton icon={<Play size={15}/>} label={t('simulation.resume')} disabled={!canFly || busy} onClick={() => onCommand('RESUME')}/>
                    ) : (
                        <CommandButton icon={<Pause size={15}/>} label={t('simulation.pause')} disabled={!canFly || busy || !['MISSION', 'RETURN_TO_HOME'].includes(state.mode)} onClick={() => onCommand('PAUSE')}/>
                    )}
                    <CommandButton icon={<Home size={15}/>} label={t('simulation.rth')} disabled={!canFly || busy || ['RETURN_TO_HOME', 'LANDING', 'LANDED'].includes(state.mode)} onClick={() => onCommand('RETURN_TO_HOME')}/>
                    <CommandButton icon={<PlaneLanding size={15}/>} label={t('simulation.land')} disabled={!canFly || busy || !airborne || state.mode === 'LANDING'} onClick={() => onCommand('LAND')}/>
                    <CommandButton icon={<Square size={14}/>} label={t('simulation.stop')} disabled={!canFly || busy} onClick={onStop} danger/>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <h3 className="m-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <AlertTriangle size={13} className="text-amber-600" aria-hidden="true"/>
                        {t('simulation.faultInjection')}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canFly || busy || !airborne}
                            onClick={onToggleGpsFault}
                            leftIcon={<Satellite size={13} aria-hidden="true"/>}
                            className={cn(
                                'h-8 px-2 text-[11px] font-bold',
                                state.gpsDegraded
                                    ? 'border-amber-300 bg-uav-amber-light text-amber-900 hover:bg-amber-100'
                                    : 'text-slate-700',
                            )}
                        >
                            {state.gpsDegraded ? t('simulation.faultGpsRestore') : t('simulation.faultGps')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canFly || busy || !airborne}
                            onClick={onInjectBatteryDrop}
                            leftIcon={<Zap size={13} aria-hidden="true"/>}
                            className="h-8 border-rose-200 px-2 text-[11px] font-bold text-primary hover:bg-uav-red-light"
                        >
                            {t('simulation.faultBattery')}
                        </Button>
                    </div>
                </div>

                <div>
                    <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Radio size={13} aria-hidden="true"/>
                        {t('simulation.link.title')}
                    </h3>
                    <dl className="m-0 grid grid-cols-3 gap-2">
                        <TelemetryTile label={t('simulation.link.delivered')} value={`${state.link.delivered}/${state.link.sent}`}/>
                        <TelemetryTile label={t('simulation.link.lost')} value={`${num(state.link.lossPct, 1)}%`} alert={state.link.lossPct > 10}/>
                        <TelemetryTile label={t('simulation.link.latency')} value={`${num(state.link.averageLatencyMs)} ms`}/>
                    </dl>
                    <p className="m-0 mt-2 text-[11px] tabular-nums text-slate-400">
                        {t('simulation.link.config', {
                            loss: num(state.settings.packetLossPct),
                            latency: num(state.settings.latencyMs),
                            fence: num(state.settings.geofenceRadiusMeters),
                        })}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function TelemetryTile({icon, label, value, alert}: {icon?: React.ReactNode; label: string; value: string; alert?: boolean}) {
    return (
        <div className={cn('rounded-control border px-2.5 py-2', alert ? 'border-rose-200 bg-uav-red-light' : 'border-slate-100 bg-slate-50/70')}>
            <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {icon && <span aria-hidden="true">{icon}</span>}
                {label}
            </dt>
            <dd className={cn('m-0 mt-0.5 text-xs font-extrabold tabular-nums', alert ? 'text-primary' : 'text-slate-900')}>
                {value}
            </dd>
        </div>
    );
}

function CommandButton({icon, label, onClick, disabled, danger}: {
    icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
    return (
        <Button
            type="button"
            size="sm"
            variant={danger ? 'danger' : 'outline'}
            title={label}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className="h-12 flex-col gap-0.5 px-1.5 text-[10px] font-bold"
        >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
        </Button>
    );
}
