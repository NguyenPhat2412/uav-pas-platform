'use client';

import React, { useState, useEffect } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { 
  BarChart3, 
  PlaneTakeoff, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Wrench,
  LifeBuoy,
  FileSpreadsheet
} from 'lucide-react';
import { adminService } from '@/features/admin/services/admin.service';
import type { OperationsReportData } from '@/features/admin/types';

function AdminReportsContent() {
  const [metrics, setMetrics] = useState<OperationsReportData | null>(null);
  const [error, setError] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    adminService.operationsReport()
      .then(res => { if (res) setMetrics(res); })
      .catch(() => setError(true));
  }, []);

  const handleExportCsv = async () => {
    if (!metrics) return;
    setIsExporting(true);
    try {
      setExportError(null);
      const csvData = await adminService.exportOperationsCsv();

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `uav_operations_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Không xuất được báo cáo CSV. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!metrics) return <p role="status">{error ? 'Không tải được báo cáo. Chưa có dữ liệu để hiển thị hoặc xuất CSV.' : 'Đang tải báo cáo…'}</p>;

  return (
    <div className="portal-management space-y-6">
      {/* Top Banner with CSV Export */}
      <div className="portal-card bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="text-[#ab2523]" /> Báo cáo Tổng thể Hoạt động & Vận hành Đội Bay
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu nhiệm vụ theo quyền truy cập. Giờ là thời lượng dự kiến của mọi trạng thái; phát hiện đã xác minh không chứng minh kết quả cứu hộ.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isExporting}
          className="portal-button portal-button-primary flex items-center gap-2 px-4 py-2.5 bg-[#007f3e] hover:bg-[#006632] text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 shrink-0"
        >
          <FileSpreadsheet size={16} />
          {isExporting ? 'Đang xuất CSV…' : 'Xuất Báo Cáo CSV'}
        </button>
      </div>

      {exportError && <p role="alert" className="text-sm text-red-700">{exportError}</p>}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-2 border-t-[#ab2523]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Giờ dự kiến theo lịch</span>
            <Clock size={16} className="text-[#ab2523]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{metrics.totalFlightHours}h</div>
          <div className="text-[11px] text-[#007f3e] mt-1 flex items-center gap-1 font-medium">
            <TrendingUp size={12} /> Bao gồm nhiệm vụ nháp, hủy và hoàn thành
          </div>
        </div>

        <div className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Nhiệm vụ hoàn thành</span>
            <CheckCircle2 size={16} className="text-[#007f3e]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics.completedMissions} <span className="text-sm font-normal text-slate-400">/ {metrics.totalMissions}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tỷ lệ thành công: <strong className="text-[#007f3e] font-mono">{metrics.missionSuccessRate.toFixed(1)}%</strong>
          </div>
        </div>

        <div className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-t-2 border-t-[#ab2523]">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Chiến dịch SAR</span>
            <LifeBuoy size={16} className="text-[#ab2523]" />
          </div>
          <div className="text-2xl font-black text-[#ab2523] font-mono">{metrics.sarOperationsCount}</div>
          <div className="text-[11px] text-slate-600 mt-1">
            Phát hiện người đã xác minh: <strong className="text-slate-900 font-mono">{metrics.victimsRescuedCount} phát hiện</strong>
          </div>
        </div>

        <div className="portal-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tình trạng UAV</span>
            <PlaneTakeoff size={16} className="text-[#ab2523]" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {metrics.activeUavCount} <span className="text-xs font-normal text-[#007f3e] font-semibold">Sẵn sàng / đã giao / đang dùng</span>
          </div>
          <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
            <Wrench size={12} /> {metrics.maintenanceUavCount} UAV đang bảo trì
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">Tổng số trạm: {metrics.totalStationsCount}. Báo cáo chưa có số liệu thời gian bay thực tế, kết quả cứu hộ, phân bố loại nhiệm vụ hoặc hiệu năng phần cứng.</p>
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <AdminPage
      title="Báo cáo & Thống kê Hệ thống"
      meta="Báo cáo hiệu suất đội bay, chiến dịch SAR, tỷ lệ hoàn thành và xuất dữ liệu CSV"
      permission="DASHBOARD_READ"
      activeResource="reports"
    >
      <AdminReportsContent />
    </AdminPage>
  );
}
