'use client';

import React from 'react';
import {Activity, Cpu, Flame, Timer, Zap} from 'lucide-react';
import type {AiTask} from '@/features/sar/types/sar.types';
import {useI18n} from '@/providers/I18nContext';
import {formatTelemetryNumber} from '@/lib/format';
import {cn} from '@/lib/utils';

/** SoC thermal guidance for the Kria KV260: throttling starts near 85 °C. */
const TEMP_WARN_C = 75;

const statusTone: Record<string, string> = {
    COMPLETED: 'bg-uav-blue-light text-uav-blue border-blue-200',
    PROCESSING: 'bg-uav-blue-light text-uav-blue border-blue-200',
    PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
    FAILED: 'bg-uav-red-light text-primary border-rose-200',
};

/** Inference node metrics as reported with the mission's latest AI task. */
export function Kv260EdgeStatusCard({task, loading}: { task: AiTask | null; loading: boolean }) {
    const {t, formatNumber, formatDate} = useI18n();
    const edge = task?.processingNode !== 'CLOUD_GPU';
    const num = (v: number | null | undefined) => formatTelemetryNumber(v, formatNumber, 1);
    const hot = task?.socTemperature != null && task.socTemperature >= TEMP_WARN_C;

    return <div className="rounded-panel border border-border bg-card p-5 text-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div className="flex min-w-0 items-center gap-2">
                <Cpu size={18} className="shrink-0 text-uav-blue" aria-hidden="true"/>
                <h3 className="m-0 truncate text-xs font-bold text-slate-900">
                    {t(edge ? 'opsShared.sar.kv260.title' : 'opsShared.sar.kv260.cloudTitle')}</h3>
            </div>
            {task && <span className={cn('rounded-badge border px-2.5 py-0.5 text-[10px] font-bold', statusTone[task.status])}>
                {t(`opsShared.sar.kv260.status.${task.status}`)}</span>}
        </div>

        {loading ? <p className="m-0 py-6 text-center text-sm text-slate-500">{t('opsShared.sar.kv260.loading')}</p>
            : !task ? <p className="m-0 py-6 text-center text-sm text-slate-500">{t('opsShared.sar.kv260.noTask')}</p>
                : <>
                    {task.status === 'FAILED' && task.errorMessage && <p role="alert" className="mb-3 mt-0 border-l-4 border-l-primary bg-uav-red-light px-3 py-2 text-xs text-primary">{task.errorMessage}</p>}
                    {(task.status === 'PENDING' || task.status === 'PROCESSING') && <p role="status" className="mb-3 mt-0 border-l-4 border-l-uav-blue bg-uav-blue-light px-3 py-2 text-xs text-uav-blue">
                        {t('opsShared.sar.kv260.awaiting')}</p>}
                    <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-4">
                        <Metric label={t('opsShared.sar.kv260.dpuLoad')} icon={<Activity size={15} aria-hidden="true"/>}
                                value={task.dpuUtilization == null ? '—' : `${num(task.dpuUtilization)}%`} bar={task.dpuUtilization}/>
                        <Metric label={t('opsShared.sar.kv260.aiSpeed')} icon={<Zap size={15} aria-hidden="true"/>} value={num(task.fps)} unit="FPS"/>
                        <Metric label={t('opsShared.sar.kv260.inference')} icon={<Timer size={15} aria-hidden="true"/>}
                                value={task.inferenceTimeMs == null ? '—' : formatNumber(task.inferenceTimeMs)} unit="ms"/>
                        <Metric label={t('opsShared.sar.kv260.socTemp')} icon={<Flame size={15} aria-hidden="true"/>}
                                value={task.socTemperature == null ? '—' : `${num(task.socTemperature)}°C`} tone={hot ? 'text-primary' : undefined}
                                hint={task.socTemperature == null ? undefined : t(hot ? 'opsShared.sar.kv260.tempHot' : 'opsShared.sar.kv260.tempSafe', {limit: TEMP_WARN_C})}/>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs">
                        <span className="text-slate-500">{t('opsShared.sar.kv260.model')} <strong className="text-slate-800">{t(`opsShared.sar.taskType.${task.taskType}`)}</strong>
                            {task.confidenceThreshold != null && <> · {t('opsShared.sar.kv260.threshold', {pct: Math.round(task.confidenceThreshold * 100)})}</>}</span>
                        <span className="tabular-nums text-slate-500">{t('opsShared.sar.kv260.node')} <strong className="text-slate-800">{t(`opsShared.sar.node.${task.processingNode}`)}</strong>
                            {' · '}{formatDate(task.completedAt ?? task.createdAt, {dateStyle: 'short', timeStyle: 'short'})}</span>
                    </div>
                </>}
    </div>;
}

function Metric({label, value, unit, icon, bar, tone, hint}: {
    label: string; value: string; unit?: string; icon: React.ReactNode; bar?: number | null; tone?: string; hint?: string;
}) {
    return <div className="bg-slate-50/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
            <span className="block text-[10px] font-bold text-slate-500">{label}</span>
            <span className="text-slate-400">{icon}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
            <span className={cn('text-2xl font-extrabold tabular-nums', tone ?? 'text-slate-900')}>{value}</span>
            {unit && value !== '—' && <span className="text-xs font-semibold text-slate-500">{unit}</span>}
        </div>
        {bar != null && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-uav-blue" style={{width: `${Math.min(100, Math.max(0, bar))}%`}}/></div>}
        {hint && <span className="mt-1 block text-[10px] text-slate-500">{hint}</span>}
    </div>;
}
