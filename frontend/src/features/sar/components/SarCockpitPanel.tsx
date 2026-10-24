'use client';

import React, {useEffect, useState} from 'react';
import {CheckCircle2, RotateCcw, Send} from 'lucide-react';
import {ErrorBoundary} from '@/components/ui';
import {AiViewfinder, type DetectionItem} from "@/features/sar/components/AiViewfinder";
import {SarTacticalMap} from "@/features/sar/components/SarTacticalMap";
import {UavTelemetryHud} from "@/features/sar/components/UavTelemetryHud";
import {Kv260EdgeStatusCard} from "@/features/sar/components/Kv260EdgeStatusCard";
import {sarRealtimeService} from "@/features/sar/services/sarRealtimeService";
import {sarStore} from "@/features/sar/stores/sarStore";
import {useI18n} from '@/contexts/I18nContext';

export function SarCockpitPanel() {
    const {t} = useI18n();
    const [selectedCandidate, setSelectedCandidate] = useState<DetectionItem | null>(null);
    // Store the message key so the notice follows language changes.
    const [alertSuccess, setAlertSuccess] = useState<{ key: string; params?: Record<string, string> } | null>(null);

    useEffect(() => {
        // Start real-time 1Hz telemetry physics loop
        sarRealtimeService.startSimulation();
        return () => {
            sarRealtimeService.stop();
        };
    }, []);

    const handleDispatchRescue = () => {
        const gpsCoord = selectedCandidate?.gpsEstimate ?? '20.7284° N, 107.0512° E';
        setAlertSuccess({key: 'opsShared.sar.cockpit.dispatchAlert', params: {gps: gpsCoord}});
        sarStore.setAlert('opsShared.sar.cockpit.dispatchStore');
        setTimeout(() => setAlertSuccess(null), 5000);
    };

    const handleEmergencyRth = () => {
        setAlertSuccess({key: 'opsShared.sar.cockpit.rthAlert'});
        sarStore.setAlert('opsShared.sar.cockpit.rthStore');
        setTimeout(() => setAlertSuccess(null), 5000);
    };

    return (
        <div className="space-y-5">
            <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>{t('opsShared.sar.cockpit.simulationTitle')}</strong> {t('opsShared.sar.cockpit.simulationBody')}</p>
            {/* Tactical Operation Banner - Light Enterprise VJU Theme */}
            <div
                className="bg-card border border-border border-l-4 border-l-primary rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
                className="bg-red-50 text-primary border border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
              {t('opsShared.sar.cockpit.urgent')}
            </span>
                        <span
                            className="bg-emerald-50 text-success border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {t('opsShared.sar.cockpit.inProgress')}
            </span>
                        <span
                            className="text-xs text-slate-500 tabular-nums font-semibold">{t('opsShared.sar.cockpit.missionCode', {code: 'SAR-2026-004'})}</span>
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        {t('opsShared.sar.cockpit.missionTitle')}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {t('opsShared.sar.cockpit.station')} <strong className="text-slate-800">{t('opsShared.sar.cockpit.stationName')}</strong> · {t('opsShared.sar.cockpit.pilot')} <strong className="text-slate-800">Nguyễn Văn An (Pilot #01)</strong> · {t('opsShared.sar.cockpit.flightTime')} <strong className="text-success tabular-nums font-bold">00:42:18</strong>
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleDispatchRescue}
                        className="flex min-h-11 items-center gap-2 px-4 py-2.5 bg-success hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <Send size={15}/> {t('opsShared.sar.cockpit.dispatchButton')}
                    </button>
                    <button
                        type="button"
                        onClick={handleEmergencyRth}
                        className="flex min-h-11 items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <RotateCcw size={15}/> {t('opsShared.sar.cockpit.rthButton')}
                    </button>
                </div>
            </div>

            {/* Floating Alert Notice */}
            {alertSuccess && (
                <div
                    className="bg-emerald-50 border border-emerald-200 text-success px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-sm animate-fade-in">
                    <CheckCircle2 size={18} className="text-success shrink-0"/>
                    <span>{t(alertSuccess.key, alertSuccess.params)}</span>
                </div>
            )}

            {/* TOP ROW: Live Viewfinder + Tactical Map (Bento Grid with ErrorBoundaries) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
                {/* Left: AI Viewfinder */}
                <div className="flex flex-col h-full">
                    <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.cameraError')}>
                        <AiViewfinder onSelectCandidate={setSelectedCandidate}/>
                    </ErrorBoundary>
                </div>

                {/* Right: Tactical Map */}
                <div className="flex flex-col h-full">
                    <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.mapError')}>
                        <SarTacticalMap
                            selectedCandidate={selectedCandidate}
                            onSelectCandidate={setSelectedCandidate}
                        />
                    </ErrorBoundary>
                </div>
            </div>

            {/* BOTTOM ROW: UAV Telemetry HUD + KV260 Edge Status Card */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.hudError')}>
                    <UavTelemetryHud uavName="Matrice 350 RTK (SAR Special)" serialNumber="UAV-M350-VN-009"/>
                </ErrorBoundary>
                <ErrorBoundary fallbackTitle={t('opsShared.sar.cockpit.kv260Error')}>
                    <Kv260EdgeStatusCard/>
                </ErrorBoundary>
            </div>
        </div>
    );
}
