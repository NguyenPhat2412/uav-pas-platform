'use client';

import {Activity, AlertTriangle, BatteryCharging, CheckCircle2, Cpu, Gauge, ShieldAlert, Wrench} from 'lucide-react';
import {Button} from '@/components/ui';
import {useUavHealthAnalytics} from '@/hooks/uav/useUavs';
import {useI18n} from '@/providers/I18nContext';

export interface UavHealthAnalyticsSectionProps {
    onSelectUav?: (uavId: number, tab?: string) => void;
}

const AIRFRAME_BADGE: Record<string, {labelVi: string; labelEn: string; tone: string}> = {
    QUADCOPTER_RTK: {
        labelVi: '4-Rotor RTK Survey',
        labelEn: '4-Rotor RTK Survey',
        tone: 'border-sky-200 bg-sky-50 text-sky-800',
    },
    HEXACOPTER_SAR: {
        labelVi: '6-Rotor Heavy SAR',
        labelEn: '6-Rotor Heavy SAR',
        tone: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    },
    VTOL_FIXED_WING: {
        labelVi: 'VTOL Cánh bằng tầm xa',
        labelEn: 'VTOL Fixed-Wing',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
};

export function UavHealthAnalyticsSection({onSelectUav}: UavHealthAnalyticsSectionProps) {
    const {locale, formatNumber} = useI18n();
    const isEn = locale === 'en';
    const analyticsQuery = useUavHealthAnalytics();
    const data = analyticsQuery.data;

    if (analyticsQuery.isLoading) {
        return (
            <section className="rounded-panel border border-border bg-card p-4 shadow-xs">
                <div className="h-36 animate-pulse rounded-panel bg-slate-100" />
            </section>
        );
    }

    if (analyticsQuery.isError || !data) {
        return null;
    }

    const items = data.profiles ?? [];
    const avgScore = Math.round(data.averageHealthScore);

    return (
        <section
            className="overflow-hidden rounded-panel border border-border bg-card shadow-xs"
            aria-labelledby="uav-health-analytics-heading"
        >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <Cpu size={17} className="text-uav-blue" />
                    <div>
                        <h3 id="uav-health-analytics-heading" className="m-0 text-sm font-bold text-foreground">
                            {isEn
                                ? 'Predictive Maintenance, Battery Cycle SOH & 3D Airframe Matrix'
                                : 'Phân tích Dự báo Bảo trì, Tuổi thọ Pin (SOH) & Thư viện Khung thân 3D'}
                        </h3>
                        <p className="m-0 text-xs text-muted">
                            {isEn
                                ? 'Real-time propulsion efficiency, battery cycle degradation & scheduled service intervals computed by backend'
                                : 'Hiệu suất động cơ, độ chai chu kỳ pin và lịch bảo dưỡng định kỳ được tính toán trực tiếp từ hệ thống'}
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <Activity size={13} />
                    {isEn ? 'Fleet Avg Health' : 'Sức khỏe Đội bay TB'}: {avgScore}%
                </span>
            </header>

            <div className="grid gap-4 p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-panel border border-slate-200 bg-slate-50/70 p-3">
                        <span className="text-[11px] font-medium text-slate-500">
                            {isEn ? 'Fleet Average Health' : 'Chỉ số Sức khỏe Trung bình'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                            <Gauge size={16} className="text-uav-blue" />
                            <strong className="text-lg font-extrabold text-slate-900">{avgScore}%</strong>
                        </div>
                    </div>
                    <div className="rounded-panel border border-emerald-200/80 bg-emerald-50/40 p-3">
                        <span className="text-[11px] font-medium text-emerald-800">
                            {isEn ? 'Nominal & Ready' : 'Hoạt động Chuẩn (Nominal)'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <strong className="text-lg font-extrabold text-emerald-900">{data.optimalCount}</strong>
                            <span className="text-xs text-emerald-700">UAV</span>
                        </div>
                    </div>
                    <div className="rounded-panel border border-amber-200/80 bg-amber-50/40 p-3">
                        <span className="text-[11px] font-medium text-amber-800">
                            {isEn ? 'Schedule Service Soon' : 'Sắp đến Hạn Bảo dưỡng'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                            <AlertTriangle size={16} className="text-amber-600" />
                            <strong className="text-lg font-extrabold text-amber-900">{data.attentionCount}</strong>
                            <span className="text-xs text-amber-700">UAV</span>
                        </div>
                    </div>
                    <div className="rounded-panel border border-rose-200/80 bg-rose-50/40 p-3">
                        <span className="text-[11px] font-medium text-rose-800">
                            {isEn ? 'Service Required Now' : 'Cần Bảo trì Kỹ thuật'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                            <ShieldAlert size={16} className="text-rose-600" />
                            <strong className="text-lg font-extrabold text-rose-900">{data.criticalCount}</strong>
                            <span className="text-xs text-rose-700">UAV</span>
                        </div>
                    </div>
                </div>

                {items.length > 0 && (
                    <div className="overflow-x-auto rounded-panel border border-slate-200">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                    <th className="px-3 py-2.5">{isEn ? 'UAV / 3D Airframe' : 'Thiết bị / Khung thân 3D'}</th>
                                    <th className="px-3 py-2.5">{isEn ? 'Health & SOH' : 'Sức khỏe & Pin SOH'}</th>
                                    <th className="px-3 py-2.5">{isEn ? 'Flight Hours & Cycles' : 'Giờ bay & Chu kỳ Pin'}</th>
                                    <th className="px-3 py-2.5">{isEn ? 'Next Service' : 'Hạn Bảo dưỡng'}</th>
                                    <th className="px-3 py-2.5">{isEn ? 'Engineering Recommendation' : 'Khuyến nghị Kỹ thuật'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {items.slice(0, 6).map(item => {
                                    const airframe = AIRFRAME_BADGE[item.airframeClass] ?? AIRFRAME_BADGE.QUADCOPTER_RTK;
                                    const urgencyTone =
                                        item.healthTier === 'OPTIMAL'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                            : item.healthTier === 'ATTENTION'
                                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                                              : 'border-rose-200 bg-rose-50 text-rose-800';

                                    return (
                                        <tr key={item.uavId} className="hover:bg-slate-50/80">
                                            <td className="px-3 py-2.5 align-top">
                                                <div className="font-bold text-slate-900">{item.model}</div>
                                                <div className="font-mono text-[11px] text-slate-500">{item.serialNumber}</div>
                                                <span
                                                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${airframe.tone}`}
                                                >
                                                    {isEn ? airframe.labelEn : airframe.labelVi}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                <div className="flex items-center gap-2">
                                                    <strong className="text-sm font-extrabold text-slate-900">
                                                        {item.healthScore}%
                                                    </strong>
                                                    <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-600">
                                                        <BatteryCharging size={12} className="text-emerald-600" />
                                                        SOH {item.batteryStateOfHealthPct}%
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            item.healthScore >= 82
                                                                ? 'bg-emerald-600'
                                                                : item.healthScore >= 68
                                                                  ? 'bg-amber-500'
                                                                  : 'bg-rose-600'
                                                        }`}
                                                        style={{width: `${Math.min(100, Math.max(10, item.healthScore))}%`}}
                                                    />
                                                </div>
                                                <div className="mt-1 text-[11px] text-slate-500">
                                                    {isEn ? 'Motor Eff.' : 'Động cơ'}: {item.motorHealthPct}%
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 align-top font-mono text-[11px] text-slate-700">
                                                <div>
                                                    {formatNumber(item.totalFlightHours)} h · {item.completedMissionsCount}{' '}
                                                    {isEn ? 'missions' : 'chuyến'}
                                                </div>
                                                <div className="mt-0.5 text-slate-500">
                                                    {item.estimatedBatteryCycles} {isEn ? 'battery cycles' : 'chu kỳ sạc'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${urgencyTone}`}>
                                                    {item.healthTier}
                                                </span>
                                                <div className="mt-1 font-mono text-[11px] text-slate-600">
                                                    {isEn ? 'In' : 'Còn'} {formatNumber(item.predictedRemainingHours)} h
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5 align-top">
                                                <p className="m-0 max-w-xs text-xs leading-relaxed text-slate-600">
                                                    {item.recommendation}
                                                </p>
                                                {onSelectUav && (
                                                    <div className="mt-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            leftIcon={<Wrench size={12} />}
                                                            onClick={() => onSelectUav(item.uavId, 'overview')}
                                                        >
                                                            {isEn ? 'Inspect 3D & Log' : 'Kiểm tra 3D & Hồ sơ'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
