'use client';

import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Camera, 
  Crosshair, 
  Layers, 
  ShieldAlert, 
  Scan, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Radio,
  Flame
} from 'lucide-react';
import { apiClient } from '@/lib/api.client';
import { operationsService } from "@/lib/api/resources";

export interface DetectionItem {
  id: string;
  label: string;
  confidence: number;
  box: { top: number; left: number; width: number; height: number }; // percentages 0-100
  color: string;
  timestamp: string;
  gpsEstimate: string;
  verified: boolean;
}

const mockDetections: DetectionItem[] = [
  {
    id: 'TRK-101',
    label: 'Person (Nạn nhân)',
    confidence: 0.94,
    box: { top: 38, left: 42, width: 9, height: 16 },
    color: '#10b981', // green
    timestamp: '14:23:05',
    gpsEstimate: '20.7284° N, 107.0512° E',
    verified: true,
  },
  {
    id: 'TRK-102',
    label: 'Lifebuoy (Phao cứu sinh)',
    confidence: 0.91,
    box: { top: 48, left: 54, width: 8, height: 9 },
    color: '#f59e0b', // amber
    timestamp: '14:23:08',
    gpsEstimate: '20.7286° N, 107.0517° E',
    verified: false,
  },
  {
    id: 'TRK-103',
    label: 'Person (Nghi vấn)',
    confidence: 0.82,
    box: { top: 62, left: 28, width: 7, height: 13 },
    color: '#06b6d4', // cyan
    timestamp: '14:23:19',
    gpsEstimate: '20.7279° N, 107.0504° E',
    verified: false,
  },
];

interface AiViewfinderProps {
  onSelectCandidate?: (candidate: DetectionItem) => void;
}

