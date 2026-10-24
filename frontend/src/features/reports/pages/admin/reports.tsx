'use client';

import React, {useEffect, useState} from 'react';
import {AdminPage} from '@/components/layout/AdminPage';
import {
    BarChart3,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    LifeBuoy,
    PlaneTakeoff,
    TrendingUp,
    Wrench
} from 'lucide-react';
import {adminService} from "@/lib/api/admin";
import type {OperationsReportData} from "@/types/admin";
import {MissionCharts} from "@/features/reports/components/MissionCharts";
import {useI18n} from '@/contexts/I18nContext';

function AdminReportsContent() {
    const [metrics, setMetrics] = useState<OperationsReportData | null>(null);
    const [error, setError] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const {t, formatNumber} = useI18n();

    useEffect(() => {
        adminService.operationsReport()
            .then(res => {
                if (res) setMetrics(res);
            })
            .catch(() => setError(true));
    }, []);

    const handleExportCsv = async () => {
        if (!metrics) return;
        setIsExporting(true);
        try {
            setExportError(null);
            const csvData = await adminService.exportOperationsCsv();

            const blob = new Blob([csvData], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `uav_operations_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            setExportError(t('admin.reports.exportError'));
        } finally {
            setIsExporting(false);
        }
    };

    if (!metrics) return <p
        role="status">{error ? t('admin.reports.loadError') : t('admin.reports.loading')}</p>;

    return (
        <div className="portal-management space-y-6">
            {/* Top Banner with CSV Export */}
            <div
                className="portal-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <BarChart3 className="text-[#ab2523]"/> {t('admin.reports.heading')}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {t('admin.reports.intro')}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="portal-button portal-button-primary flex items-center gap-2 px-4 py-2.5 bg-[#007f3e] hover:bg-[#006632] text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 shrink-0"
                >
                    <FileSpreadsheet size={16}/>
                    {isExporting ? t('admin.reports.exporting') : t('admin.reports.exportCsv')}
                </button>
            </div>

            {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

            {/* Main KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-2 border-t-[#ab2523]">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.plannedHours')}</span>
                        <Clock size={16} className="text-[#ab2523]"/>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono">{t('admin.reports.hoursValue', {hours: formatNumber(metrics.totalFlightHours)})}</div>
                    <div className="text-[11px] text-[#007f3e] mt-1 flex items-center gap-1 font-medium">
                        <TrendingUp size={12}/> {t('admin.reports.plannedHoursNote')}
                    </div>
                </div>

                <div className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.completedMissions')}</span>
                        <CheckCircle2 size={16} className="text-[#007f3e]"/>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono">
                        {metrics.completedMissions} <span
                        className="text-sm font-normal text-slate-400">/ {metrics.totalMissions}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        {t('admin.reports.successRate')} <strong
                        className="text-[#007f3e] font-mono">{formatNumber(metrics.missionSuccessRate / 100, {style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1})}</strong>
                    </div>
                </div>

                <div
                    className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-2 border-t-[#ab2523]">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.sarOperations')}</span>
                        <LifeBuoy size={16} className="text-[#ab2523]"/>
                    </div>
                    <div className="text-2xl font-black text-[#ab2523] font-mono">{metrics.sarOperationsCount}</div>
                    <div className="text-[11px] text-slate-600 mt-1">
                        {t('admin.reports.verifiedDetections')} <strong
                        className="text-slate-900 font-mono">{t('admin.reports.detectionsCount', {count: metrics.victimsRescuedCount})}</strong>
                    </div>
                </div>

                <div className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.uavStatus')}</span>
                        <PlaneTakeoff size={16} className="text-[#ab2523]"/>
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono">
                        {metrics.activeUavCount} <span className="text-xs font-normal text-[#007f3e] font-semibold">{t('admin.reports.uavActive')}</span>
                    </div>
                    <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                        <Wrench size={12}/> {t('admin.reports.uavMaintenance', {count: metrics.maintenanceUavCount})}
                    </div>
                </div>
            </div>

            <MissionCharts/>

            <p className="text-sm text-slate-500">{t('admin.reports.footer', {count: metrics.totalStationsCount})}</p>
        </div>
    );
}

export default function AdminReportsPage() {
    return (
        <AdminPage
            title="admin.pages.reports.title"
            meta="admin.pages.reports.meta"
            permission="DASHBOARD_READ"
            activeResource="reports"
        >
            <AdminReportsContent/>
        </AdminPage>
    );
}
