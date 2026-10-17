'use client';

import React, { useState } from 'react';
import { 
  Cpu, 
  Flame, 
  Zap, 
  Activity, 
  CheckCircle2, 
  Server, 
  HardDrive,
  RefreshCw
} from 'lucide-react';

export function Kv260EdgeStatusCard() {
  const [processingMode, setProcessingMode] = useState<'edge' | 'cloud'>('edge');
  
  // KV260 telemetry metrics
  const dpuUtilization = 68; // %
  const inferenceFps = 28.6; // FPS
  const latencyMs = 35; // ms
  const temperature = 54.2; // °C
  const ramUsage = '1.8 / 4.0 GB';
  const modelName = 'YOLOv8s-Int8 (Vitis-AI DPU B4096)';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-[#007f3e]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Bo mạch nhúng AI KV260 (Edge Device)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] bg-[#ecfdf5] text-[#007f3e] px-2.5 py-0.5 rounded-full font-mono font-bold border border-[#a7f3d0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007f3e] animate-pulse"></span>
            ONLINE (KRIA KV260)
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* DPU Utilization */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Tải DPU NPU</span>
            <Activity size={15} className="text-[#007f3e]" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-extrabold text-[#007f3e]">{dpuUtilization}%</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-[#007f3e] h-full rounded-full" style={{ width: `${dpuUtilization}%` }}></div>
          </div>
        </div>

        {/* Inference FPS */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Tốc độ AI</span>
            <Zap size={15} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-extrabold text-amber-600">{inferenceFps}</span>
            <span className="text-xs font-semibold text-slate-500">FPS</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">Độ trễ: {latencyMs} ms</span>
        </div>

        {/* Chip Temperature */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Nhiệt độ SoC</span>
            <Flame size={15} className="text-[#ab2523]" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-extrabold text-slate-900">{temperature}°C</span>
          </div>
          <span className="text-[10px] text-[#007f3e] font-semibold font-mono block mt-1">An toàn (&lt;75°C)</span>
        </div>

        {/* RAM / System */}
        <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Bộ nhớ LPDDR4</span>
            <HardDrive size={15} className="text-slate-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-mono font-extrabold text-slate-900">{ramUsage}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-1">Vitis-AI 3.0 Runtime</span>
        </div>
      </div>

      {/* Model & Orchestration Controls */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Mô hình AI:</span>
          <span className="font-mono text-[#007f3e] bg-[#ecfdf5] px-2.5 py-0.5 rounded-md border border-[#a7f3d0] font-bold">
            {modelName}
          </span>
        </div>

        {/* Processing Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[11px] text-slate-500 px-1.5 font-medium">Chế độ điều phối:</span>
          <button
            type="button"
            onClick={() => setProcessingMode('edge')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              processingMode === 'edge' ? 'bg-[#007f3e] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Edge KV260
          </button>
          <button
            type="button"
            onClick={() => setProcessingMode('cloud')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              processingMode === 'cloud' ? 'bg-[#ab2523] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ☁️ Cloud Fallback
          </button>
        </div>
      </div>
    </div>
  );
}