export function AiViewfinder({ onSelectCandidate }: AiViewfinderProps) {
  const [viewMode, setViewMode] = useState<'rgb' | 'thermal' | 'overlay'>('overlay');
  const [showBoxes, setShowBoxes] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [detections, setDetections] = useState<DetectionItem[]>(mockDetections);
  const [activeDetectionId, setActiveDetectionId] = useState<string | null>('TRK-101');
  const [isRecording, setIsRecording] = useState(true);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // Filtered detections based on threshold slider
  const visibleDetections = detections.filter(d => (d.confidence * 100) >= confidenceThreshold);

  const handleCaptureSnapshot = () => {
    void operationsService.registerMedia({
      originalName: `SAR_Snapshot_${activeDetectionId || 'Target'}_${Date.now()}.jpg`,
      contentType: 'image/jpeg',
      size: 4820100,
      type: 'IMAGE',
      linkedEntityType: 'SAR_MISSION',
      linkedEntityId: '1',
    });
    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2500);
  };

  const handleVerifyDetection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetections(prev => prev.map(item => item.id === id ? { ...item, verified: !item.verified } : item));
    void apiClient.post(`/api/v1/ai/detections/${encodeURIComponent(id)}/verify`, { verified: true }).catch(() => null);
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Top Header Bar of Viewfinder */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ab2523] bg-[#fef2f2] px-2.5 py-0.5 rounded-full border border-[#fecdd3] whitespace-nowrap shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#ab2523] animate-pulse shrink-0"></span>
            LIVE FEED 4K
          </span>
          <span className="text-xs text-slate-500 font-mono font-medium truncate">CAM: SONY ILX-LR1 / GIMBAL 3-AXIS</span>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200 text-xs shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('rgb')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${viewMode === 'rgb' ? 'bg-[#ab2523] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            RGB Màu
          </button>
          <button
            type="button"
            onClick={() => setViewMode('thermal')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${viewMode === 'thermal' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Tầm Nhiệt
          </button>
          <button
            type="button"
            onClick={() => setViewMode('overlay')}
            className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${viewMode === 'overlay' ? 'bg-[#007f3e] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            AI YOLOv8s
          </button>
        </div>
      </div>

      {/* Main Video Viewfinder Area - Clean Aeronautical Aerial Feed */}
      <div className="relative flex-1 bg-sky-50 min-h-[340px] overflow-hidden select-none flex items-center justify-center border-y border-slate-200">
        {/* Background Visualizer (High-Definition Simulated Daylight Aerial Coastal Feed) */}
        <div 
          className={`absolute inset-0 transition-all duration-500 ${
            viewMode === 'thermal' 
              ? 'bg-gradient-to-tr from-amber-50 via-orange-100 to-rose-200 saturate-150' 
              : 'bg-gradient-to-b from-sky-100 via-teal-50 to-emerald-100'
          }`}
        >
          {/* Water Surface / Terrain Contour Lines simulation */}
          <svg className="w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#0284c7" strokeWidth="0.5" strokeOpacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Topography waves */}
            <path d="M0,130 Q250,90 500,140 T1000,120" fill="none" stroke="#0369a1" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.4" />
            <path d="M0,220 Q300,260 600,210 T1200,240" fill="none" stroke="#007f3e" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
            <path d="M100,320 Q400,290 800,340 T1400,310" fill="none" stroke="#0284c7" strokeWidth="0.8" opacity="0.3" />
          </svg>
          {/* Subtle sun glint ripple highlight */}
          <div className="absolute top-1/4 left-1/3 w-64 h-32 bg-white/40 blur-2xl rounded-full pointer-events-none"></div>
        </div>

        {/* Center Reticle / HUD Target Crosshair */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="relative w-24 h-24 border border-slate-700/40 rounded-full flex items-center justify-center shadow-xs">
            <div className="w-2 h-2 bg-[#ab2523] rounded-full animate-ping"></div>
            <div className="absolute top-0 w-0.5 h-3 bg-slate-700/70"></div>
            <div className="absolute bottom-0 w-0.5 h-3 bg-slate-700/70"></div>
            <div className="absolute left-0 h-0.5 w-3 bg-slate-700/70"></div>
            <div className="absolute right-0 h-0.5 w-3 bg-slate-700/70"></div>
          </div>
          {/* Pitch & Roll Artificial Horizon Indicator */}
          <div className="absolute w-52 h-0.5 bg-[#007f3e]/60"></div>
          <div className="absolute top-6 text-[10px] font-mono font-bold tracking-widest text-slate-800 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-slate-300 shadow-xs">
            PITCH: -12.4° | ROLL: +1.1°
          </div>
        </div>

        {/* YOLOv8s Bounding Boxes Overlay */}
        {showBoxes && visibleDetections.map((det) => {
          const isSelected = activeDetectionId === det.id;
          return (
            <div
              key={det.id}
              onClick={() => {
                setActiveDetectionId(det.id);
                if (onSelectCandidate) onSelectCandidate(det);
              }}
              style={{
                top: `${det.box.top}%`,
                left: `${det.box.left}%`,
                width: `${det.box.width}%`,
                height: `${det.box.height}%`,
                borderColor: det.color,
              }}
              className={`absolute border-2 cursor-pointer transition-all duration-200 group bg-white/10 backdrop-blur-[1px] ${
                isSelected ? 'ring-4 ring-[#ab2523]/30 z-20 shadow-lg' : 'hover:border-slate-900'
              }`}
            >
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-slate-800"></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-slate-800"></div>
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-slate-800"></div>
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-slate-800"></div>

              {/* Tag / Badge */}
              <div 
                style={{ backgroundColor: det.color }}
                className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-bold text-white rounded shadow-sm flex items-center gap-1 whitespace-nowrap"
              >
                <span>{det.label}</span>
                <span>{(det.confidence * 100).toFixed(0)}%</span>
                {det.verified && <CheckCircle2 size={11} className="text-white" />}
              </div>

              {/* Coordinates info on hover or select */}
              {isSelected && (
                <div className="absolute -bottom-6 left-0 bg-white/95 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-300 shadow-md whitespace-nowrap font-medium">
                  {det.gpsEstimate}
                </div>
              )}
            </div>
          );
        })}

        {/* Floating Snapshot Indicator */}
        {snapshotSuccess && (
          <div className="absolute top-4 right-4 bg-emerald-600/90 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-bounce">
            <CheckCircle2 size={16} /> Đã chụp và lưu bằng chứng mục tiêu!
          </div>
        )}

        {/* Viewfinder Bottom Controls Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-md text-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowBoxes(!showBoxes)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-bold ${showBoxes ? 'bg-[#ecfdf5] text-[#007f3e] border border-[#a7f3d0]' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {showBoxes ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>Bounding Boxes ({visibleDetections.length})</span>
            </button>

            <div className="flex items-center gap-2 text-slate-700">
              <Sliders size={14} className="text-slate-400" />
              <span>Ngưỡng tin cậy:</span>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-20 accent-[#007f3e] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-[#007f3e] font-bold w-7">{confidenceThreshold}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition cursor-pointer"
            >
              <Camera size={14} /> Chụp ảnh
            </button>
          </div>
        </div>
      </div>

      {/* Detection Feed / Candidates Bar */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Flame size={15} className="text-[#ab2523]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Mục tiêu phát hiện thời gian thực (Detections Stream)
            </h4>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono font-bold">
              YOLOv8s-Int8
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {visibleDetections.length} mục tiêu trong tầm nhìn
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {visibleDetections.map((det) => (
            <div
              key={det.id}
              onClick={() => {
                setActiveDetectionId(det.id);
                if (onSelectCandidate) onSelectCandidate(det);
              }}
              className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                activeDetectionId === det.id
                  ? 'bg-white border-[#ab2523] ring-2 ring-[#ab2523]/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: det.color }}></span>
                  {det.label}
                </span>
                <span className="text-xs font-mono font-bold text-[#007f3e]">
                  {(det.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-mono">
                <span>{det.id}</span>
                <span>{det.timestamp}</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-500 truncate max-w-[140px] font-mono">
                  {det.gpsEstimate}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleVerifyDetection(det.id, e)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition ${
                    det.verified
                      ? 'bg-[#ecfdf5] text-[#007f3e] border border-[#a7f3d0]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {det.verified ? 'Đã xác nhận' : 'Xác nhận'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
