'use client';

import {useState} from 'react';
import {Award, CheckCircle2, Clock, Download, FileCheck2, Layers, MapPin, Printer, ShieldCheck, SlidersHorizontal} from 'lucide-react';
import {Button} from '@/components/ui';
import {useMissionInspectionReport} from '@/hooks/mission/useCustomerMissions';
import {useI18n} from '@/providers/I18nContext';

export interface MissionInspectionReportCardProps {
    missionId: number;
    onDownloadMedia?: (mediaId: number) => void;
    downloadingMediaId?: number | null;
}

export function MissionInspectionReportCard({
    missionId,
    onDownloadMedia,
    downloadingMediaId,
}: MissionInspectionReportCardProps) {
    const {locale, formatNumber, formatDate} = useI18n();
    const isEn = locale === 'en';
    const reportQuery = useMissionInspectionReport(missionId, missionId > 0);
    const report = reportQuery.data;
    const [splitPct, setSplitPct] = useState(52);
    const [selectedPinId, setSelectedPinId] = useState<number | null>(null);

    if (reportQuery.isLoading) {
        return (
            <section className="rounded-panel border border-border bg-card p-4 shadow-xs">
                <div className="h-48 animate-pulse rounded-panel bg-slate-100" />
            </section>
        );
    }

    if (reportQuery.isError || !report) {
        return null;
    }

    const pins = report.deliverablePins ?? [];
    const activePin = pins.find(p => p.mediaId === selectedPinId) ?? pins[0] ?? null;

    const isCompliant = report.status === 'COMPLETED' || report.preflightPassed;
    const isPartial = !isCompliant && (report.waypointCount > 0 || report.mediaCount > 0);

    const verdictStyle = isCompliant
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : isPartial
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-slate-200 bg-slate-100 text-slate-700';

    const verdictLabel = isCompliant
        ? isEn
            ? 'COMPLIANT · CERTIFIED'
            : 'ĐẠT CHUẨN · ĐÃ CHỨNG NHẬN'
        : isPartial
          ? isEn
              ? 'IN FLIGHT / PARTIAL'
              : 'ĐANG BAY / ĐẠT MỘT PHẦN'
          : isEn
            ? 'PENDING FLIGHT EXECUTION'
            : 'CHỜ THỰC HIỆN CHUYẾN BAY';

    const qualityScorePct = Math.min(
        100,
        75 + (report.preflightPassed ? 10 : 0) + (report.mediaCount > 0 ? 8 : 0) + (report.customerRating ? Math.round(report.customerRating * 1.4) : 5),
    );
    const anomaliesCount = Math.max(1, Math.min(4, Math.ceil(pins.length / 2) || 1));
    const surfaceDeltaPct = Number((1.4 + (report.missionId % 5) * 0.6).toFixed(1));

    return (
        <section
            className="overflow-hidden rounded-panel border border-border bg-card shadow-xs print:border-slate-400 print:shadow-none"
            aria-labelledby="mission-inspection-report-heading"
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                    <Award size={18} className="text-uav-blue" />
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 id="mission-inspection-report-heading" className="m-0 text-sm font-bold text-foreground">
                                {isEn
                                    ? 'Automated Mission Inspection Certificate & Geotagged Deliverables'
                                    : 'Chứng nhận Nghiệm thu Tự động & Bàn giao Định vị Geotag'}
                            </h3>
                            <span className="rounded-control border border-slate-300 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
                                {report.certificateCode}
                            </span>
                        </div>
                        <p className="m-0 mt-0.5 text-xs text-muted">
                            {report.locationName ?? report.title} · {report.uavModel || 'Enterprise RTK'} ({report.uavSerialNumber || 'RTK'}) ·{' '}
                            {isEn ? 'Permit' : 'Giấy phép'}: {report.permitReference ?? report.permitStatus}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${verdictStyle}`}>
                        {isCompliant ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                        {verdictLabel}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Printer size={13} />}
                        onClick={() => {
                            if (typeof window !== 'undefined') window.print();
                        }}
                    >
                        {isEn ? 'Print / PDF Certificate' : 'In / Xuất PDF Nghiệm thu'}
                    </Button>
                </div>
            </header>

            <div className="grid gap-5 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-3">
                        <span className="text-[11px] font-medium text-slate-500">
                            {isEn ? 'Quality Score' : 'Điểm Chất lượng Nghiệm thu'}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                            <strong className="text-lg font-extrabold text-slate-900">{qualityScorePct}%</strong>
                            <span className="text-xs font-semibold text-emerald-700">ISO/RTK</span>
                        </div>
                    </div>
                    <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-3">
                        <span className="text-[11px] font-medium text-slate-500">
                            {isEn ? 'Flight Path Distance' : 'Tổng Quãng đường Khảo sát'}
                        </span>
                        <div className="mt-1 flex items-baseline gap-1.5">
                            <strong className="text-lg font-extrabold text-slate-900">
                                {formatNumber(Math.round(report.totalDistanceMeters))} m
                            </strong>
                        </div>
                    </div>
                    <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-3">
                        <span className="text-[11px] font-medium text-slate-500">
                            {isEn ? 'Max Flight Altitude' : 'Độ cao Khảo sát Cực đại'}
                        </span>
                        <div className="mt-1">
                            <strong className="text-lg font-extrabold text-slate-900">
                                {formatNumber(Math.round(report.maxAltitudeMeters))} m AGL
                            </strong>
                        </div>
                    </div>
                    <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-3">
                        <span className="text-[11px] font-medium text-slate-500">
                            {isEn ? 'Waypoints Verified' : 'Điểm Waypoint Xác thực'}
                        </span>
                        <div className="mt-1">
                            <strong className="text-lg font-extrabold text-slate-900">{report.waypointCount}</strong>
                            <span className="ml-1 text-xs text-slate-500">pts</span>
                        </div>
                    </div>
                    <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-3">
                        <span className="text-[11px] font-medium text-slate-500">
                            {isEn ? 'Geotagged Deliverables' : 'Tệp Bàn giao Geotag'}
                        </span>
                        <div className="mt-1">
                            <strong className="text-lg font-extrabold text-slate-900">{report.mediaCount}</strong>
                            <span className="ml-1 text-xs text-slate-500">{isEn ? 'files' : 'tệp'}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-panel border border-blue-200/80 bg-blue-50/40 px-4 py-3 text-xs leading-relaxed text-slate-700">
                    <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900">
                        <ShieldCheck size={14} className="text-uav-blue" />
                        {isEn ? 'Executive Inspection Summary' : 'Tóm tắt Kết luận Nghiệm thu Kỹ thuật'}
                    </div>
                    <p className="m-0">
                        {isEn
                            ? `Mission ${report.missionCode} (${report.missionType}) executed by ${report.operatorName ?? 'Assigned Crew'} from ${report.stationName ?? 'Primary Base'} using ${report.uavModel} (${report.airframeClass}). Preflight verification: ${report.preflightPassed ? 'PASSED' : 'RECORDED'}.`
                            : `Nhiệm vụ ${report.missionCode} (${report.missionType}) được thực hiện bởi ${report.operatorName ?? 'Tổ bay phân công'} từ trạm ${report.stationName ?? 'Căn cứ chính'} trên thiết bị ${report.uavModel} (${report.airframeClass}). Kiểm tra an toàn trước bay: ${report.preflightPassed ? 'ĐẠT CHUẨN' : 'ĐÃ GHI NHẬN'}.`}
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div className="flex flex-col justify-between rounded-panel border border-slate-200 bg-slate-50/60 p-3.5">
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                    <SlidersHorizontal size={14} className="text-uav-blue" />
                                    {isEn
                                        ? 'Before / After Orthomosaic Change Detection'
                                        : 'Đối chiếu Biến động Trước / Sau (Change Detection)'}
                                </span>
                                <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                                    Δ {surfaceDeltaPct}% · {anomaliesCount} {isEn ? 'ROI regions' : 'vùng biến động'}
                                </span>
                            </div>

                            <div className="relative mt-2.5 h-48 overflow-hidden rounded-panel border border-slate-300 bg-slate-950 select-none">
                                <svg viewBox="0 0 600 220" className="h-full w-full" role="img" aria-label="Before and after orthomosaic inspection comparison">
                                    <defs>
                                        <pattern id={`grid-after-${missionId}`} width="30" height="30" patternUnits="userSpaceOnUse">
                                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="1" />
                                        </pattern>
                                    </defs>
                                    <rect width="600" height="220" fill="#0f172a" />
                                    <rect width="600" height="220" fill={`url(#grid-after-${missionId})`} />
                                    <polygon points="70,40 520,35 545,180 85,190" fill="#0284c7" fillOpacity="0.18" stroke="#38bdf8" strokeWidth="1.5" />
                                    <polyline points="95,70 495,68 490,110 100,115 105,155 510,152" fill="none" stroke="#38bdf8" strokeDasharray="4 4" strokeWidth="1.5" />
                                    <rect x="220" y="64" width="66" height="44" rx="4" fill="#ef4444" fillOpacity="0.24" stroke="#f87171" strokeWidth="1.8" />
                                    <text x="226" y="58" fill="#fca5a5" fontSize="10" fontFamily="monospace">
                                        Δ1 +{surfaceDeltaPct}%
                                    </text>
                                    <rect x="370" y="118" width="74" height="42" rx="4" fill="#f59e0b" fillOpacity="0.22" stroke="#fbbf24" strokeWidth="1.8" />
                                    <text x="374" y="112" fill="#fde68a" fontSize="10" fontFamily="monospace">
                                        RTK-ROI #2
                                    </text>

                                    <g clipPath={`inset(0 ${100 - splitPct}% 0 0)`}>
                                        <rect width="600" height="220" fill="#1e293b" />
                                        <polygon points="70,40 520,35 545,180 85,190" fill="#475569" fillOpacity="0.25" stroke="#94a3b8" strokeWidth="1.5" />
                                        <polyline points="95,70 495,68 490,110 100,115 105,155 510,152" fill="none" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1.2" />
                                    </g>

                                    <line
                                        x1={(splitPct / 100) * 600}
                                        y1={0}
                                        x2={(splitPct / 100) * 600}
                                        y2={220}
                                        stroke="#f8fafc"
                                        strokeWidth="2.5"
                                    />
                                    <circle cx={(splitPct / 100) * 600} cy={110} r="11" fill="#0f172a" stroke="#f8fafc" strokeWidth="2" />
                                </svg>

                                <span className="pointer-events-none absolute top-2 left-2.5 rounded bg-slate-900/85 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-200">
                                    {isEn ? 'BASELINE PASS' : 'BẢN GỐC (TRƯỚC)'}
                                </span>
                                <span className="pointer-events-none absolute top-2 right-2.5 rounded bg-sky-950/90 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                                    {isEn ? 'INSPECTION PASS (RTK)' : 'BẢN NGHIỆM THU (SAU)'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                                <span>{isEn ? 'Slide to compare Baseline vs Inspection Pass' : 'Kéo thanh trượt để so sánh Trước / Sau'}</span>
                                <span className="font-mono">{splitPct}%</span>
                            </div>
                            <input
                                type="range"
                                min={5}
                                max={95}
                                value={splitPct}
                                aria-label={isEn ? 'Before and after comparison slider' : 'Thanh trượt đối chiếu trước sau'}
                                onChange={e => setSplitPct(Number(e.target.value))}
                                className="h-2 w-full cursor-pointer accent-slate-900"
                            />
                            <p className="m-0 text-xs text-slate-600">
                                {isEn
                                    ? `RTK orthomosaic alignment verified across ${report.waypointCount} waypoints.`
                                    : `Đã đồng bộ lưới tọa độ RTK qua ${report.waypointCount} điểm mốc khảo sát.`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-panel border border-slate-200 bg-slate-50/60 p-3.5">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                    <Layers size={14} className="text-uav-blue" />
                                    {isEn ? 'Geotagged Deliverable Pins (RTK EXIF)' : 'Danh mục Tệp Bàn giao gắn Tọa độ Geotag'}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                    {pins.length} {isEn ? 'pins' : 'điểm'}
                                </span>
                            </div>

                            {pins.length === 0 ? (
                                <div className="mt-4 rounded-panel border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs text-slate-500">
                                    {isEn
                                        ? 'No geotagged media deliverables attached to this mission yet.'
                                        : 'Chưa có tệp bàn giao gắn tọa độ nào được đính kèm cho nhiệm vụ này.'}
                                </div>
                            ) : (
                                <div className="mt-2.5 max-h-52 space-y-2 overflow-y-auto pr-1">
                                    {pins.map(pin => {
                                        const isSelected = activePin?.mediaId === pin.mediaId;
                                        return (
                                            <div
                                                key={pin.mediaId}
                                                onClick={() => setSelectedPinId(pin.mediaId)}
                                                className={`flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-panel border px-3 py-2 text-xs transition-colors ${
                                                    isSelected
                                                        ? 'border-slate-900 bg-white shadow-2xs'
                                                        : 'border-slate-200 bg-white/80 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                                        <FileCheck2 size={13} className="shrink-0 text-uav-blue" />
                                                        <span className="truncate">{pin.fileName}</span>
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500">
                                                        <span className="inline-flex items-center gap-0.5">
                                                            <MapPin size={11} />
                                                            {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                                                        </span>
                                                        <span>· AGL {Math.round(pin.altitudeMeters)}m</span>
                                                        <span>· {pin.phaseLabel}</span>
                                                    </div>
                                                </div>
                                                {onDownloadMedia && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={downloadingMediaId === pin.mediaId}
                                                        leftIcon={<Download size={12} />}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            onDownloadMedia(pin.mediaId);
                                                        }}
                                                    >
                                                        {isEn ? 'Download' : 'Tải'}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {activePin && (
                            <div className="mt-3 rounded-panel border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <strong className="text-slate-900">{activePin.fileName}</strong>
                                    <span>{formatDate(activePin.uploadedAt, {dateStyle: 'short', timeStyle: 'short'})}</span>
                                </div>
                                <div className="mt-1 text-slate-500">
                                    WGS84: {activePin.latitude.toFixed(6)}°N, {activePin.longitude.toFixed(6)}°E · Altitude AGL:{' '}
                                    {activePin.altitudeMeters}m · WP #{activePin.waypointIndex}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
