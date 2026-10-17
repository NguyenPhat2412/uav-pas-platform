'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  Boxes,
  FileKey2,
  MapPinned,
  PlaneTakeoff,
  ShieldCheck,
  Users,
  RadioTower,
  Settings2,
  RotateCw,
  Compass,
  BatteryCharging,
  Eye,
  Radar,
  Radio,
  Crosshair,
  Wifi,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui';
import { useI18n } from '@/contexts/I18nContext';

export default function PreviewPage() {
  const { t } = useI18n();

  const mockUavs = [
    { id: '1', model: 'VJU-SkyMaster X4', serialNumber: 'SN-VJU-01', status: 'READY', stationName: 'Trạm Hòa Lạc', manufacturer: 'VJU Aero' },
    { id: '2', model: 'VJU-Surveyor Pro 9', serialNumber: 'SN-VJU-02', status: 'IN_FLIGHT', stationName: 'Trạm Mỹ Đình', manufacturer: 'VJU Lab' },
    { id: '3', model: 'VJU-Falcon Sensor R', serialNumber: 'SN-VJU-03', status: 'MAINTENANCE', stationName: 'KTX Kỹ thuật', manufacturer: 'VNU Eng' },
    { id: '4', model: 'VJU-AgriScan Eco', serialNumber: 'SN-VJU-04', status: 'READY', stationName: 'Trạm Nông nghiệp', manufacturer: 'VJU Eco' },
    { id: '5', model: 'VJU-ThermalGuard V', serialNumber: 'SN-VJU-05', status: 'READY', stationName: 'Trạm Hòa Lạc', manufacturer: 'VJU Aero' },
  ];

  const mockStations = [
    { id: '1', code: 'ST-HL-01', name: 'Trạm Hòa Lạc', status: 'ONLINE', address: 'Khu CNC Hòa Lạc', coords: '21.0125, 105.5268' },
    { id: '2', code: 'ST-MD-02', name: 'Trạm Mỹ Đình', status: 'ONLINE', address: 'Mỹ Đình 1, Hà Nội', coords: '21.0368, 105.7654' },
    { id: '3', code: 'ST-SH-03', name: 'Trạm Hải văn', status: 'ONLINE', address: 'Khu thí nghiệm biển', coords: '20.8456, 106.6892' },
  ];

  const quickActions = [
    { icon: Settings2, label: t('console.operations'), href: '/operations?tab=uavs' },
    { icon: Activity, label: t('console.nav.missions'), href: '/missions' },
    { icon: ShieldCheck, label: t('console.nav.access'), href: '/access-control' },
    { icon: FileKey2, label: t('console.nav.media'), href: '/operations?tab=media' },
  ];

  return (
    <AppShell activeResource="uavs">
      <div className="w-full space-y-5">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">Bản xem trước giao diện với dữ liệu mô phỏng; không phải số liệu vận hành thực tế.</p>
        {/* Top Command Bar - Strictly single line with animated live telemetry beacon */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Live pulsating beacon */}
            <div className="relative flex h-4 w-4 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ab2523] opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#ab2523] shadow-md shadow-[#ab2523]/40" />
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#202020] sm:whitespace-nowrap flex flex-wrap items-center gap-2">
              <span>{t('preview.title')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#ab2523] text-white sm:whitespace-nowrap shadow-sm">
                {t('preview.edition')}
              </span>
            </h1>

            <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#007f3e] border border-[#a7f3d0] sm:whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-[#007f3e] animate-pulse" />
              {t('preview.realtimeBadge')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} />}
              className="border-[#e5e7eb] hover:border-[#ab2523] hover:text-[#ab2523] sm:whitespace-nowrap"
            >
              {t('preview.syncRtk')}
            </Button>
            <Link
              href="/operations"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-[#ab2523] hover:bg-[#8f1c1a] text-white shadow-md shadow-[#ab2523]/25 transition sm:whitespace-nowrap group"
            >
              <PlaneTakeoff size={16} className="group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" />
              {t('preview.openMap')}
            </Link>
          </div>
        </div>

        {/* Tactical Status Ribbon - Single line, animated sensors, no description paragraphs */}
        <section className="inline-summary !py-2.5" aria-label="Tóm tắt tài nguyên tác chiến">
          <span className="sm:whitespace-nowrap"><Users size={15} className="text-[#ab2523] animate-pulse" /> {t('preview.officers')}: <strong>24</strong></span>
          <span className="sm:whitespace-nowrap"><MapPinned size={15} className="text-[#007f3e]" /> {t('preview.chargingStations')}: <strong>3</strong></span>
          <span className="sm:whitespace-nowrap"><PlaneTakeoff size={15} className="text-[#ab2523] animate-bounce" /> {t('preview.readyFleet')}: <strong>12</strong></span>
          <span className="sm:whitespace-nowrap"><Boxes size={15} className="text-[#64748b]" /> {t('preview.sensors')}: <strong>48</strong></span>
          <span className="sm:whitespace-nowrap"><Activity size={15} className="text-[#007f3e]" /> {t('preview.combatHours')}: <strong>1,280h</strong></span>
          <span className="sm:whitespace-nowrap ml-auto hidden sm:inline-flex items-center gap-1.5 text-xs text-[#007f3e] font-bold">
            <Wifi size={13} className="animate-pulse" /> {t('preview.broadbandActive')}
          </span>
        </section>

        {/* KPI Cards Grid - Strictly single line, NO description text, animated icons */}
        <section className="kpi-grid">
          <div className="kpi-card tech-hud-corner hover:shadow-md transition">
            <div className="kpi-icon kpi-icon-blue">
              <PlaneTakeoff size={20} className="animate-uav-hover text-[#ab2523]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="sm:whitespace-nowrap font-medium text-xs text-[#7c7c7c]">{t('preview.kpiFleet')}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-[#007f3e] bg-[#ecfdf5] border border-[#a7f3d0] sm:whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#007f3e] animate-ping" /> {t('preview.kpiFleetReady', { count: 12 })}
                </span>
              </div>
              <strong className="text-2xl font-black text-[#202020] mt-1 block">16</strong>
            </div>
          </div>

          <div className="kpi-card tech-hud-corner hover:shadow-md transition">
            <div className="kpi-icon kpi-icon-green">
              <Compass size={20} className="animate-spin text-[#007f3e]" style={{ animationDuration: '8s' }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="sm:whitespace-nowrap font-medium text-xs text-[#7c7c7c]">{t('preview.kpiSuccessRate')}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-[#007f3e] bg-[#ecfdf5] border border-[#a7f3d0] sm:whitespace-nowrap">
                  {t('preview.kpiFlights', { count: 142 })}
                </span>
              </div>
              <strong className="text-2xl font-black text-[#202020] mt-1 block">98.4%</strong>
            </div>
          </div>

          <div className="kpi-card tech-hud-corner hover:shadow-md transition">
            <div className="kpi-icon kpi-icon-amber">
              <BatteryCharging size={20} className="animate-pulse text-[#b45309]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="sm:whitespace-nowrap font-medium text-xs text-[#7c7c7c]">{t('preview.kpiStationEnergy')}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-[#b45309] bg-[#fffbeb] border border-[#fde68a] sm:whitespace-nowrap">
                  {t('preview.kpiSolar')}
                </span>
              </div>
              <strong className="text-2xl font-black text-[#202020] mt-1 block">94%</strong>
            </div>
          </div>

          <div className="kpi-card tech-hud-corner hover:shadow-md transition">
            <div className="kpi-icon kpi-icon-slate">
              <RadioTower size={20} className="animate-pulse text-[#ab2523]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="sm:whitespace-nowrap font-medium text-xs text-[#7c7c7c]">{t('preview.kpiLatency')}</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold text-[#ab2523] bg-[#fdf2f2] border border-[#fecaca] sm:whitespace-nowrap">
                  {t('preview.kpiRtkPrecision')}
                </span>
              </div>
              <strong className="text-2xl font-black text-[#202020] mt-1 block">14 ms</strong>
            </div>
          </div>
        </section>

        {/* Operations Panels Grid */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(350px,0.65fr)]">
          {/* Main Table: Fleet Status */}
          <div className="min-w-0 space-y-5">
            <div className="console-panel tech-hud-corner">
              {/* Header: strictly single line, no description */}
              <div className="console-panel-header flex-wrap !min-h-[52px] !py-3">
                <div className="flex items-center gap-2">
                  <Radar size={18} className="text-[#ab2523] animate-spin" style={{ animationDuration: '5s' }} />
                  <h2 className="text-sm font-bold text-[#202020] sm:whitespace-nowrap">{t('preview.fleetTableTitle')}</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ab2523] px-2.5 py-0.5 rounded-full bg-[#fdf2f2] border border-[#fecaca] sm:whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ab2523] animate-ping" />
                  {t('preview.activeDevices')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="console-table">
                  <thead>
                    <tr>
                      <th className="sm:whitespace-nowrap">{t('preview.thDevice')}</th>
                      <th className="sm:whitespace-nowrap">{t('preview.thStatus')}</th>
                      <th className="sm:whitespace-nowrap">{t('preview.thStation')}</th>
                      <th className="sm:whitespace-nowrap">{t('preview.thManufacturer')}</th>
                      <th className="sm:whitespace-nowrap text-right">{t('preview.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockUavs.map((uav) => (
                      <tr key={uav.id} className="hover:bg-[#fdf2f2]/40 transition group">
                        <td className="sm:whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#202020]">{uav.model}</span>
                            <span className="font-mono text-[11px] text-[#7c7c7c] px-1.5 py-0.5 rounded bg-slate-100">{uav.serialNumber}</span>
                          </div>
                        </td>
                        <td className="sm:whitespace-nowrap">
                          {uav.status === 'READY' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold text-[#007f3e] bg-[#ecfdf5] border border-[#a7f3d0]">
                              <span className="h-2 w-2 rounded-full bg-[#007f3e] animate-ping" /> {t('preview.statusReady')}
                            </span>
                          ) : uav.status === 'IN_FLIGHT' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold text-[#0369a1] bg-[#f0f9ff] border border-[#bae6fd]">
                              <PlaneTakeoff size={13} className="animate-bounce" /> {t('preview.statusInFlight')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold text-[#b45309] bg-[#fffbeb] border border-[#fde68a]">
                              <span className="h-2 w-2 rounded-full bg-[#b45309]" /> {t('preview.statusMaintenance')}
                            </span>
                          )}
                        </td>
                        <td className="sm:whitespace-nowrap text-sm font-semibold text-[#202020]">{uav.stationName}</td>
                        <td className="sm:whitespace-nowrap text-sm text-[#7c7c7c]">{uav.manufacturer}</td>
                        <td className="sm:whitespace-nowrap text-right">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-[#ab2523] bg-[#fdf2f2] hover:bg-[#ab2523] hover:text-white transition group-hover:shadow-sm"
                          >
                            <Eye size={13} className="group-hover:animate-pulse" /> {t('preview.btnMonitor')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stations Overview - Single line, no description */}
            <div className="console-panel tech-hud-corner">
              <div className="console-panel-header flex-wrap !min-h-[52px] !py-3">
                <div className="flex items-center gap-2">
                  <Radio size={18} className="text-[#007f3e] animate-pulse" />
                  <h2 className="text-sm font-bold text-[#202020] sm:whitespace-nowrap">{t('preview.stationTableTitle')}</h2>
                </div>
                <Link href="/operations?tab=stations" className="text-xs font-bold text-[#ab2523] hover:underline flex items-center gap-1 sm:whitespace-nowrap">
                  {t('preview.manageStations')} <ArrowUpRight size={13} />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="console-table">
                  <thead>
                    <tr>
                      <th className="sm:whitespace-nowrap">{t('preview.thCodeName')}</th>
                      <th className="sm:whitespace-nowrap">{t('preview.thConnection')}</th>
                      <th className="sm:whitespace-nowrap">{t('preview.thAddress')}</th>
                      <th className="sm:whitespace-nowrap">{t('preview.thCoords')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockStations.map((station) => (
                      <tr key={station.id} className="hover:bg-slate-50 transition">
                        <td className="sm:whitespace-nowrap font-bold text-[#202020]">
                          <span>{station.code} • {station.name}</span>
                        </td>
                        <td className="sm:whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold text-[#007f3e] bg-[#ecfdf5] border border-[#a7f3d0]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#007f3e] animate-pulse" /> ONLINE
                          </span>
                        </td>
                        <td className="sm:whitespace-nowrap text-sm text-[#202020]">{station.address}</td>
                        <td className="sm:whitespace-nowrap font-mono text-xs text-[#7c7c7c]">{station.coords}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic 3D Radar Stage & Tactical Quick Actions */}
          <div className="min-w-0 space-y-5">
            {/* 3D Hangar Card with Dynamic Laser Scan and Radar Sweep */}
            <div className="console-panel tech-hud-corner p-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#e5e7eb] mb-3">
                <div className="flex items-center gap-2">
                  <Crosshair size={16} className="text-[#ab2523] animate-spin" style={{ animationDuration: '6s' }} />
                  <h3 className="text-sm font-black text-[#202020] sm:whitespace-nowrap">VJU-SkyMaster X4 Quadrotor</h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-[#007f3e] bg-[#ecfdf5] border border-[#a7f3d0] sm:whitespace-nowrap">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#007f3e] animate-ping" /> {t('preview.statusReady')}
                </span>
              </div>

              {/* Dynamic Hangar Stage */}
              <div className="uav-viewer-stage rounded-lg flex items-center justify-center relative overflow-hidden bg-[#181a1e] border border-[#333842] min-h-[230px]">
                {/* Laser scan beam moving vertically */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ab2523] to-transparent animate-scan z-20 pointer-events-none" />

                {/* Rotating radar sweep beam */}
                <div className="absolute w-[260px] h-[260px] rounded-full border border-[#ab2523]/30 pointer-events-none flex items-center justify-center">
                  <div className="w-[180px] h-[180px] rounded-full border border-[#ab2523]/20 border-dashed" />
                  <div className="absolute inset-0 rounded-full animate-sweep" style={{ background: 'conic-gradient(from 0deg, rgba(171, 37, 35, 0.25) 0deg, transparent 60deg)' }} />
                </div>

                {/* Floating UAV airframe with hovering animation */}
                <div className="text-center z-10 p-4 animate-uav-hover">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#ab2523]/20 border border-[#ab2523]/40 flex items-center justify-center shadow-lg shadow-[#ab2523]/30 mb-2">
                    <PlaneTakeoff size={36} className="text-white" />
                  </div>
                  <span className="text-xs font-black text-white tracking-wider block sm:whitespace-nowrap">QUADROTOR AIRFRAME ACTIVE</span>
                  <span className="text-[11px] font-mono text-[#a3a3a3] block mt-0.5 sm:whitespace-nowrap">PAYLOAD: 4K GIMBAL + MULTISPECTRAL</span>
                </div>

                {/* HUD corner brackets */}
                <span className="absolute top-2 left-2 text-[10px] font-mono text-[#ab2523] font-bold">┌ HUD-01</span>
                <span className="absolute top-2 right-2 text-[10px] font-mono text-[#ab2523] font-bold">┐ RTK</span>
                <span className="absolute bottom-2 left-2 text-[10px] font-mono text-[#ab2523] font-bold">└ 5.8G</span>
                <span className="absolute bottom-2 right-2 text-[10px] font-mono text-[#ab2523] font-bold">┘ 360°</span>
              </div>

              {/* Single line telemetry telemetry values */}
              <div className="mt-3 pt-3 border-t border-[#e5e7eb] flex flex-wrap items-center justify-between text-xs font-semibold">
                <span className="sm:whitespace-nowrap text-[#7c7c7c]">{t('preview.battery')}: <strong className="text-[#007f3e]">98% (42p)</strong></span>
                <span className="sm:whitespace-nowrap text-[#7c7c7c]">{t('preview.altitude')}: <strong className="text-[#202020]">120m AGL</strong></span>
                <span className="sm:whitespace-nowrap text-[#7c7c7c]">RTK: <strong className="text-[#007f3e]">&lt; 1.5 cm</strong></span>
              </div>
            </div>

            {/* Quick Actions Panel - Single line buttons with animated hover effects */}
            <div className="console-panel tech-hud-corner p-4">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#e5e7eb] mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#ab2523] animate-pulse" />
                  <h3 className="text-sm font-black text-[#202020] sm:whitespace-nowrap">{t('preview.quickActions')}</h3>
                </div>
                <span className="text-xs font-mono text-[#7c7c7c] sm:whitespace-nowrap">{t('preview.modulesCount')}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-2.5 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#ab2523] hover:bg-[#fdf2f2] transition shadow-sm hover:shadow"
                  >
                    <div className="p-2 rounded-md bg-slate-100 text-[#7c7c7c] group-hover:bg-[#ab2523] group-hover:text-white transition shrink-0">
                      <Icon size={18} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-xs font-bold text-[#202020] group-hover:text-[#ab2523] transition sm:whitespace-nowrap truncate">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
