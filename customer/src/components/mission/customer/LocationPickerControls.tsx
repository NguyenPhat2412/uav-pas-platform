'use client';

import {Circle as CircleIcon, Crosshair, Hexagon, MapPin, Trash2, Undo2} from 'lucide-react';
import {Alert, Badge, Button, Card, FormField, Input, Select} from '@/components/ui';
import {MAP_BASEMAP_ORDER} from '@/lib/map-config';
import {cn} from '@/lib/utils';
import {useI18n} from '@/providers/I18nContext';
import type {Basemap} from '@/types';
import {radiusLimits, type FlightPlanInput} from '@/types/mission/flight-plan.types';
import type {PlannerTool} from '@/types/mission/mission.types';

export interface LocationPickerToolbarProps {
    current: FlightPlanInput;
    tool: PlannerTool;
    basemap: Basemap;
    locating: boolean;
    onLocate: () => void;
    onChooseTool: (next: PlannerTool) => void;
    onUndoVertex: () => void;
    onClearArea: () => void;
    onBasemapChange: (next: Basemap) => void;
    onRadiusChange: (radiusMeters: number) => void;
}

export function LocationPickerToolbar({
    current,
    tool,
    basemap,
    locating,
    onLocate,
    onChooseTool,
    onUndoVertex,
    onClearArea,
    onBasemapChange,
    onRadiusChange,
}: LocationPickerToolbarProps) {
    const {t} = useI18n();
    const tools: { id: PlannerTool; icon: typeof MapPin; label: string }[] = [
        {id: 'takeoff', icon: MapPin, label: t('planner.tool.takeoff')},
        {id: 'POLYGON', icon: Hexagon, label: t('planner.tool.polygon')},
        {id: 'CIRCLE', icon: CircleIcon, label: t('planner.tool.circle')},
    ];

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-foreground">
                <span>{t('planner.label')}</span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    leftIcon={<Crosshair size={14} aria-hidden="true"/>}
                    onClick={onLocate}
                    disabled={locating}
                    className="h-auto px-1.5 py-0.5 text-xs font-bold text-primary hover:bg-transparent hover:underline"
                >
                    {locating ? t('map.locating') : t('planner.takeoffHere')}
                </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <div
                    className="inline-flex border border-border bg-card"
                    role="radiogroup"
                    aria-label={t('planner.toolLabel')}
                    onKeyDown={e => {
                        const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
                        if (!step) return;
                        const idx = tools.findIndex(item => item.id === tool);
                        const nextIdx = (Math.max(0, idx) + step + tools.length) % tools.length;
                        e.preventDefault();
                        onChooseTool(tools[nextIdx].id);
                        e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="radio"]')[nextIdx]?.focus();
                    }}
                >
                    {tools.map(({id, icon: Icon, label}) => (
                        <Button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={tool === id}
                            tabIndex={tool === id ? 0 : -1}
                            variant={tool === id ? 'primary' : 'ghost'}
                            size="sm"
                            leftIcon={<Icon size={14} aria-hidden="true"/>}
                            onClick={() => onChooseTool(id)}
                            className={cn(
                                'rounded-none px-3 text-xs font-semibold',
                                tool !== id && 'text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
                {tool === 'POLYGON' && current.areaType === 'POLYGON' && current.vertices.length > 0 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Undo2 size={14} aria-hidden="true"/>}
                        onClick={onUndoVertex}
                        className="border-border bg-card px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        {t('planner.undo')}
                    </Button>
                )}
                {current.areaType !== 'POINT' && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Trash2 size={14} aria-hidden="true"/>}
                        onClick={onClearArea}
                        className="border-border bg-card px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        {t('planner.clearArea')}
                    </Button>
                )}
                <div className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <label htmlFor="planner-basemap">{t('planner.basemap')}</label>
                    <div className="w-36">
                        <Select
                            id="planner-basemap"
                            value={basemap}
                            onChange={e => onBasemapChange(e.target.value as Basemap)}
                            className="h-9 px-2 text-xs"
                        >
                            {MAP_BASEMAP_ORDER.map(b => (
                                <option key={b} value={b}>{t(`planner.basemaps.${b}`)}</option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>
            {tool === 'CIRCLE' && (
                <FormField
                    id="planner-radius"
                    label={t('planner.radius')}
                    optional={false}
                    className="sm:flex-row sm:items-center sm:gap-3"
                    labelClassName="shrink-0 text-slate-600"
                >
                    <div className="flex flex-1 items-center gap-3">
                        <div className="flex-1">
                            <Input
                                id="planner-radius"
                                type="range"
                                min={radiusLimits.min}
                                max={radiusLimits.max}
                                step={50}
                                value={current.radiusMeters ?? 300}
                                onChange={e => onRadiusChange(Number(e.target.value))}
                                className="h-2 border-0 bg-transparent px-0 accent-primary focus:outline-none"
                            />
                        </div>
                        <span className="w-16 text-right text-xs font-semibold tabular-nums text-foreground">
                            {current.radiusMeters ?? 300} m
                        </span>
                    </div>
                </FormField>
            )}
        </>
    );
}

export interface LocationPickerSummaryProps {
    activeZoneCount: number;
    areaSquareMeters: number | null;
    perimeterMeters: number | null;
    center: [number, number] | null;
    takeoffLatitude?: number;
    takeoffLongitude?: number;
    tool: PlannerTool;
    toolDone: boolean;
    locateError: '' | 'unsupported' | 'failed';
}

export function LocationPickerSummary({
    activeZoneCount,
    areaSquareMeters,
    perimeterMeters,
    center,
    takeoffLatitude,
    takeoffLongitude,
    tool,
    toolDone,
    locateError,
}: LocationPickerSummaryProps) {
    const {t, formatNumber} = useI18n();

    return (
        <>
            {activeZoneCount > 0 && (
                <Card
                    variant="surface"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-border bg-slate-50/70 px-3 py-2 text-xs text-slate-600"
                    aria-label={t('airspace.legend.label')}
                >
                    <span className="font-semibold text-foreground">
                        {t('airspace.legend.title', {count: activeZoneCount})}
                    </span>
                    <Badge variant="error" size="sm" className="font-medium normal-case tracking-normal">
                        <span className="h-2 w-2 rounded-badge border border-red-700 bg-red-600/30" aria-hidden="true"/>
                        {t('airspace.zoneType.PROHIBITED')}
                    </Badge>
                    <Badge variant="warning" size="sm" className="font-medium normal-case tracking-normal">
                        <span className="h-2 w-2 rounded-badge border border-amber-600 bg-amber-500/30" aria-hidden="true"/>
                        {t('airspace.zoneType.RESTRICTED')}
                    </Badge>
                    <Badge variant="outline" size="sm" className="border-blue-200 bg-blue-50 font-medium normal-case tracking-normal text-blue-700">
                        <span className="h-2 w-2 rounded-badge border border-blue-600 bg-blue-500/25" aria-hidden="true"/>
                        {t('airspace.zoneType.WARNING')}
                    </Badge>
                </Card>
            )}
            <Card className="rounded-none border-border">
                <dl className="m-0 grid grid-cols-2 gap-px bg-border text-xs sm:grid-cols-4">
                    <Stat
                        label={t('planner.area')}
                        value={areaSquareMeters != null
                            ? `${formatNumber(Math.round(areaSquareMeters))} m² · ${formatNumber(Math.round(areaSquareMeters / 100) / 100)} ha`
                            : '—'}
                    />
                    <Stat
                        label={t('planner.perimeter')}
                        value={perimeterMeters != null ? `${formatNumber(Math.round(perimeterMeters))} m` : '—'}
                    />
                    <Stat
                        label={t('planner.center')}
                        value={center ? `${center[0].toFixed(6)}, ${center[1].toFixed(6)}` : '—'}
                    />
                    <Stat
                        label={t('planner.takeoff')}
                        value={takeoffLatitude != null && takeoffLongitude != null
                            ? `${takeoffLatitude.toFixed(6)}, ${takeoffLongitude.toFixed(6)}`
                            : '—'}
                    />
                </dl>
            </Card>
            {!toolDone && <p className="m-0 text-sm text-muted">{t(`planner.hint.${tool}`)}</p>}
            {locateError && (
                <Alert variant="error" className="px-3 py-2 text-sm">
                    {t(locateError === 'unsupported' ? 'map.unsupported' : 'map.locateFailed')}
                </Alert>
            )}
        </>
    );
}

function Stat({label, value}: { label: string; value: string }) {
    return (
        <div className="bg-card px-3 py-2">
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="m-0 font-semibold tabular-nums text-foreground">{value}</dd>
        </div>
    );
}
