'use client';

import {useEffect, useMemo, useState} from 'react';
import {Activity, AlertTriangle, CheckCircle2, Compass, Mountain, Pause, Play, RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui';
import {UavModelViewer} from '@/components/visuals/UavModelViewer';
import {useMissionTelemetryReplay} from '@/hooks/uav/useTelemetry';
import {useI18n} from '@/providers/I18nContext';
import type {UavAirframeClass} from '@/utils/uav/uav-3d-model';

export interface Mission3DReplayAndTerrainCardProps {
    missionId: number;
    missionCode?: string;
    uavSerial?: string | null;
    uavModel?: string | null;
    status?: string;
}

export function Mission3DReplayAndTerrainCard({
    missionId,
    missionCode,
    uavSerial,
    uavModel,
    status,
}: Mission3DReplayAndTerrainCardProps) {
    const {locale, formatNumber} = useI18n();
    const isEn = locale === 'en';
    const replayQuery = useMissionTelemetryReplay(missionId, missionId > 0);
    const replay = replayQuery.data;
    const frames = useMemo(() => replay?.samples ?? [], [replay?.samples]);

    const [frameIndex, setFrameIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);

    const safeIndex = frames.length > 0 ? Math.min(frameIndex, frames.length - 1) : 0;
    const activeFrame = frames[safeIndex] ?? null;

    useEffect(() => {
        if (!playing || frames.length <= 1) return;
        const intervalMs = speedMultiplier === 2 ? 320 : 650;
        const timer = window.setInterval(() => {
            setFrameIndex(current => {
                if (current + 1 >= frames.length) {
                    setPlaying(false);
                    return 0;
                }
                return current + 1;
            });
        }, intervalMs);
        return () => window.clearInterval(timer);
    }, [playing, frames.length, speedMultiplier]);

    const chartGeometry = useMemo(() => {
        if (frames.length < 2) return null;
        const width = 680;
        const height = 170;
        const padLeft = 40;
        const padRight = 16;
        const padTop = 18;
        const padBottom = 26;
        const innerW = width - padLeft - padRight;
        const innerH = height - padTop - padBottom;

        const maxDist = Math.max(frames[frames.length - 1].distanceFromStartMeters, 1);
        const allElevations = frames.flatMap(f => [
            f.terrainElevationMeters,
            f.terrainElevationMeters + f.altitudeAglMeters,
        ]);
        const minElev = Math.max(0, Math.floor(Math.min(...allElevations) - 8));
        const maxElev = Math.ceil(Math.max(...allElevations) + 12);
        const spanElev = Math.max(maxElev - minElev, 20);

        const toX = (dist: number) => padLeft + (dist / maxDist) * innerW;
        const toY = (elev: number) => padTop + innerH - ((elev - minElev) / spanElev) * innerH;

        const uavPoints = frames
            .map(f => `${toX(f.distanceFromStartMeters).toFixed(1)},${toY(f.terrainElevationMeters + f.altitudeAglMeters).toFixed(1)}`)
            .join(' ');
        const terrainTopPoints = frames
            .map(f => `${toX(f.distanceFromStartMeters).toFixed(1)},${toY(f.terrainElevationMeters).toFixed(1)}`)
            .join(' ');
        const baselineY = (padTop + innerH).toFixed(1);
        const firstX = toX(frames[0].distanceFromStartMeters).toFixed(1);
        const lastX = toX(frames[frames.length - 1].distanceFromStartMeters).toFixed(1);
        const terrainAreaPoints = `${firstX},${baselineY} ${terrainTopPoints} ${lastX},${baselineY}`;

        const cursorFrame = frames[safeIndex] ?? frames[0];
        const cursorX = toX(cursorFrame.distanceFromStartMeters);
        const cursorUavY = toY(cursorFrame.terrainElevationMeters + cursorFrame.altitudeAglMeters);
        const cursorTerrainY = toY(cursorFrame.terrainElevationMeters);

        return {
            width,
            height,
            padLeft,
            padTop,
            innerW,
            innerH,
            minElev,
            maxElev,
            maxDist,
            uavPoints,
            terrainTopPoints,
            terrainAreaPoints,
            cursorX,
            cursorUavY,
            cursorTerrainY,
        };
    }, [frames, safeIndex]);

    if (replayQuery.isLoading) {
        return (
            <section className="rounded-panel border border-border bg-card p-4 shadow-xs">
                <div className="h-56 animate-pulse rounded-panel bg-slate-100" />
            </section>
        );
    }

    if (replayQuery.isError || !replay) {
        return null;
    }

    const airframeClass: UavAirframeClass = replay.airframeClass || 'QUADCOPTER_RTK';
    const avgSpeed =
        frames.length > 0 ? frames.reduce((sum, f) => sum + f.groundSpeedMs, 0) / frames.length : 0;
    const minBattery =
        frames.length > 0 ? Math.min(...frames.map(f => f.batteryPct)) : 100;

    return (
        <section className="overflow-hidden rounded-panel border border-border bg-card shadow-xs" aria-labelledby="mission-3d-replay-heading">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <Compass size={17} className="text-uav-blue" />
                    <div>
                        <h3 id="mission-3d-replay-heading" className="m-0 text-sm font-bold text-foreground">
                            {isEn ? '3D Flight Attitude HUD & Terrain Elevation Replay' : 'Mô phỏng 3D Góc nghiêng (HUD) & Mặt cắt Địa hình đường bay'}
                        </h3>
                        <p className="m-0 text-xs text-muted">
                            {missionCode ? `#${missionCode} · ` : ''}
                            {isEn
                                ? `${frames.length} telemetry frames · Total path ${formatNumber(Math.round(replay.totalDistanceMeters))} m`
                                : `${frames.length} mẫu hành trình · Quãng đường ${formatNumber(Math.round(replay.totalDistanceMeters))} m`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            replay.terrainClearanceSafe
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                    >
                        {replay.terrainClearanceSafe ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {replay.terrainClearanceSafe
                            ? isEn
                                ? `Terrain Safe (Min ${formatNumber(Math.round(replay.minClearanceMeters))} m)`
                                : `Độ cao Địa hình An toàn (Tối thiểu ${formatNumber(Math.round(replay.minClearanceMeters))} m)`
                            : isEn
                              ? `Low Clearance (${formatNumber(Math.round(replay.minClearanceMeters))} m)`
                              : `Cảnh báo Độ cao thấp (${formatNumber(Math.round(replay.minClearanceMeters))} m)`}
                    </span>
                </div>
            </header>

            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                <div className="space-y-3">
                    <UavModelViewer
                        serial={uavSerial ?? replay.uavSerialNumber ?? missionCode ?? `UAV-M${missionId}`}
                        model={uavModel ?? replay.uavModel ?? 'Enterprise RTK Aircraft'}
                        status={status ?? 'IN_PROGRESS'}
                        airframeClass={airframeClass}
                        altitudeM={activeFrame?.altitudeAglMeters}
                        speedMps={activeFrame?.groundSpeedMs}
                        batteryPct={activeFrame?.batteryPct}
                        attitude={
                            activeFrame
                                ? {
                                      pitchDeg: activeFrame.pitchDeg,
                                      rollDeg: activeFrame.rollDeg,
                                      headingDeg: activeFrame.headingDeg,
                                      gimbalPitchDeg: activeFrame.gimbalPitchDeg,
                                  }
                                : undefined
                        }
                    />

                    {frames.length > 0 && (
                        <div className="rounded-panel border border-slate-200 bg-slate-50/80 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={playing ? <Pause size={13} /> : <Play size={13} />}
                                        onClick={() => setPlaying(v => !v)}
                                    >
                                        {playing ? (isEn ? 'Pause' : 'Tạm dừng') : isEn ? 'Replay 3D' : 'Phát lại 3D'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        leftIcon={<RotateCcw size={13} />}
                                        onClick={() => {
                                            setPlaying(false);
                                            setFrameIndex(0);
                                        }}
                                    >
                                        {isEn ? 'Reset' : 'Đặt lại'}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => setSpeedMultiplier(s => (s === 1 ? 2 : 1))}
                                        className="rounded-control border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                                    >
                                        {speedMultiplier}x
                                    </button>
                                </div>
                                <span className="font-mono text-xs font-semibold text-slate-600">
                                    {isEn ? 'Frame' : 'Khung'} {safeIndex + 1}/{frames.length} ·{' '}
                                    {activeFrame ? `${formatNumber(Math.round(activeFrame.distanceFromStartMeters))} m` : '0 m'}
                                </span>
                            </div>

                            <input
                                type="range"
                                min={0}
                                max={Math.max(frames.length - 1, 0)}
                                value={safeIndex}
                                aria-label={isEn ? '3D telemetry timeline scrubber' : 'Thanh trượt thời gian hành trình 3D'}
                                onChange={e => {
                                    setPlaying(false);
                                    setFrameIndex(Number(e.target.value));
                                }}
                                className="mt-2.5 h-2 w-full cursor-pointer accent-slate-900"
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-col justify-between gap-4">
                    <div className="rounded-panel border border-slate-200 bg-slate-950 p-3.5 text-slate-100">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-300">
                                <Mountain size={14} />
                                {isEn ? 'Terrain Elevation & Clearance Profile (ASL)' : 'Mặt cắt Địa hình & Độ cao Bay (ASL)'}
                            </span>
                            {activeFrame && (
                                <span className="font-mono text-[11px] text-emerald-300">
                                    AGL {formatNumber(Math.round(activeFrame.clearanceMeters))}m · ASL{' '}
                                    {formatNumber(Math.round(activeFrame.terrainElevationMeters + activeFrame.altitudeAglMeters))}m
                                </span>
                            )}
                        </div>

                        {chartGeometry ? (
                            <svg
                                viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                                className="h-44 w-full select-none overflow-visible"
                                role="img"
                                aria-label={isEn ? 'Terrain elevation and flight altitude chart' : 'Biểu đồ độ cao địa hình và đường bay'}
                            >
                                <defs>
                                    <linearGradient id={`terrainGrad-${missionId}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#64748b" stopOpacity="0.55" />
                                        <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
                                    </linearGradient>
                                </defs>
                                <line
                                    x1={chartGeometry.padLeft}
                                    y1={chartGeometry.padTop}
                                    x2={chartGeometry.width - 16}
                                    y2={chartGeometry.padTop}
                                    stroke="#334155"
                                    strokeDasharray="3 3"
                                    strokeWidth="1"
                                />
                                <line
                                    x1={chartGeometry.padLeft}
                                    y1={chartGeometry.padTop + chartGeometry.innerH}
                                    x2={chartGeometry.width - 16}
                                    y2={chartGeometry.padTop + chartGeometry.innerH}
                                    stroke="#475569"
                                    strokeWidth="1"
                                />
                                <text x={6} y={chartGeometry.padTop + 8} fill="#94a3b8" fontSize="10" fontFamily="monospace">
                                    {chartGeometry.maxElev}m
                                </text>
                                <text
                                    x={6}
                                    y={chartGeometry.padTop + chartGeometry.innerH}
                                    fill="#94a3b8"
                                    fontSize="10"
                                    fontFamily="monospace"
                                >
                                    {chartGeometry.minElev}m
                                </text>

                                <polygon points={chartGeometry.terrainAreaPoints} fill={`url(#terrainGrad-${missionId})`} />
                                <polyline
                                    fill="none"
                                    stroke="#94a3b8"
                                    strokeWidth="2"
                                    points={chartGeometry.terrainTopPoints}
                                />
                                <polyline
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="2.5"
                                    points={chartGeometry.uavPoints}
                                />

                                <line
                                    x1={chartGeometry.cursorX}
                                    y1={chartGeometry.cursorUavY}
                                    x2={chartGeometry.cursorX}
                                    y2={chartGeometry.cursorTerrainY}
                                    stroke="#f59e0b"
                                    strokeDasharray="3 2"
                                    strokeWidth="1.8"
                                />
                                <circle cx={chartGeometry.cursorX} cy={chartGeometry.cursorUavY} r="4.5" fill="#38bdf8" stroke="#fff" strokeWidth="1.5" />
                                <circle cx={chartGeometry.cursorX} cy={chartGeometry.cursorTerrainY} r="3.5" fill="#f59e0b" />
                            </svg>
                        ) : (
                            <p className="py-10 text-center text-xs text-slate-400">
                                {isEn ? 'Insufficient telemetry samples for profile chart.' : 'Chưa đủ mẫu hành trình để dựng biểu đồ địa hình.'}
                            </p>
                        )}

                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                                {isEn ? 'UAV Altitude (ASL)' : 'Độ cao UAV (ASL)'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                                {isEn ? 'Ground Terrain (DEM)' : 'Địa hình mặt đất (DEM)'}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                                {isEn ? 'Vertical Clearance (AGL)' : 'Khoảng sáng Gầm bay (AGL)'}
                            </span>
                        </div>
                    </div>

                    <dl className="m-0 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-2.5">
                            <dt className="text-[11px] font-medium text-slate-500">{isEn ? 'Max Flight Altitude' : 'Độ cao bay Cực đại'}</dt>
                            <dd className="m-0 mt-0.5 text-sm font-bold text-slate-900">
                                {formatNumber(Math.round(replay.maxAltitudeMeters))} m AGL
                            </dd>
                        </div>
                        <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-2.5">
                            <dt className="text-[11px] font-medium text-slate-500">{isEn ? 'Min Terrain Clearance' : 'Khoảng cách Địa hình Min'}</dt>
                            <dd className="m-0 mt-0.5 text-sm font-bold text-slate-900">
                                {formatNumber(Math.round(replay.minClearanceMeters))} m
                            </dd>
                        </div>
                        <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-2.5">
                            <dt className="text-[11px] font-medium text-slate-500">{isEn ? 'Avg Ground Speed' : 'Tốc độ Bay Trung bình'}</dt>
                            <dd className="m-0 mt-0.5 text-sm font-bold text-slate-900">
                                {formatNumber(Number(avgSpeed.toFixed(1)))} m/s
                            </dd>
                        </div>
                        <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-2.5">
                            <dt className="text-[11px] font-medium text-slate-500">{isEn ? 'Active Pitch / Roll' : 'Góc Pitch / Roll'}</dt>
                            <dd className="m-0 mt-0.5 font-mono text-sm font-bold text-slate-900">
                                {activeFrame ? `${activeFrame.pitchDeg.toFixed(1)}° / ${activeFrame.rollDeg.toFixed(1)}°` : '0.0° / 0.0°'}
                            </dd>
                        </div>
                        <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-2.5">
                            <dt className="text-[11px] font-medium text-slate-500">{isEn ? 'Heading / Gimbal' : 'Hướng Mũi / Gimbal'}</dt>
                            <dd className="m-0 mt-0.5 font-mono text-sm font-bold text-slate-900">
                                {activeFrame ? `${Math.round(activeFrame.headingDeg)}° / ${Math.round(activeFrame.gimbalPitchDeg)}°` : '0° / -45°'}
                            </dd>
                        </div>
                        <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-2.5">
                            <dt className="text-[11px] font-medium text-slate-500">{isEn ? 'Min Battery Reserve' : 'Pin Dự phòng Tối thiểu'}</dt>
                            <dd className="m-0 mt-0.5 inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                                <Activity size={13} className="text-emerald-600" />
                                {minBattery}%
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </section>
    );
}
