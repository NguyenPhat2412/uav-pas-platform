'use client';

import React from 'react';
import {Eraser, MapPin, Pentagon, Play, Undo2, Wand2} from 'lucide-react';
import {Alert, Button, Card, CardContent, FormField, Input} from '@/components/ui';
import {useI18n} from '@/providers/I18nContext';
import {cn} from '@/lib/utils';
import type {DrawMode} from '@/components/simulation/SimulationMap';
import type {SurveyPlan} from '@/types/simulation/simulation.types';

export interface SimulationParams {
    altitudeMeters: number;
    cruiseSpeedMs: number;
    packetLossPct: number;
    latencyMs: number;
    batteryPct: number;
    sideOverlapPercent: number;
    windSpeedMs: number;
    windDirectionDeg: number;
    timeScale: number;
}

const TIME_SCALES = [1, 2, 5] as const;

export interface SimulationSetupCardProps {
    uavId: number | null;
    canFly: boolean;
    busy: boolean;
    isGeneratingSweep: boolean;
    drawMode: DrawMode;
    onChangeDrawMode: (mode: DrawMode) => void;
    routeCount: number;
    areaCount: number;
    plannedRouteCount: number;
    sweep: SurveyPlan | null;
    onUndoPoint: () => void;
    onClearPoints: () => void;
    onGenerateSweep: () => void;
    params: SimulationParams;
    onChangeParams: (updater: (prev: SimulationParams) => SimulationParams) => void;
    onClearSweep: () => void;
    onLaunch: () => void;
    num: (value: number, digits?: number) => string;
}

/**
 * Pre-flight configuration card: route/survey-polygon drawing tools, lawnmower sweep generation, environmental
 * wind & network degradation parameters, time-scale selector, and launch control.
 */
