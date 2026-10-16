'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Send, 
  AlertTriangle, 
  FileText, 
  RotateCcw, 
  CheckCircle2, 
  Radio, 
  Layers,
  ChevronRight,
  LifeBuoy
} from 'lucide-react';
import { ErrorBoundary } from '@/components/ui';
import { AiViewfinder, type DetectionItem } from './AiViewfinder';
import { SarTacticalMap } from './SarTacticalMap';
import { UavTelemetryHud } from './UavTelemetryHud';
import { Kv260EdgeStatusCard } from './Kv260EdgeStatusCard';
import { sarRealtimeService } from '../services/sarRealtimeService';
import { sarStore, useSarStore } from '../stores/sarStore';

export function SarCockpitPanel() {
  const [selectedCandidate, setSelectedCandidate] = useState<DetectionItem | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Start real-time 1Hz telemetry physics loop
    sarRealtimeService.startSimulation();
    return () => {
      sarRealtimeService.stop();
    };
  }, []);

  const handleDispatchRescue = () => {
    const gpsCoord = selectedCandidate?.gpsEstimate ?? '20.7284° N, 107.0512° E';
    setAlertSuccess(`Mô phỏng gửi tọa độ (${gpsCoord}). Chưa gửi tới đội cứu nạn thực tế.`);
    sarStore.setAlert('Đã chạy mô phỏng phân phối tọa độ cứu hộ.');
    setTimeout(() => setAlertSuccess(null), 5000);
  };

  const handleEmergencyRth = () => {
    setAlertSuccess('Mô phỏng RTH về trạm ST-01. Chưa truyền lệnh tới UAV thực tế.');
    sarStore.setAlert('Mô phỏng RTH tự động.');
    setTimeout(() => setAlertSuccess(null), 5000);
  };

  return (
    <div className="space-y-5">
      <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>Chế độ mô phỏng.</strong> Dữ liệu UAV, camera AI và bo mạch dưới đây chưa được kết nối thiết bị thực tế. Các thao tác chỉ minh họa giao diện.</p>
      {/* Tactical Operation Banner - Light Enterprise VJU Theme */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-[#ab2523] rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="bg-[#fef2f2] text-[#ab2523] border border-[#fecdd3] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ab2523] animate-ping"></span>
              ƯU TIÊN KHẨN CẤP (URGENT)
            </span>
            <span className="bg-[#ecfdf5] text-[#007f3e] border border-[#a7f3d0] text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              ĐANG TÁC CHIẾN (IN_PROGRESS)
            </span>
            <span className="text-xs text-slate-500 font-mono font-semibold">MÃ NHIỆM VỤ: SAR-2026-004</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Tìm kiếm cứu nạn tàu cá mất tích - Khu vực vịnh Lan Hạ, Hải Phòng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Trạm điều phối: <strong className="text-slate-800">Trạm Cát Bà (ST-01)</strong> · Phi công phụ trách: <strong className="text-slate-800">Nguyễn Văn An (Pilot #01)</strong> · Thời gian bay: <strong className="text-[#007f3e] font-mono font-bold">00:42:18</strong>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDispatchRescue}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#007f3e] hover:bg-[#006632] text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Send size={15} /> Mô phỏng gửi tọa độ cứu nạn
          </button>
          <button
            type="button"
            onClick={handleEmergencyRth}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ab2523] hover:bg-[#8f1c1a] text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <RotateCcw size={15} /> Mô phỏng RTH về trạm
          </button>
        </div>
      </div>

      {/* Floating Alert Notice */}
      {alertSuccess && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#007f3e] px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm animate-fade-in">
          <CheckCircle2 size={18} className="text-[#007f3e] shrink-0" />
          <span>{alertSuccess}</span>
        </div>
      )}

      {/* TOP ROW: Live Viewfinder + Tactical Map (Bento Grid with ErrorBoundaries) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        {/* Left: AI Viewfinder */}
        <div className="flex flex-col h-full">
          <ErrorBoundary fallbackTitle="Không thể tải luồng Camera AI">
            <AiViewfinder onSelectCandidate={setSelectedCandidate} />
          </ErrorBoundary>
        </div>

        {/* Right: Tactical Map */}
        <div className="flex flex-col h-full">
          <ErrorBoundary fallbackTitle="Không thể tải Bản đồ Tác chiến SAR">
            <SarTacticalMap 
              selectedCandidate={selectedCandidate} 
              onSelectCandidate={setSelectedCandidate} 
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* BOTTOM ROW: UAV Telemetry HUD + KV260 Edge Status Card */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ErrorBoundary fallbackTitle="Lỗi hiển thị Telemetry HUD">
          <UavTelemetryHud uavName="Matrice 350 RTK (SAR Special)" serialNumber="UAV-M350-VN-009" />
        </ErrorBoundary>
        <ErrorBoundary fallbackTitle="Lỗi hiển thị Bo mạch KV260">
          <Kv260EdgeStatusCard />
        </ErrorBoundary>
      </div>
    </div>
  );
}
