'use client';

import React from 'react';
import {Battery, Compass, Gauge, Navigation, Radio, Wind} from 'lucide-react';
import {useI18n} from '@/contexts/I18nContext';

interface UavTelemetryHudProps {
    uavName?: string;
    serialNumber?: string;
}

export function UavTelemetryHud({
                                    uavName = 'Matrice 350 RTK #01',
                                    serialNumber = 'UAV-M350-VN-009'
                                }: UavTelemetryHudProps) {
    const {t} = useI18n();
    // Telemetry indicators
    const batteryPct = 78;
    const batteryVoltage = 22.8;
    const altitudeAgl = 125.4; // m
    const altitudeMsl = 184.2; // m
    const speed = 14.2; // m/s
    const speedKmh = (speed * 3.6).toFixed(1);
    const distanceToHome = 640; // m
    const satellites = 24;
    const signalRssi = -64; // dBm
    const remainingTimeMinutes = 26;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                    <Gauge size={18} className="text-[#ab2523]"/>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {t('opsShared.sar.hud.title')}
                    </h3>
                </div>
                <div className="flex items-center gap-2">
          <span
              className="text-[10px] bg-[#ecfdf5] text-[#007f3e] px-2.5 py-0.5 rounded-full font-mono font-bold border border-[#a7f3d0]">
            {t('opsShared.sar.hud.rtkFix')}
          </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">{serialNumber}</span>
                </div>
            </div>

            {/* Main KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Altitude */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                    <span
                        className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.hud.altitude')}</span>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-mono font-extrabold text-slate-900">{altitudeAgl}</span>
                        <span className="text-xs font-semibold text-slate-500">m</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">MSL: {altitudeMsl}m</span>
                </div>

                {/* Speed */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                    <span
                        className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.hud.speed')}</span>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-mono font-extrabold text-[#007f3e]">{speed}</span>
                        <span className="text-xs font-semibold text-slate-500">m/s</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">{speedKmh} km/h</span>
                </div>

                {/* Battery */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                        <span
                            className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.hud.battery')}</span>
                        <Battery size={15} className={batteryPct > 30 ? "text-[#007f3e]" : "text-[#ab2523]"}/>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
            <span
                className={`text-2xl font-mono font-extrabold ${batteryPct > 30 ? "text-[#007f3e]" : "text-[#ab2523]"}`}>
              {batteryPct}%
            </span>
                        <span className="text-xs font-semibold text-slate-500">{t('opsShared.sar.hud.remainingMinutes', {minutes: remainingTimeMinutes})}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">{batteryVoltage}V · LiPo</span>
                </div>

                {/* Distance / Signal */}
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">{t('opsShared.sar.hud.distanceHome')}</span>
                    <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-mono font-extrabold text-[#ab2523]">{distanceToHome}</span>
                        <span className="text-xs font-semibold text-slate-500">m</span>
                    </div>
                    <span
                        className="text-[10px] text-[#007f3e] font-mono font-semibold block mt-1 flex items-center gap-1">
            <Radio size={12}/> Link: {signalRssi} dBm (98%)
          </span>
                </div>
            </div>

            {/* Secondary Indicators Bar */}
            <div
                className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Navigation size={14} className="text-[#007f3e]"/>
            <strong className="text-slate-900 font-mono">{satellites}</strong> {t('opsShared.sar.hud.satellites')}
          </span>
                    <span className="flex items-center gap-1.5">
            <Wind size={14} className="text-slate-500"/>
            {t('opsShared.sar.hud.wind')} <strong className="text-slate-900 font-mono">3.4 m/s</strong> {t('opsShared.sar.hud.windDirection')}
          </span>
                    <span className="flex items-center gap-1.5">
            <Compass size={14} className="text-[#ab2523]"/>
            {t('opsShared.sar.hud.heading')} <strong className="text-slate-900 font-mono">045° NE</strong>
          </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#007f3e] animate-pulse"></span>
                    <span className="text-[11px] text-[#007f3e] font-bold">{t('opsShared.sar.hud.inControl')}</span>
                </div>
            </div>
        </div>
    );
}
