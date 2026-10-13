'use client';

import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  Navigation, 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  BatteryCharging,
  Cpu,
  Route,
  Zap,
  Plane
} from 'lucide-react';
import type { DetectionItem } from './AiViewfinder';
import { apiClient } from '@/lib/api.client';
import { 
  generateExpandingSquarePattern, 
  isPointInsideGeofence, 
  calculateRthFeasibility, 
  calculateHaversineDistance,
  type Waypoint,
  type LatLng 
} from '../utils/sarAlgorithms';

interface SarTacticalMapProps {
  selectedCandidate?: DetectionItem | null;
  onSelectCandidate?: (candidate: DetectionItem) => void;
}

export function SarTacticalMap({ selectedCandidate, onSelectCandidate }: SarTacticalMapProps) {
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [patternType, setPatternType] = useState<'EXPANDING_SQUARE' | 'PARALLEL_SWEEP'>('EXPANDING_SQUARE');
  const [isGenerated, setIsGenerated] = useState(false);
  const [uavBattery, setUavBattery] = useState(68); // 68% pin

  // Vị trí thực tế GPS của LKP (Last Known Position)
  const lkpGps: LatLng = { lat: 20.7284, lng: 107.0512 };
  // Trạm điều hành ST-01
  const stationGps: LatLng = { lat: 20.7100, lng: 107.0300 };
  // Vị trí hiện tại của UAV
  const currentUavGps: LatLng = { lat: 20.7310, lng: 107.0540 };

  // Đa giác ranh giới Geofence hợp lệ (Hải Phòng / Cát Bà)
  const geofencePolygon: LatLng[] = [
    { lat: 20.7450, lng: 107.0350 },
    { lat: 20.7480, lng: 107.0750 },
    { lat: 20.7120, lng: 107.0820 },
    { lat: 20.7050, lng: 107.0420 },
    { lat: 20.7200, lng: 107.0280 }
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
  const uavPosition = { x: 540, y: 310, heading: 45 };
  const lkpPosition = { x: 380, y: 220, label: 'LKP: Tàu đánh cá TB-9284' };

  // Chuyển đổi các waypoints thuật toán sang tọa độ SVG quanh tâm LKP
  const svgWaypoints = useMemo(() => {
    if (!isGenerated || generatedWaypoints.length === 0) {
      return [
        { x: 180, y: 480 },
        { x: 260, y: 380 },
        { x: 340, y: 240 },
        { x: 420, y: 230 },
        { x: 490, y: 320 },
        { x: 540, y: 310 },
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
    { id: 'TRK-101', x: 560, y: 295, label: 'Nạn nhân #1 (94%)', type: 'person' },
    { id: 'TRK-102', x: 580, y: 325, label: 'Phao cứu sinh (91%)', type: 'lifebuoy' },
    { id: 'TRK-103', x: 460, y: 360, label: 'Nghi vấn #2 (82%)', type: 'person' },
  ];

  const sectors = [
    { id: 'A1', x: 300, y: 150, status: 'DONE', label: '100% Đã quét' },
    { id: 'A2', x: 550, y: 140, status: 'DONE', label: '100% Đã quét' },
    { id: 'B1', x: 320, y: 300, status: 'IN_PROGRESS', label: 'Đang quét...' },
    { id: 'B2', x: 570, y: 290, status: 'CURRENT', label: 'UAV tại đây' },
    { id: 'C1', x: 380, y: 420, status: 'PENDING', label: 'Chờ quét' },
    { id: 'C2', x: 620, y: 410, status: 'PENDING', label: 'Chờ quét' },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Top Tactical Command Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-2">
          <Compass size={17} className="text-[#007f3e] animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Bản đồ Tác chiến Cứu nạn SAR (Tactical Grid)
          </span>
          <span className="text-[10px] bg-[#fdf2f2] text-[#ab2523] px-2 py-0.5 rounded font-mono font-bold border border-[#fecaca]">
            VJU DEFENSE OPS
          </span>
        </div>

        {/* Algorithm Control Hub */}
        <div className="flex items-center gap-2 text-xs">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition shadow-xs cursor-pointer ${
              isGenerated 
                ? 'bg-[#ab2523] hover:bg-[#8f1c1a] text-white' 
                : 'bg-[#007f3e] hover:bg-[#006632] text-white'
            }`}
          >
            <Route size={14} />
            {isGenerated ? 'Hủy đường bay toán học' : 'Tự động sinh đường bay (IAMSAR)'}
          </button>

          <button
            type="button"
            onClick={() => setShowFlightPath(!showFlightPath)}
            className={`px-2.5 py-1.5 rounded-lg font-bold transition border cursor-pointer ${
              showFlightPath ? 'bg-[#ecfdf5] text-[#007f3e] border-[#a7f3d0]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Vệt bay ({showFlightPath ? 'Bật' : 'Tắt'})
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(prev + 0.2, 1.8))}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.8))}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Đặt lại"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Algorithm Telemetry Status Bar (Geofence + Battery RTH) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-3">
        {/* Geofence Status */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[11px] font-bold">ĐỊA HÀNG RÀO (RAY-CASTING):</span>
          {isUavInsideGeofence ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ecfdf5] text-[#007f3e] border border-[#a7f3d0]">
              <CheckCircle2 size={12} /> TRONG HÀNH LANG AN TOÀN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fdf2f2] text-[#ab2523] border border-[#fecaca] animate-pulse">
              <ShieldAlert size={12} /> VI PHẠM GEOFENCE!
            </span>
          )}
        </div>

        {/* Battery & RTH Feasibility */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-700">
            <BatteryCharging size={15} className="text-[#007f3e]" />
            <span>PIN: <strong className="text-slate-900">{uavBattery}%</strong></span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5 text-slate-700">
            <span>RTH HOME: <strong className="text-slate-900">{rthFeasibility.distanceHomeMeters}m</strong> (~{(rthFeasibility.flightTimeRequiredSeconds / 60).toFixed(1)}p)</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">PIN TỐI THIỂU RTH:</span>
            <strong className="text-amber-600">{rthFeasibility.batteryRequiredPercent}%</strong>
          </div>
          <span className={`px-2 py-0.5 rounded font-bold ${
            rthFeasibility.recommendedAction === 'CONTINUE_MISSION' 
              ? 'bg-[#ecfdf5] text-[#007f3e]' 
              : 'bg-[#fdf2f2] text-[#ab2523] animate-ping'
          }`}>
            {rthFeasibility.recommendedAction === 'CONTINUE_MISSION' ? 'AN TOÀN TIẾP TỤC' : 'YÊU CẦU RTH NGAY'}
          </span>
        </div>
      </div>

      {/* Interactive Tactical Canvas */}
      <div className="relative flex-1 bg-[#f0f7ff] min-h-[380px] overflow-hidden select-none">
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          <svg
            viewBox="0 0 1000 600"
            className="w-full h-full max-h-[520px]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="tacGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#dbeafe" strokeWidth="0.8" />
              </pattern>
              
              <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#007f3e" stopOpacity="0.35" />
                <stop offset="70%" stopColor="#007f3e" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#007f3e" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Base tactical grid */}
            <rect width="1000" height="600" fill="#f0f7ff" />
            <rect width="1000" height="600" fill="url(#tacGrid)" />

            {/* Coastline */}
            <path
              d="M 50,0 Q 120,200 160,350 T 200,600"
              fill="none"
              stroke="#334155"
              strokeWidth="3"
            />
            <text x="70" y="260" fill="#64748b" fontSize="11" fontFamily="monospace" letterSpacing="2">
              ĐƯỜNG BỜ BIỂN (COASTLINE)
            </text>

            {/* Station Marker */}
            <g transform="translate(180, 480)">
              <rect x="-14" y="-14" width="28" height="28" rx="4" fill="#0f172a" stroke="#007f3e" strokeWidth="2" />
              <circle cx="0" cy="0" r="4" fill="#007f3e" />
              <text x="20" y="4" fill="#a7f3d0" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                TRẠM ĐIỀU HÀNH #ST-01 (HOME)
              </text>
            </g>

            {/* Search Area Polygon (Geofence) */}
            <polygon
              points={searchPolygonSvg}
              fill="#007f3e"
              fillOpacity="0.12"
              stroke="#007f3e"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <text x="500" y="115" fill="#a7f3d0" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              VÙNG TÌM KIẾM CỨU NẠN (GEOFENCE BOUNDARY)
            </text>

            {/* Sector Grid Overlay */}
            {showGrid && sectors.map((sec) => (
              <g key={sec.id} transform={`translate(${sec.x}, ${sec.y})`}>
                <rect 
                  x="-60" 
                  y="-40" 
                  width="120" 
                  height="80" 
                  fill={sec.status === 'CURRENT' ? '#064e3b' : '#0f172a'} 
                  fillOpacity={sec.status === 'CURRENT' ? '0.4' : '0.2'} 
                  stroke={sec.status === 'CURRENT' ? '#007f3e' : '#334155'} 
                  strokeWidth="1" 
                  rx="4" 
                />
                <text x="0" y="-15" fill="#94a3b8" fontSize="13" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  SECTOR {sec.id}
                </text>
                <text x="0" y="8" fill={sec.status === 'DONE' ? '#007f3e' : sec.status === 'CURRENT' ? '#38bdf8' : '#64748b'} fontSize="10" fontFamily="sans-serif" textAnchor="middle">
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
                  stroke={isGenerated ? '#ab2523' : '#38bdf8'}
                  strokeWidth={isGenerated ? '2.5' : '2'}
                  strokeDasharray={isGenerated ? 'none' : '4 3'}
                />
                {svgWaypoints.map((p, i) => (
                  <g key={i} transform={`translate(${p.x}, ${p.y})`}>
                    <circle cx="0" cy="0" r={isGenerated ? '5' : '3'} fill={isGenerated ? '#ab2523' : '#38bdf8'} />
                    {isGenerated && i > 0 && (
                      <text x="7" y="3" fill="#fecaca" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        WP{i}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            )}

            {/* Last Known Position (LKP) Pin & Drift Radius */}
            <g transform={`translate(${lkpPosition.x}, ${lkpPosition.y})`}>
              <circle cx="0" cy="0" r="50" fill="#ab2523" fillOpacity="0.12" stroke="#ab2523" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="0" cy="0" r="8" fill="#ab2523" className="animate-ping" opacity="0.7" />
              <circle cx="0" cy="0" r="5" fill="#8f1c1a" />
              <rect x="12" y="-12" width="175" height="24" rx="4" fill="#450a0a" stroke="#ab2523" strokeWidth="1" />
              <text x="18" y="4" fill="#fecaca" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
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
                    box: { top: 40, left: 45, width: 10, height: 15 },
                    color: pin.type === 'person' ? '#007f3e' : '#f59e0b',
                    timestamp: '14:23:05',
                    gpsEstimate: '20.7284° N, 107.0512° E',
                    verified: true,
                  };
                  if (onSelectCandidate) onSelectCandidate(candidate);
                }}
              >
                <circle cx="0" cy="0" r="14" fill={pin.type === 'person' ? '#007f3e' : '#f59e0b'} fillOpacity="0.2" />
                <circle cx="0" cy="0" r="6" fill={pin.type === 'person' ? '#007f3e' : '#f59e0b'} stroke="#ffffff" strokeWidth="2" />
                <rect x="10" y="-11" width="128" height="22" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
                <text x="16" y="4" fill="#0f172a" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  {pin.type === 'person' ? '👤' : '🛟'} {pin.label}
                </text>
              </g>
            ))}

            {/* Real-time UAV Marker with Heading & Radar Sweep */}
            <g transform={`translate(${uavPosition.x}, ${uavPosition.y})`}>
              <circle cx="0" cy="0" r="75" fill="url(#radarPulse)" />
              <circle cx="0" cy="0" r="75" fill="none" stroke="#007f3e" strokeWidth="1.5" strokeOpacity="0.3" />
              
              <g transform={`rotate(${uavPosition.heading})`}>
                <polygon
                  points="0,-16 12,12 0,6 -12,12"
                  fill="#ab2523"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>

              <rect x="16" y="-12" width="134" height="24" rx="6" fill="#ffffff" stroke="#ab2523" strokeWidth="1.5" filter="drop-shadow(0 2px 4px rgba(171,37,35,0.15))" />
              <text x="22" y="4" fill="#ab2523" fontSize="10" fontWeight="800" fontFamily="monospace">
                UAV-01 · HDG 045° (VJU)
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Structured Tactical Map Footer Bar (Aligned with AiViewfinder bottom panel) */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col justify-between gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ab2523] shrink-0"></span>
              <span>Đường bay IAMSAR Expanding Square ({isGenerated ? `${svgWaypoints.length} chặng` : 'Chưa kích hoạt'})</span>
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-[#007f3e] shrink-0"></span>
              <span>Ranh giới Geofence (Thuật toán Ray-Casting)</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] font-mono text-slate-600">
          <div className="flex items-center gap-3">
            <span>LKP: <strong className="text-[#ab2523]">{lkpGps.lat}°N, {lkpGps.lng}°E</strong></span>
            <span className="text-slate-300">|</span>
            <span>HAVERSINE HOME: <strong className="text-[#007f3e]">{rthFeasibility.distanceHomeMeters}m</strong></span>
          </div>
          <span className="text-[10px] bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-bold text-slate-700">
            SECTOR B2 · ĐANG QUÉT MỤC TIÊU
          </span>
        </div>
      </div>
    </div>
  );
}
