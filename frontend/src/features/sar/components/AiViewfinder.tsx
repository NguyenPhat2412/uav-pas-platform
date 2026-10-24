'use client';

import React, {useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {CheckCircle2, Eye, EyeOff, Flame, ImageOff, Sliders} from 'lucide-react';
import {operationsService} from '@/lib/api/resources';
import {sarKeys, sarService} from '@/features/sar/services/sar.service';
import type {AiDetection, AiTask} from '@/features/sar/types/sar.types';
import {useI18n} from '@/contexts/I18nContext';
import {toast} from '@/contexts/ToastContext';
import {cn} from '@/lib/utils';

/** People are the search target; everything else (debris, lifebuoys, vessels) is a clue. */
export const isPersonLabel = (label: string) => /person|human|victim|người/i.test(label);

export function detectionTone(d: AiDetection) {
    if (d.verified) return {border: 'border-uav-blue', badge: 'bg-uav-blue', dot: 'bg-uav-blue'};
    if (isPersonLabel(d.label)) return {border: 'border-primary', badge: 'bg-primary', dot: 'bg-primary'};
    return {border: 'border-amber-500', badge: 'bg-amber-500', dot: 'bg-amber-500'};
}

interface AiViewfinderProps {
    missionId: number;
    detections: AiDetection[];
    task: AiTask | null;
    loading: boolean;
    failed: boolean;
    selectedId: number | null;
    onSelect: (id: number) => void;
    canVerify: boolean;
}

/** Detections from the mission's AI tasks drawn over the analysed frame (when the task kept one). */
export function AiViewfinder({missionId, detections, task, loading, failed, selectedId, onSelect, canVerify}: AiViewfinderProps) {
    const {t, formatDate} = useI18n();
    const queryClient = useQueryClient();
    const [showBoxes, setShowBoxes] = useState(true);
    const [threshold, setThreshold] = useState(() => Math.round((task?.confidenceThreshold ?? 0.5) * 100));
    const visible = useMemo(() => detections
        .filter(d => d.confidence * 100 >= threshold)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [detections, threshold]);
    // Boxes are relative to one frame, so only the latest task's boxes are overlaid.
    const framed = visible.filter(d => task == null || d.aiTaskId === task.id);

    const frame = useQuery({
        queryKey: ['media', 'download-url', task?.mediaId],
        queryFn: () => operationsService.downloadUrl(task!.mediaId!),
        enabled: task?.mediaId != null,
        staleTime: 4 * 60 * 1000,
        retry: false,
    });

    const verify = useMutation({
        mutationFn: (d: AiDetection) => sarService.verify(d.id, !d.verified),
        onSuccess: updated => {
            queryClient.setQueryData<AiDetection[]>(sarKeys.detections(missionId),
                prev => prev?.map(d => d.id === updated.id ? updated : d));
            toast.success(t(updated.verified ? 'opsShared.sar.viewfinder.verifiedToast' : 'opsShared.sar.viewfinder.unverifiedToast',
                {label: updated.label, id: updated.trackingId ?? String(updated.id)}));
        },
        onError: e => toast.error(e instanceof Error ? e.message : t('opsShared.sar.viewfinder.verifyFailed')),
    });

    const pct = (v: number) => `${Math.round(v * 100)}%`;

    return <div className="flex h-full flex-col overflow-hidden rounded-none border border-border bg-card text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
                <Flame size={15} className="shrink-0 text-primary" aria-hidden="true"/>
                <h3 className="m-0 truncate text-xs font-bold uppercase tracking-wider text-slate-900">{t('opsShared.sar.viewfinder.title')}</h3>
            </div>
            {task && <span className="truncate text-[11px] tabular-nums text-slate-500">
                {t(`opsShared.sar.taskType.${task.taskType}`)} · {t(`opsShared.sar.node.${task.processingNode}`)} · {formatDate(task.createdAt, {timeStyle: 'medium'})}</span>}
        </div>

        <div className="relative flex min-h-[340px] flex-1 select-none items-center justify-center overflow-hidden border-b border-border bg-slate-100">
            {frame.data?.url
                // Presigned storage URL: short-lived and outside next/image's remote patterns.
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={frame.data.url} alt={t('opsShared.sar.viewfinder.frameAlt', {id: task?.id ?? ''})} className="absolute inset-0 h-full w-full object-cover"/>
                : <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(148_163_184/0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.18)_1px,transparent_1px)] bg-[size:48px_48px]"/>}
            {!frame.data?.url && <p className="relative z-0 m-0 flex max-w-xs flex-col items-center gap-2 text-center text-xs text-slate-500">
                <ImageOff size={22} aria-hidden="true"/>
                {loading ? t('opsShared.sar.viewfinder.loading') : failed ? t('opsShared.sar.viewfinder.loadError')
                    : !task ? t('opsShared.sar.viewfinder.noTask') : t('opsShared.sar.viewfinder.noFrame')}
            </p>}

            {showBoxes && framed.map(d => {
                const tone = detectionTone(d);
                const active = d.id === selectedId;
                return <button type="button" key={d.id} onClick={() => onSelect(d.id)}
                               aria-label={t('opsShared.sar.viewfinder.boxAria', {label: d.label, confidence: pct(d.confidence)})}
                               aria-pressed={active}
                               style={{top: `${d.boxTop}%`, left: `${d.boxLeft}%`, width: `${d.boxWidth}%`, height: `${d.boxHeight}%`}}
                               className={cn('absolute z-10 border-2 bg-white/5 transition', tone.border, active ? 'z-20 ring-4 ring-primary/30' : 'hover:ring-2 hover:ring-white/70')}>
                    <span className={cn('absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap rounded-none px-2 py-0.5 text-[10px] font-bold text-white', tone.badge)}>
                        {d.label} {pct(d.confidence)}{d.verified && <CheckCircle2 size={11} aria-hidden="true"/>}
                    </span>
                </button>;
            })}

            <div className="absolute bottom-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 rounded-none border border-border bg-white/95 px-3.5 py-2 text-slate-800">
                <button type="button" onClick={() => setShowBoxes(v => !v)} aria-pressed={showBoxes}
                        className={cn('flex items-center gap-1.5 rounded-none px-2.5 py-1 text-xs font-bold transition',
                            showBoxes ? 'border border-blue-200 bg-uav-blue-light text-uav-blue' : 'text-slate-500 hover:text-slate-900')}>
                    {showBoxes ? <Eye size={14} aria-hidden="true"/> : <EyeOff size={14} aria-hidden="true"/>}
                    {t('opsShared.sar.viewfinder.boxes', {count: framed.length})}
                </button>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Sliders size={14} className="text-slate-400" aria-hidden="true"/>{t('opsShared.sar.viewfinder.confidence')}
                    <input type="range" min={10} max={95} step={5} value={threshold} onChange={e => setThreshold(Number(e.target.value))}
                           className="h-1.5 w-20 cursor-pointer accent-primary"/>
                    <span className="w-8 font-bold tabular-nums text-primary">{threshold}%</span>
                </label>
            </div>
        </div>

        <div className="bg-slate-50/70 px-4 py-3">
            <div className="mb-2.5 flex items-center justify-between">
                <h4 className="m-0 text-xs font-bold uppercase tracking-wider text-slate-900">{t('opsShared.sar.viewfinder.streamTitle')}</h4>
                <span className="text-[11px] font-medium text-slate-500">{t('opsShared.sar.viewfinder.inView', {count: visible.length, total: detections.length})}</span>
            </div>
            {!visible.length ? <p className="m-0 py-3 text-center text-xs text-slate-500">
                    {detections.length ? t('opsShared.sar.viewfinder.belowThreshold') : t('opsShared.sar.viewfinder.none')}</p>
                : <ul className="m-0 grid max-h-64 list-none grid-cols-1 gap-2.5 overflow-y-auto p-0 md:grid-cols-3">
                    {visible.map(d => <li key={d.id}>
                        <div role="button" tabIndex={0} onClick={() => onSelect(d.id)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(d.id)}
                             aria-pressed={d.id === selectedId}
                             className={cn('cursor-pointer rounded-none border bg-card p-3 text-left transition',
                                 d.id === selectedId ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-slate-300')}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-bold text-slate-900">
                                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', detectionTone(d).dot)} aria-hidden="true"/>{d.label}</span>
                                <span className="text-xs font-bold tabular-nums text-slate-700">{pct(d.confidence)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums text-slate-500">
                                <span>{d.trackingId ?? `#${d.id}`}</span><span>{formatDate(d.createdAt, {timeStyle: 'medium'})}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                                <span className="truncate text-[10px] tabular-nums text-slate-500">
                                    {d.latitude != null && d.longitude != null ? `${d.latitude.toFixed(5)}, ${d.longitude.toFixed(5)}` : t('opsShared.sar.viewfinder.noGps')}</span>
                                {canVerify && <button type="button" disabled={verify.isPending}
                                                      onClick={e => {
                                                          e.stopPropagation();
                                                          verify.mutate(d);
                                                      }}
                                                      className={cn('shrink-0 rounded-none px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-60',
                                                          d.verified ? 'border border-blue-200 bg-uav-blue-light text-uav-blue' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>
                                    {d.verified ? t('opsShared.sar.viewfinder.verified') : t('opsShared.sar.viewfinder.verify')}</button>}
                            </div>
                            {d.verified && d.verifiedBy && <p className="m-0 mt-1 truncate text-[10px] text-slate-400">{t('opsShared.sar.viewfinder.verifiedBy', {name: d.verifiedBy})}</p>}
                        </div>
                    </li>)}
                </ul>}
        </div>
    </div>;
}
