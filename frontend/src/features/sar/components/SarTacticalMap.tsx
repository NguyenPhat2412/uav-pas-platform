'use client';

import React, {useMemo, useState} from 'react';
import {BatteryCharging, CheckCircle2, Compass, RotateCcw, Route, ShieldAlert, ZoomIn, ZoomOut} from 'lucide-react';
import type {DetectionItem} from "@/features/sar/components/AiViewfinder";
import {apiClient} from '@/lib/api';
import {
    calculateRthFeasibility,
    generateExpandingSquarePattern,
    isPointInsideGeofence,
    type LatLng,
    type Waypoint
} from "@/features/sar/utils/sarAlgorithms";
import {useI18n} from '@/contexts/I18nContext';

interface SarTacticalMapProps {
    selectedCandidate?: DetectionItem | null;
    onSelectCandidate?: (candidate: DetectionItem) => void;
}

export function SarTacticalMap({selectedCandidate, onSelectCandidate}: SarTacticalMapProps) {
    const {t} = useI18n();
    const [zoom, setZoom] = useState(1);
    const [showGrid, setShowGrid] = useState(true);
    const [showFlightPath, setShowFlightPath] = useState(true);
    const [patternType, setPatternType] = useState<'EXPANDING_SQUARE' | 'PARALLEL_SWEEP'>('EXPANDING_SQUARE');
    const [isGenerated, setIsGenerated] = useState(false);
    const [uavBattery, setUavBattery] = useState(68); // 68% pin

    // Vị trí thực tế GPS của LKP (Last Known Position)
    const lkpGps: LatLng = {lat: 20.7284, lng: 107.0512};
    // Trạm điều hành ST-01
    const stationGps: LatLng = {lat: 20.7100, lng: 107.0300};
    // Vị trí hiện tại của UAV
    const currentUavGps: LatLng = {lat: 20.7310, lng: 107.0540};

    // Đa giác ranh giới Geofence hợp lệ (Hải Phòng / Cát Bà)
    const geofencePolygon: LatLng[] = [
        {lat: 20.7450, lng: 107.0350},
        {lat: 20.7480, lng: 107.0750},
        {lat: 20.7120, lng: 107.0820},
        {lat: 20.7050, lng: 107.0420},
        {lat: 20.7200, lng: 107.0280}
    ];

    // 1. TÍNH TOÁN THUẬT TOÁN ĐƯỜNG BAY CỨU NẠN (IAMSAR SEARCH PATTERN)
    const generatedWaypoints: Waypoint[] = useMemo(() => {
        if (!isGenerated) return [];
        return generateExpandingSquarePattern(lkpGps, 65, 10, 80, 14);
    }, [isGenerated]);

    // 2. TÍNH TOÁN THUẬT TOÁN RAY-CASTING KIỂM TRA GEOFENCE
    const isUavInsideGeofence = useMemo(() => {
        return isPointInsideGeofence(currentUavGps, geofencePolygon);
    }, [currentUavGps]);

    // 3. TÍNH TOÁN THUẬT TOÁN DỰ BÁO TIÊU HAO PIN & RTH FEASIBILITY
    const rthFeasibility = useMemo(() => {
        return calculateRthFeasibility(currentUavGps, stationGps, uavBattery, 14, 2.2, 15);
    }, [currentUavGps, uavBattery]);

    // Tọa độ SVG cho hiển thị (1000 x 600)
    const searchPolygonSvg = "280,120 780,100 860,460 360,520 220,320";
    const uavPosition = {x: 540, y: 310, heading: 45};
    const lkpPosition = {x: 380, y: 220, label: t('opsShared.sar.map.lkpLabel')};

    // Chuyển đổi các waypoints thuật toán sang tọa độ SVG quanh tâm LKP
    const svgWaypoints = useMemo(() => {
        if (!isGenerated || generatedWaypoints.length === 0) {
            return [
                {x: 180, y: 480},
                {x: 260, y: 380},
                {x: 340, y: 240},
                {x: 420, y: 230},
                {x: 490, y: 320},
                {x: 540, y: 310},
            ];
        }
        // Map waypoints từ tâm LKP
        return generatedWaypoints.map((wp, idx) => {
            const offsetX = (wp.lng - lkpGps.lng) * 90000;
            const offsetY = -(wp.lat - lkpGps.lat) * 90000;
            return {
                x: Math.round(lkpPosition.x + offsetX),
                y: Math.round(lkpPosition.y + offsetY),
                order: wp.order,
                id: wp.id,
                legDist: wp.legDistanceMeters
            };
        });
    }, [isGenerated, generatedWaypoints]);

    // Flight path points alias for tactical HUD & test compatibility
    const flightPathPoints = svgWaypoints;

    // Danh sách phát hiện nạn nhân
    const detectionPins = [
        {id: 'TRK-101', x: 560, y: 295, label: t('opsShared.sar.map.pins.victim'), type: 'person'},
        {id: 'TRK-102', x: 580, y: 325, label: t('opsShared.sar.map.pins.lifebuoy'), type: 'lifebuoy'},
        {id: 'TRK-103', x: 460, y: 360, label: t('opsShared.sar.map.pins.suspected'), type: 'person'},
    ];

    const sectors = [
        {id: 'A1', x: 300, y: 150, status: 'DONE', label: t('opsShared.sar.map.sectors.done')},
        {id: 'A2', x: 550, y: 140, status: 'DONE', label: t('opsShared.sar.map.sectors.done')},
        {id: 'B1', x: 320, y: 300, status: 'IN_PROGRESS', label: t('opsShared.sar.map.sectors.inProgress')},
        {id: 'B2', x: 570, y: 290, status: 'CURRENT', label: t('opsShared.sar.map.sectors.current')},
        {id: 'C1', x: 380, y: 420, status: 'PENDING', label: t('opsShared.sar.map.sectors.pending')},
        {id: 'C2', x: 620, y: 410, status: 'PENDING', label: t('opsShared.sar.map.sectors.pending')},
    ];

    return (
        <div
            className="flex flex-col h-full bg-card text-slate-900 rounded-2xl overflow-hidden border border-border shadow-sm">
            {/* Top Tactical Command Toolbar */}
            <div
                className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-border gap-2">
                <div className="flex items-center gap-2">
                    <Compass size={17} className="text-success animate-spin-slow"/>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            {t('opsShared.sar.map.title')}
          </span>
                    <span
                        className="text-[10px] bg-red-50 text-primary px-2 py-0.5 rounded tabular-nums font-bold border border-red-200">
            VJU DEFENSE OPS
          </span>
                </div>

                {/* Algorithm Control Hub */}
                <div className="flex max-w-full flex-wrap items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => {
                            const nextState = !isGenerated;
                            setIsGenerated(nextState);
                            if (nextState) {
                                void apiClient.post('/api/v1/sar/flight-plan', {
                                    lkpLatitude: lkpGps.lat,
                                    lkpLongitude: lkpGps.lng,
                                    trackSpacingMeters: 65,
                                    maxLegs: 10,
                                    altitudeMeters: 80,
                                    speedMps: 14,
                                }).catch(() => null);
                            }
                        }}
                        className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer ${
                            isGenerated
                                ? 'bg-primary hover:bg-primary-hover text-white'
                                : 'bg-success hover:bg-emerald-800 text-white'
                        }`}
                    >
                        <Route size={14}/>
                        {isGenerated ? t('opsShared.sar.map.cancelPath') : t('opsShared.sar.map.generatePath')}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowFlightPath(!showFlightPath)}
                        className={`shrink-0 whitespace-nowrap px-2.5 py-1.5 rounded-lg font-bold transition border cursor-pointer ${
                            showFlightPath ? 'bg-emerald-50 text-success border-emerald-200' : 'bg-card text-slate-600 border-border hover:bg-slate-100'
                        }`}
                    >
                        {t('opsShared.sar.map.trail', {state: showFlightPath ? t('opsShared.sar.map.on') : t('opsShared.sar.map.off')})}
                    </button>

                    <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

                    <button
                        type="button"
                        onClick={() => setZoom(prev => Math.min(prev + 0.2, 1.8))}
                        className="shrink-0 whitespace-nowrap p-1.5 bg-card hover:bg-slate-100 text-slate-700 rounded-lg border border-border transition cursor-pointer"
                        title={t('opsShared.sar.map.zoomIn')}
                        aria-label={t('opsShared.sar.map.zoomIn')}
                    >
                        <ZoomIn size={14}/>
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.8))}
                        className="shrink-0 whitespace-nowrap p-1.5 bg-card hover:bg-slate-100 text-slate-700 rounded-lg border border-border transition cursor-pointer"
                        title={t('opsShared.sar.map.zoomOut')}
                        aria-label={t('opsShared.sar.map.zoomOut')}
                    >
                        <ZoomOut size={14}/>
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom(1)}
                        className="shrink-0 whitespace-nowrap p-1.5 bg-card hover:bg-slate-100 text-slate-700 rounded-lg border border-border transition cursor-pointer"
                        title={t('opsShared.sar.map.resetZoom')}
                        aria-label={t('opsShared.sar.map.resetZoom')}
                    >
                        <RotateCcw size={14}/>
                    </button>
                </div>
            </div>

            {/* Algorithm Telemetry Status Bar (Geofence + Battery RTH) */}
            <div
                className="bg-card border-b border-border px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
                {/* Geofence Status */}
                <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px] font-bold">{t('opsShared.sar.map.geofenceLabel')}</span>
                    {isUavInsideGeofence ? (
                        <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-success border border-emerald-200">
              <CheckCircle2 size={12}/> {t('opsShared.sar.map.insideCorridor')}
            </span>
                    ) : (
                        <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-primary border border-red-200 animate-pulse">
              <ShieldAlert size={12}/> {t('opsShared.sar.map.geofenceViolation')}
            </span>
                    )}
                </div>

                {/* Battery & RTH Feasibility */}
                <div className="flex items-center gap-3 tabular-nums text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700">
                        <BatteryCharging size={15} className="text-success"/>
                        <span>{t('opsShared.sar.map.battery')} <strong className="text-slate-900">{uavBattery}%</strong></span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5 text-slate-700">
                        <span>RTH HOME: <strong
                            className="text-slate-900">{rthFeasibility.distanceHomeMeters}m</strong> {t('opsShared.sar.map.rthMinutes', {minutes: (rthFeasibility.flightTimeRequiredSeconds / 60).toFixed(1)})}</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">{t('opsShared.sar.map.minRthBattery')}</span>
                        <strong className="text-amber-600">{rthFeasibility.batteryRequiredPercent}%</strong>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                        rthFeasibility.recommendedAction === 'CONTINUE_MISSION'
                            ? 'bg-emerald-50 text-success'
                            : 'bg-red-50 text-primary animate-ping'
                    }`}>
            {rthFeasibility.recommendedAction === 'CONTINUE_MISSION' ? t('opsShared.sar.map.safeContinue') : t('opsShared.sar.map.rthNow')}
          </span>
                </div>
            </div>

            {/* Interactive Tactical Canvas */}
            <div className="relative flex-1 bg-sky-50 min-h-[380px] overflow-hidden select-none">
                <div
                    className="w-full h-full flex items-center justify-center transition-transform duration-300"
                    style={{transform: `scale(${zoom})`}}
                >
                    <svg
                        viewBox="0 0 1000 600"
                        className="w-full h-full max-h-[520px]"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern id="tacGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                                <path d="M 50 0 L 0 0 0 50" fill="none" className="stroke-blue-100" strokeWidth="0.8"/>
                            </pattern>

                            <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="var(--success)" stopOpacity="0.35"/>
                                <stop offset="70%" stopColor="var(--success)" stopOpacity="0.08"/>
                                <stop offset="100%" stopColor="var(--success)" stopOpacity="0"/>
                            </radialGradient>
                        </defs>

                        {/* Base tactical grid */}
                        <rect width="1000" height="600" className="fill-sky-50"/>
                        <rect width="1000" height="600" fill="url(#tacGrid)"/>

                        {/* Coastline */}
                        <path
                            d="M 50,0 Q 120,200 160,350 T 200,600"
                            fill="none"
                            className="stroke-slate-700"
                            strokeWidth="3"
                        />
                        <text x="70" y="260" className="fill-slate-500 font-sans" fontSize="11" letterSpacing="2">
                            {t('opsShared.sar.map.coastline')}
                        </text>

                        {/* Station Marker */}
                        <g transform="translate(180, 480)">
                            <rect x="-14" y="-14" width="28" height="28" rx="4" className="fill-slate-900 stroke-success"
                                  strokeWidth="2"/>
                            <circle cx="0" cy="0" r="4" className="fill-success"/>
                            <text x="20" y="4" className="fill-emerald-200 font-sans" fontSize="11" fontWeight="bold">
                                {t('opsShared.sar.map.homeStation')}
                            </text>
                        </g>

                        {/* Search Area Polygon (Geofence) */}
                        <polygon
                            points={searchPolygonSvg}
                            className="fill-success stroke-success"
                            fillOpacity="0.12"
                            strokeWidth="2.5"
                            strokeDasharray="6 4"
                        />
                        <text x="500" y="115" className="fill-emerald-200 font-sans" fontSize="11" fontWeight="bold"
                              textAnchor="middle">
                            {t('opsShared.sar.map.searchArea')}
                        </text>

                        {/* Sector Grid Overlay */}
                        {showGrid && sectors.map((sec) => (
                            <g key={sec.id} transform={`translate(${sec.x}, ${sec.y})`}>
                                <rect
                                    x="-60"
                                    y="-40"
                                    width="120"
                                    height="80"
                                    className={sec.status === 'CURRENT' ? 'fill-emerald-950 stroke-success' : 'fill-slate-900 stroke-slate-700'}
                                    fillOpacity={sec.status === 'CURRENT' ? '0.4' : '0.2'}
                                    strokeWidth="1"
                                    rx="4"
                                />
                                <text x="0" y="-15" className="fill-slate-400 font-sans" fontSize="13" fontWeight="bold"
                                      textAnchor="middle">
                                    SECTOR {sec.id}
                                </text>
                                <text x="0" y="8"
                                      className={`font-sans ${sec.status === 'DONE' ? 'fill-success' : sec.status === 'CURRENT' ? 'fill-sky-400' : 'fill-slate-500'}`}
                                      fontSize="10" textAnchor="middle">
                                    {sec.label}
                                </text>
                            </g>
                        ))}

                        {/* Dynamic Search Flight Path (Calculated from Algorithm) */}
                        {showFlightPath && (
                            <g>
                                <polyline
                                    points={svgWaypoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    className={isGenerated ? 'stroke-primary' : 'stroke-sky-400'}
                                    strokeWidth={isGenerated ? '2.5' : '2'}
                                    strokeDasharray={isGenerated ? 'none' : '4 3'}
                                />
                                {svgWaypoints.map((p, i) => (
                                    <g key={i} transform={`translate(${p.x}, ${p.y})`}>
                                        <circle cx="0" cy="0" r={isGenerated ? '5' : '3'}
                                                className={isGenerated ? 'fill-primary' : 'fill-sky-400'}/>
                                        {isGenerated && i > 0 && (
                                            <text x="7" y="3" className="fill-red-200 font-sans" fontSize="9" fontWeight="bold">
                                                WP{i}
                                            </text>
                                        )}
                                    </g>
                                ))}
                            </g>
                        )}

                        {/* Last Known Position (LKP) Pin & Drift Radius */}
                        <g transform={`translate(${lkpPosition.x}, ${lkpPosition.y})`}>
                            <circle cx="0" cy="0" r="50" className="fill-primary stroke-primary" fillOpacity="0.12"
                                    strokeWidth="1.5" strokeDasharray="3 3"/>
                            <circle cx="0" cy="0" r="8" className="fill-primary animate-ping" opacity="0.7"/>
                            <circle cx="0" cy="0" r="5" className="fill-primary-hover"/>
                            <rect x="12" y="-12" width="175" height="24" rx="4" className="fill-red-950 stroke-primary"
                                  strokeWidth="1"/>
                            <text x="18" y="4" className="fill-red-200 font-sans" fontSize="10" fontWeight="bold">
                                🚩 {lkpPosition.label}
                            </text>
                        </g>

                        {/* Detection Target Pins */}
                        {detectionPins.map((pin) => (
                            <g
                                key={pin.id}
                                transform={`translate(${pin.x}, ${pin.y})`}
                                className="cursor-pointer group"
                                onClick={() => {
                                    const candidate: DetectionItem = {
                                        id: pin.id,
                                        label: pin.label,
                                        confidence: 0.94,
                                        box: {top: 40, left: 45, width: 10, height: 15},
                                        color: pin.type === 'person' ? 'var(--success)' : 'var(--warning)',
                                        timestamp: '14:23:05',
                                        gpsEstimate: '20.7284° N, 107.0512° E',
                                        verified: true,
                                    };
                                    if (onSelectCandidate) onSelectCandidate(candidate);
                                }}
                            >
                                <circle cx="0" cy="0" r="14" className={pin.type === 'person' ? 'fill-success' : 'fill-amber-500'}
                                        fillOpacity="0.2"/>
                                <circle cx="0" cy="0" r="6" className={`${pin.type === 'person' ? 'fill-success' : 'fill-amber-500'} stroke-white`}
                                        strokeWidth="2"/>
                                <rect x="10" y="-11" width="128" height="22" rx="6" className="fill-white stroke-slate-300"
                                      strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))"/>
                                <text x="16" y="4" className="fill-slate-900 font-sans" fontSize="10" fontWeight="bold">
                                    {pin.type === 'person' ? '👤' : '🛟'} {pin.label}
                                </text>
                            </g>
                        ))}

                        {/* Real-time UAV Marker with Heading & Radar Sweep */}
                        <g transform={`translate(${uavPosition.x}, ${uavPosition.y})`}>
                            <circle cx="0" cy="0" r="75" fill="url(#radarPulse)"/>
                            <circle cx="0" cy="0" r="75" fill="none" className="stroke-success" strokeWidth="1.5"
                                    strokeOpacity="0.3"/>

                            <g transform={`rotate(${uavPosition.heading})`}>
                                <polygon
                                    points="0,-16 12,12 0,6 -12,12"
                                    className="fill-primary stroke-white"
                                    strokeWidth="2"
                                />
                            </g>

                            <rect x="16" y="-12" width="134" height="24" rx="6" className="fill-white stroke-primary"
                                  strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(171,37,35,0.15))"/>
                            <text x="22" y="4" className="fill-primary font-sans" fontSize="10" fontWeight="800">
                                UAV-01 · HDG 045° (VJU)
                            </text>
                        </g>
                    </svg>
                </div>
            </div>

            {/* Structured Tactical Map Footer Bar (Aligned with AiViewfinder bottom panel) */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-border flex flex-col justify-between gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
              <span>{t('opsShared.sar.map.legendPath', {state: isGenerated ? t('opsShared.sar.map.legs', {count: svgWaypoints.length}) : t('opsShared.sar.map.notActivated')})}</span>
            </span>
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0"></span>
              <span>{t('opsShared.sar.map.legendGeofence')}</span>
            </span>
                    </div>
                </div>

                <div
                    className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/80 text-[11px] tabular-nums text-slate-600">
                    <div className="flex items-center gap-3">
                        <span>LKP: <strong className="text-primary">{lkpGps.lat}°N, {lkpGps.lng}°E</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>HAVERSINE HOME: <strong
                            className="text-success">{rthFeasibility.distanceHomeMeters}m</strong></span>
                    </div>
                    <span
                        className="text-[10px] bg-card px-2.5 py-0.5 rounded-md border border-border font-bold text-slate-700">
            {t('opsShared.sar.map.scanningTarget')}
          </span>
                </div>
            </div>
        </div>
    );
}