export function SimulationSetupCard({
    uavId,
    canFly,
    busy,
    isGeneratingSweep,
    drawMode,
    onChangeDrawMode,
    routeCount,
    areaCount,
    plannedRouteCount,
    sweep,
    onUndoPoint,
    onClearPoints,
    onGenerateSweep,
    params,
    onChangeParams,
    onClearSweep,
    onLaunch,
    num,
}: SimulationSetupCardProps) {
    const {t} = useI18n();

    return (
        <Card>
            <CardContent className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-1.5" role="tablist">
                    <ModeTabButton
                        active={drawMode === 'waypoints'}
                        onClick={() => onChangeDrawMode('waypoints')}
                        icon={<MapPin size={14}/>}
                        label={t('simulation.route')}
                    />
                    <ModeTabButton
                        active={drawMode === 'area'}
                        onClick={() => onChangeDrawMode('area')}
                        icon={<Pentagon size={14}/>}
                        label={t('simulation.area')}
                    />
                </div>

                <p className="m-0 text-xs text-slate-500">
                    {t(drawMode === 'area' ? 'simulation.drawAreaHint' : 'simulation.drawRouteHint')}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        title={t('simulation.undo')}
                        aria-label={t('simulation.undo')}
                        onClick={onUndoPoint}
                        className="size-8 p-0 text-slate-600"
                    >
                        <Undo2 size={14}/>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        title={t('simulation.clear')}
                        aria-label={t('simulation.clear')}
                        onClick={onClearPoints}
                        className="size-8 p-0 text-slate-600"
                    >
                        <Eraser size={14}/>
                    </Button>
                    <span className="text-xs font-semibold tabular-nums text-slate-600">
                        {drawMode === 'area'
                            ? t('simulation.vertices', {count: areaCount})
                            : t('simulation.points', {count: routeCount})}
                    </span>
                    {drawMode === 'area' && (
                        <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={areaCount < 3 || isGeneratingSweep}
                            onClick={onGenerateSweep}
                            leftIcon={<Wand2 size={14} aria-hidden="true"/>}
                            className="ml-auto h-8 bg-uav-blue px-3 text-xs font-bold hover:bg-uav-blue-hover"
                        >
                            {t('simulation.generateSweep')}
                        </Button>
                    )}
                </div>

                {drawMode === 'area' && sweep && (
                    <Alert variant="info" className="px-3 py-2 text-xs tabular-nums">
                        {t('simulation.sweepInfo', {
                            count: sweep.waypoints.length,
                            spacing: num(sweep.lineSpacingMeters),
                            length: num(sweep.lengthMeters / 1000, 2),
                            minutes: num(sweep.estimatedMinutes, 1),
                        })}
                    </Alert>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <SimNumberField id="sim-alt" label={t('simulation.altitude')} value={params.altitudeMeters} min={10} max={120}
                                    onChange={v => onChangeParams(p => ({...p, altitudeMeters: v}))}/>
                    <SimNumberField id="sim-speed" label={t('simulation.speed')} value={params.cruiseSpeedMs} min={2} max={20}
                                    onChange={v => onChangeParams(p => ({...p, cruiseSpeedMs: v}))}/>
                    <SimNumberField id="sim-wind-speed" label={t('simulation.windSpeed')} value={params.windSpeedMs} min={0} max={25} step={0.5}
                                    onChange={v => onChangeParams(p => ({...p, windSpeedMs: v}))}/>
                    <SimNumberField id="sim-wind-dir" label={t('simulation.windDirection')} value={params.windDirectionDeg} min={0} max={360} step={15}
                                    onChange={v => onChangeParams(p => ({...p, windDirectionDeg: v}))}/>
                    <SimNumberField id="sim-loss" label={t('simulation.loss')} value={params.packetLossPct} min={0} max={60}
                                    onChange={v => onChangeParams(p => ({...p, packetLossPct: v}))}/>
                    <SimNumberField id="sim-latency" label={t('simulation.latency')} value={params.latencyMs} min={0} max={5000} step={50}
                                    onChange={v => onChangeParams(p => ({...p, latencyMs: v}))}/>
                    <SimNumberField id="sim-battery" label={t('simulation.battery')} value={params.batteryPct} min={25} max={100}
                                    onChange={v => onChangeParams(p => ({...p, batteryPct: v}))}/>
                    {drawMode === 'area' && (
                        <SimNumberField id="sim-overlap" label={t('simulation.overlap')} value={params.sideOverlapPercent} min={0} max={90}
                                        onChange={v => {
                                            onChangeParams(p => ({...p, sideOverlapPercent: v}));
                                            onClearSweep();
                                        }}/>
                    )}
                </div>

                <div>
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {t('simulation.timeScale')}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                        {TIME_SCALES.map(scale => (
                            <Button
                                key={scale}
                                type="button"
                                size="sm"
                                variant={params.timeScale === scale ? 'primary' : 'outline'}
                                onClick={() => onChangeParams(p => ({...p, timeScale: scale}))}
                                className={cn(
                                    'h-8 text-xs font-bold tabular-nums',
                                    params.timeScale === scale
                                        ? 'border border-primary bg-uav-red-light text-primary hover:bg-uav-red-light'
                                        : 'text-slate-600',
                                )}
                            >
                                {scale}x
                            </Button>
                        ))}
                    </div>
                </div>

                <Button
                    type="button"
                    variant="primary"
                    onClick={onLaunch}
                    disabled={!canFly || uavId == null || !plannedRouteCount || busy}
                    leftIcon={<Play size={15} aria-hidden="true"/>}
                    className="w-full text-xs font-bold uppercase tracking-wider"
                >
                    {t('simulation.start')}
                </Button>
                {!plannedRouteCount && (
                    <p className="m-0 text-center text-[11px] text-slate-400">{t('simulation.needRoute')}</p>
                )}
            </CardContent>
        </Card>
    );
}

function ModeTabButton({active, onClick, icon, label}: {active: boolean; onClick: () => void; icon: React.ReactNode; label: string}) {
    return (
        <Button
            type="button"
            role="tab"
            size="sm"
            variant="outline"
            aria-selected={active}
            onClick={onClick}
            leftIcon={<span aria-hidden="true">{icon}</span>}
            className={cn(
                'text-xs font-bold',
                active ? 'border-primary bg-uav-red-light text-primary hover:bg-uav-red-light' : 'text-slate-600',
            )}
        >
            {label}
        </Button>
    );
}

function SimNumberField({id, label, value, min, max, step = 1, onChange}: {
    id: string; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
    return (
        <FormField id={id} label={label} optional={false} labelClassName="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Input
                id={id}
                type="number"
                inputMode="decimal"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={e => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
                }}
                className="h-9 px-2.5 text-sm tabular-nums"
            />
        </FormField>
    );
}
