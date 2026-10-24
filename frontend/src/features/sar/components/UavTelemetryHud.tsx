'use client';

import React from 'react';
import {Battery, Compass, Gauge, Navigation, Satellite, Timer} from 'lucide-react';
import {calculateHaversineDistance} from '@/features/sar/utils/sarAlgorithms';
import type {SarCockpitMission} from '@/features/sar/types/sar.types';
import type {UavTelemetry} from '@/features/uavs/types/telemetry.types';
import {useI18n} from '@/contexts/I18nContext';
import {cn} from '@/lib/utils';

const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const rtkTone: Record<string, string> = {
    FIXED: 'bg-uav-blue-light text-uav-blue border-blue-200',
    FLOAT: 'bg-uav-blue-light text-uav-blue border-blue-200',
    SINGLE: 'bg-uav-amber-light text-amber-800 border-amber-200',
    NONE: 'bg-uav-red-light text-primary border-rose-200',
};

/** Live flight values from the UAV's latest telemetry sample; nothing is shown that the device did not report. */
export function UavTelemetryHud({mission, telemetry, loading}: { mission: SarCockpitMission; telemetry: UavTelemetry | null; loading: boolean }) {
    const {t, formatNumber} = useI18n();
    const home = mission.stationLatitude != null && mission.stationLongitude != null
        ? {lat: mission.stationLatitude, lng: mission.stationLongitude} : null;
    const toHome = telemetry && home ? calculateHaversineDistance({lat: telemetry.latitude, lng: telemetry.longitude}, home) : null;
    const num = (v: number | null | undefined, digits = 1) => v == null ? '—' : formatNumber(Math.round(v * 10 ** digits) / 10 ** digits);
    const battery = telemetry?.batteryPct ?? null;

    return <div className="rounded-panel border border-border bg-card p-5 text-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div className="flex min-w-0 items-center gap-2">
                <Gauge size={18} className="shrink-0 text-primary" aria-hidden="true"/>
                <h3 className="m-0 truncate text-xs font-bold uppercase tracking-wider text-slate-900">{t('opsShared.sar.hud.title')}</h3>
            </div>
            <div className="flex items-center gap-2">
                {telemetry?.rtkStatus && <span className={cn('rounded-panel border px-2.5 py-0.5 text-[10px] font-bold tabular-nums', rtkTone[telemetry.rtkStatus])}>
                    {t(`opsShared.sar.hud.rtk.${telemetry.rtkStatus}`)}</span>}
                <span className="text-xs font-semibold tabular-nums text-slate-500">{mission.uavModel ?? ''} {mission.uavSerialNumber ?? ''}</span>
            </div>
        </div>

        {mission.uavId == null ? <p className="m-0 py-6 text-center text-sm text-slate-500">{t('opsShared.sar.hud.noUav')}</p>
            : loading ? <p className="m-0 py-6 text-center text-sm text-slate-500">{t('opsShared.sar.hud.loading')}</p>
                : !telemetry ? <p className="m-0 py-6 text-center text-sm text-slate-500">{t('opsShared.sar.hud.waiting', {serial: mission.uavSerialNumber ?? ''})}</p>
                    : <>
                        {telemetry.stale && <p role="status" className="mb-3 mt-0 border-l-4 border-l-uav-amber bg-uav-amber-light px-3 py-2 text-xs font-semibold text-amber-900">
                            {t('opsShared.sar.hud.stale', {seconds: formatNumber(telemetry.ageSeconds)})}</p>}
                        <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-4">
                            <Metric label={t('opsShared.sar.hud.altitude')} value={num(telemetry.altitudeAglMeters)} unit="m"/>
                            <Metric label={t('opsShared.sar.hud.speed')} value={num(telemetry.groundSpeedMs)} unit="m/s"
                                    hint={telemetry.groundSpeedMs != null ? `${num(telemetry.groundSpeedMs * 3.6)} km/h` : undefined}/>
                            <Metric label={t('opsShared.sar.hud.battery')} value={battery == null ? '—' : `${battery}%`}
                                    tone={battery == null ? undefined : battery <= 25 ? 'text-primary' : battery <= 40 ? 'text-amber-600' : 'text-uav-blue'}
                                    icon={<Battery size={15} aria-hidden="true"/>}/>
                            <Metric label={t('opsShared.sar.hud.distanceHome')} value={toHome == null ? '—' : formatNumber(Math.round(toHome))} unit="m"
                                    hint={home ? undefined : t('opsShared.sar.hud.noHome')}/>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600">
                            <span className="flex items-center gap-1.5"><Satellite size={14} className="text-slate-500" aria-hidden="true"/>
                                <strong className="tabular-nums text-slate-900">{telemetry.satellites ?? '—'}</strong> {t('opsShared.sar.hud.satellites')}</span>
                            <span className="flex items-center gap-1.5"><Compass size={14} className="text-slate-500" aria-hidden="true"/>
                                {t('opsShared.sar.hud.heading')} <strong className="tabular-nums text-slate-900">
                                    {telemetry.headingDeg == null ? '—' : `${String(Math.round(telemetry.headingDeg)).padStart(3, '0')}° ${compass[Math.round(telemetry.headingDeg / 45) % 8]}`}</strong></span>
                            <span className="flex items-center gap-1.5"><Navigation size={14} className="text-slate-500" aria-hidden="true"/>
                                <strong className="tabular-nums text-slate-900">{telemetry.latitude.toFixed(5)}, {telemetry.longitude.toFixed(5)}</strong></span>
                            <span className="ml-auto flex items-center gap-1.5"><Timer size={14} className={telemetry.stale ? 'text-amber-600' : 'text-uav-blue'} aria-hidden="true"/>
                                {t('opsShared.sar.hud.age', {seconds: formatNumber(telemetry.ageSeconds)})}</span>
                        </div>
                    </>}
    </div>;
}

function Metric({label, value, unit, hint, tone, icon}: { label: string; value: string; unit?: string; hint?: string; tone?: string; icon?: React.ReactNode }) {
    return <div className="bg-slate-50/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
            {icon && <span className={tone ?? 'text-slate-400'}>{icon}</span>}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
            <span className={cn('text-2xl font-extrabold tabular-nums', tone ?? 'text-slate-900')}>{value}</span>
            {unit && value !== '—' && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
        </div>
        {hint && <span className="mt-1 block text-[10px] tabular-nums text-slate-500">{hint}</span>}
    </div>;
}
