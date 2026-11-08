'use client';

import React, {useState} from 'react';
import {CheckCircle2, Clock, FileSpreadsheet, LifeBuoy, PlaneTakeoff} from 'lucide-react';
import {Alert, Button, KpiCard, MetricStrip, Spinner} from '@/components/ui';
import {AdminPage} from '@/components/layout/AdminPage';
import {useExportOperationsCsv, useOperationsReport} from '@/hooks/reporting/useReports';
import {MissionCharts} from '@/components/reporting/MissionCharts';
import {AdminSlaIntelligenceSection} from '@/components/reporting/AdminSlaIntelligenceSection';
import {useI18n} from '@/providers/I18nContext';

function AdminReportsContent() {
    const report = useOperationsReport();
    const metrics = report.data ?? null;
    const error = report.isError;
    const exportCsv = useExportOperationsCsv();
    const [exportError, setExportError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const {t, formatNumber} = useI18n();

    const handleExportCsv = async () => {
        if (!metrics) return;
        setIsExporting(true);
        try {
            setExportError(null);
            const csvData = await exportCsv.mutateAsync();

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

    if (!metrics) {
        return error ? (
            <Alert variant="error" role="alert">{t('admin.reports.loadError')}</Alert>
        ) : (
            <div className="py-6">
                <Spinner label={t('admin.reports.loading')}/>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => void handleExportCsv()}
                    isLoading={isExporting}
                    loadingText={t('admin.reports.exporting')}
                    leftIcon={<FileSpreadsheet size={16} aria-hidden="true"/>}
                    className="text-xs font-bold"
                >
                    {t('admin.reports.exportCsv')}
                </Button>
            </div>

            {exportError && <Alert variant="error" role="alert" className="text-sm">{exportError}</Alert>}

            <MetricStrip>
                <KpiCard
                    label={t('admin.reports.plannedHours')}
                    value={t('admin.reports.hoursValue', {hours: formatNumber(metrics.totalFlightHours)})}
                    meta={t('admin.reports.plannedHoursNote')}
                    icon={<Clock size={16} aria-hidden="true"/>}
                    tone="red"
                />
                <KpiCard
                    label={t('admin.reports.completedMissions')}
                    value={`${metrics.completedMissions} / ${metrics.totalMissions}`}
                    meta={`${t('admin.reports.successRate')} ${formatNumber(metrics.missionSuccessRate / 100, {style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1})}`}
                    icon={<CheckCircle2 size={16} aria-hidden="true"/>}
                    tone="blue"
                />
                <KpiCard
                    label={t('admin.reports.sarOperations')}
                    value={metrics.sarOperationsCount}
                    meta={`${t('admin.reports.verifiedDetections')} ${t('admin.reports.detectionsCount', {count: metrics.victimsRescuedCount})}`}
                    icon={<LifeBuoy size={16} aria-hidden="true"/>}
                    tone="red"
                />
                <KpiCard
                    label={t('admin.reports.uavStatus')}
                    value={`${metrics.activeUavCount} ${t('admin.reports.uavActive')}`}
                    meta={t('admin.reports.uavMaintenance', {count: metrics.maintenanceUavCount})}
                    icon={<PlaneTakeoff size={16} aria-hidden="true"/>}
                    tone="amber"
                />
            </MetricStrip>

            <MissionCharts/>

            <AdminSlaIntelligenceSection/>

            <Alert variant="info" className="py-2.5 text-xs">
                {t('admin.reports.footer', {count: metrics.totalStationsCount})}
            </Alert>
        </div>
    );
}

export default function AdminReportsPage() {
    return (
        <AdminPage
            title="admin.pages.reports.title"
            permission="DASHBOARD_VIEW"
            activeResource="reports"
        >
            <AdminReportsContent/>
        </AdminPage>
    );
}
