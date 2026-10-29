'use client';

import React, {useEffect, useState} from 'react';
import {AdminPage} from '@/components/layout/AdminPage';
import {CheckCircle2, Clock, FileSpreadsheet, LifeBuoy, PlaneTakeoff, TrendingUp, Wrench} from 'lucide-react';
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
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="flex min-h-[36px] shrink-0 items-center justify-center gap-2 rounded-control bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <FileSpreadsheet size={16}/>
                    {isExporting ? t('admin.reports.exporting') : t('admin.reports.exportCsv')}
                </button>
            </div>

            {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

            {/* Main KPI Grid */}
            <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 [&>*]:border-0 md:grid-cols-4">
                <div
                    className="rounded-panel border border-border border-t-2 border-t-primary bg-card p-4">
                    <div className="mb-2 flex items-center justify-between text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.plannedHours')}</span>
                        <Clock size={16} className="text-primary"/>
                    </div>
                    <div className="tabular-nums text-2xl font-black text-slate-900">{t('admin.reports.hoursValue', {hours: formatNumber(metrics.totalFlightHours)})}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-uav-blue">
                        <TrendingUp size={12}/> {t('admin.reports.plannedHoursNote')}
                    </div>
                </div>

                <div className="rounded-panel border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.completedMissions')}</span>
                        <CheckCircle2 size={16} className="text-uav-blue"/>
                    </div>
                    <div className="tabular-nums text-2xl font-black text-slate-900">
                        {metrics.completedMissions} <span
                        className="text-sm font-normal text-slate-400">/ {metrics.totalMissions}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                        {t('admin.reports.successRate')} <strong
                        className="tabular-nums text-uav-blue">{formatNumber(metrics.missionSuccessRate / 100, {style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1})}</strong>
                    </div>
                </div>

                <div
                    className="rounded-panel border border-border border-t-2 border-t-primary bg-card p-4">
                    <div className="mb-2 flex items-center justify-between text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.sarOperations')}</span>
                        <LifeBuoy size={16} className="text-primary"/>
                    </div>
                    <div className="tabular-nums text-2xl font-black text-primary">{metrics.sarOperationsCount}</div>
                    <div className="mt-1 text-[11px] text-slate-600">
                        {t('admin.reports.verifiedDetections')} <strong
                        className="tabular-nums text-slate-900">{t('admin.reports.detectionsCount', {count: metrics.victimsRescuedCount})}</strong>
                    </div>
                </div>

                <div className="rounded-panel border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between text-slate-500">
                        <span className="text-xs font-bold uppercase tracking-wider">{t('admin.reports.uavStatus')}</span>
                        <PlaneTakeoff size={16} className="text-primary"/>
                    </div>
                    <div className="tabular-nums text-2xl font-black text-slate-900">
                        {metrics.activeUavCount} <span className="text-xs font-semibold text-uav-blue">{t('admin.reports.uavActive')}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                        <Wrench size={12}/> {t('admin.reports.uavMaintenance', {count: metrics.maintenanceUavCount})}
                    </div>
                </div>
            </div>

            <MissionCharts/>

            <p className="text-xs text-slate-500">{t('admin.reports.footer', {count: metrics.totalStationsCount})}</p>
        </div>
    );
}

export default function AdminReportsPage() {
    return (
        <AdminPage
            title="admin.pages.reports.title"
            permission="DASHBOARD_READ"
            activeResource="reports"
        >
            <AdminReportsContent/>
        </AdminPage>
    );
}
