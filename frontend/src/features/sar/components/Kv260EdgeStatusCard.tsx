'use client';

import React, {useState} from 'react';
import {Activity, Cpu, Flame, HardDrive, Zap} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

export function Kv260EdgeStatusCard() {
    const {t} = useI18n();
    const [processingMode, setProcessingMode] = useState<'edge' | 'cloud'>('edge');

    // KV260 telemetry metrics
    const dpuUtilization = 68; // %
    const inferenceFps = 28.6; // FPS
    const latencyMs = 35; // ms
    const temperature = 54.2; // °C
    const ramUsage = '1.8 / 4.0 GB';
    const modelName = 'YOLOv8s-Int8 (Vitis-AI DPU B4096)';

    return (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                    <Cpu size={18} className="text-success"/>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {t('opsShared.sar.kv260.title')}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
          <span
              className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-success px-2.5 py-0.5 rounded-full tabular-nums font-bold border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            ONLINE (KRIA KV260)
          </span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* DPU Utilization */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.kv260.dpuLoad')}</span>
                        <Activity size={15} className="text-success"/>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl tabular-nums font-extrabold text-success">{dpuUtilization}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-success h-full rounded-full" style={{width: `${dpuUtilization}%`}}></div>
                    </div>
                </div>

                {/* Inference FPS */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                        <span
                            className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.kv260.aiSpeed')}</span>
                        <Zap size={15} className="text-amber-500"/>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl tabular-nums font-extrabold text-amber-600">{inferenceFps}</span>
                        <span className="text-xs font-semibold text-slate-500">FPS</span>
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums block mt-1">{t('opsShared.sar.kv260.latency', {ms: latencyMs})}</span>
                </div>

                {/* Chip Temperature */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.kv260.socTemp')}</span>
                        <Flame size={15} className="text-primary"/>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl tabular-nums font-extrabold text-slate-900">{temperature}°C</span>
                    </div>
                    <span
                        className="text-[10px] text-success font-semibold tabular-nums block mt-1">{t('opsShared.sar.kv260.tempSafe')}</span>
                </div>

                {/* RAM / System */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.kv260.memory')}</span>
                        <HardDrive size={15} className="text-slate-500"/>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-lg tabular-nums font-extrabold text-slate-900">{ramUsage}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums block mt-1">Vitis-AI 3.0 Runtime</span>
                </div>
            </div>

            {/* Model & Orchestration Controls */}
            <div
                className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">{t('opsShared.sar.kv260.model')}</span>
                    <span
                        className="tabular-nums text-success bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 font-bold">
            {modelName}
          </span>
                </div>

                {/* Processing Mode Switcher */}
                <div
                    className="flex max-w-full flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-border">
                    <span className="text-[11px] text-slate-500 px-1.5 font-medium">{t('opsShared.sar.kv260.mode')}</span>
                    <button
                        type="button"
                        onClick={() => setProcessingMode('edge')}
                        className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            processingMode === 'edge' ? 'bg-success text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        ⚡ Edge KV260
                    </button>
                    <button
                        type="button"
                        onClick={() => setProcessingMode('cloud')}
                        className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            processingMode === 'cloud' ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        ☁️ Cloud Fallback
                    </button>
                </div>
            </div>
        </div>
    );
}
