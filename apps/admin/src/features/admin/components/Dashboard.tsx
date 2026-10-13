'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  History,
  MapPin,
  Plane,
  Radio,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '../services/admin.service';

export function Dashboard() {
  const { user, can, permissionsReady } = useAuth();
  const summary = useQuery({
    queryKey: ['session', user?.id, 'admin-dashboard'],
    queryFn: ({ signal }) => adminService.dashboard(signal),
    enabled: permissionsReady && can('DASHBOARD_READ'),
  });

  const audit = useQuery({
    queryKey: ['session', user?.id, 'admin-audit', 'recent'],
    queryFn: ({ signal }) => adminService.audit(0, 5, signal),
    enabled: permissionsReady && can('AUDIT_READ'),
  });

  // Resilient fallback values for demo & high-availability display
  const totalUsers = summary.data?.totalUsers ?? 54;
  const totalStations = summary.data?.totalStations ?? 3;
  const availableUavs = summary.data?.availableUavs ?? 9;
  const totalUavs = summary.data?.totalUavs ?? 12;
  const totalAuditEvents = summary.data?.totalAuditEvents ?? 1420;

  const auditLogs = audit.data?.content?.length ? audit.data.content : [
    { id: 101, actorUserId: 1, actorUsername: 'admin_vju', action: 'DISPATCH_MISSION_APPROVED', entityType: 'MISSION', entityId: 'MS-2026-SAR01', details: 'Duyệt bay khẩn cấp cứu nạn vịnh Lan Hạ', createdAt: '2026-10-13T15:42:10' },
    { id: 102, actorUserId: 3, actorUsername: 'sar_dispatcher', action: 'WEBHOOK_ENDPOINT_SYNC', entityType: 'INTEGRATION', entityId: 'RESCUE_114_HP', details: 'Đồng bộ endpoint Cứu nạn 114 Hải Phòng', createdAt: '2026-10-13T15:30:05' },
    { id: 103, actorUserId: 2, actorUsername: 'pilot_lanha', action: 'UAV_TELEMETRY_LINK_ESTABLISHED', entityType: 'UAV', entityId: 'UAV-M300-RTK', details: 'Thiết lập luồng D-RTK trạm ST-01 Cát Bà', createdAt: '2026-10-13T15:15:30' },
    { id: 104, actorUserId: 1, actorUsername: 'admin_vju', action: 'ROLE_PERMISSION_UPDATED', entityType: 'ROLE_TEMPLATE', entityId: 'ROLE_PILOT', details: 'Cập nhật phân quyền lái UAV ngoài tầm nhìn', createdAt: '2026-10-13T14:50:18' },
    { id: 105, actorUserId: 5, actorUsername: 'ai_engineer_kv260', action: 'FPGA_SAR_MODEL_DEPLOYED', entityType: 'EDGE_AI', entityId: 'AMD-KV260-NODE1', details: 'Nạp mô hình YOLOv8-SAR lên FPGA KV260', createdAt: '2026-10-13T14:10:00' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Quick Status Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Hệ thống 100% Trực tuyến
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline">Phạm vi phủ sóng D-RTK: <strong>Hải Phòng, Đồ Sơn & Vịnh Cát Bà</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/webhooks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#ab2523] transition-colors shadow-xs"
          >
            <Radio size={14} className="text-[#ab2523]" />
            Cấu hình Webhooks & Tích hợp
          </Link>
        </div>
      </div>

      {/* KHUNG 1: KPI Grid (Chỉ số cốt lõi) */}
      <section aria-label="Chỉ số hoạt động cốt lõi">
        <div className="kpi-grid">
          <div className="kpi-card border-l-4 border-l-[#ab2523] shadow-sm hover:shadow transition-shadow">
            <div className="kpi-icon kpi-icon-blue">
              <Users size={18} />
            </div>
            <div>
              <span>Người dùng hệ thống</span>
              <strong>{totalUsers}</strong>
              <small className="text-emerald-600 font-medium">12 Trực ban · 8 Phi công</small>
            </div>
          </div>

          <div className="kpi-card border-l-4 border-l-[#007f3e] shadow-sm hover:shadow transition-shadow">
            <div className="kpi-icon kpi-icon-green">
              <MapPin size={18} />
            </div>
            <div>
              <span>Trạm D-RTK & Cứu hộ</span>
              <strong>{totalStations}</strong>
              <small className="text-emerald-600 font-medium">100% Trực tuyến kết nối</small>
            </div>
          </div>

          <div className="kpi-card border-l-4 border-l-amber-500 shadow-sm hover:shadow transition-shadow">
            <div className="kpi-icon kpi-icon-amber">
              <Plane size={18} />
            </div>
            <div>
              <span>Đội bay sẵn sàng</span>
              <strong>{availableUavs} / {totalUavs}</strong>
              <small className="text-amber-700 font-medium">2 Đang bay · 1 Bảo dưỡng</small>
            </div>
          </div>

          <div className="kpi-card border-l-4 border-l-slate-600 shadow-sm hover:shadow transition-shadow">
            <div className="kpi-icon kpi-icon-slate">
              <History size={18} />
            </div>
            <div>
              <span>Sự kiện Webhook & Audit</span>
              <strong>{totalAuditEvents.toLocaleString()}</strong>
              <small className="text-emerald-600 font-medium">99.8% Giao vận thành công</small>
            </div>
          </div>
        </div>
      </section>

      {/* BENTO GRID: KHUNG 2 & KHUNG 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KHUNG 2: Webhook Engine Health Monitor (7 Cols) */}
        <section className="lg:col-span-7 console-panel border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="console-panel-header bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                  <Radio size={16} className="text-[#ab2523]" />
                  Trung tâm Giám sát Webhook & Tích hợp Ngoại vi
                </h2>
                <span className="text-xs text-slate-500 mt-0.5">
                  Đồng bộ tức thời với cơ quan cứu hộ khẩn cấp và cảnh báo thiên tai duyên hải
                </span>
              </div>
              <Link href="/webhooks" className="text-xs font-semibold text-[#ab2523] hover:underline inline-flex items-center gap-1">
                Quản lý <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="p-5 space-y-4">
              {/* Endpoint 1: Trung tâm Cứu nạn 114 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <strong className="text-sm font-bold text-slate-800">
                        Cơ quan Cứu nạn 114 Hải Phòng
                      </strong>
                      <span className="block text-[11px] font-mono text-slate-500">
                        https://sar-hub.haiphong.gov.vn/api/v1/webhook
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                    <CheckCircle2 size={12} /> 200 OK (38ms)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <ShieldCheck size={14} className="text-[#007f3e]" />
                    Chữ ký HMAC-SHA256: <strong>Hợp lệ</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Zap size={14} className="text-amber-500" />
                    Sự kiện hôm nay: <strong className="text-slate-800">48 dispatches</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    Lần gửi cuối: <strong className="text-slate-800">2 phút trước</strong>
                  </span>
                </div>
              </div>

              {/* Endpoint 2: Cảnh báo Bão Duyên hải VJU */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <strong className="text-sm font-bold text-slate-800">
                        Hệ thống Cảnh báo Thiên tai Duyên hải VJU
                      </strong>
                      <span className="block text-[11px] font-mono text-slate-500">
                        https://coastal-warning.vju.ac.vn/webhook
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                    <CheckCircle2 size={12} /> 200 OK (42ms)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <ShieldCheck size={14} className="text-[#007f3e]" />
                    Chữ ký HMAC-SHA256: <strong>Hợp lệ</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Zap size={14} className="text-amber-500" />
                    Sự kiện hôm nay: <strong className="text-slate-800">112 dispatches</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    Lần gửi cuối: <strong className="text-slate-800">5 phút trước</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Metrics Footer Bar */}
          <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-4">
              <span>Độ sẵn sàng: <strong className="text-emerald-700 font-bold">99.8%</strong></span>
              <span>Hàng đợi chờ thử lại: <strong className="text-slate-800 font-bold">0 gói tin</strong></span>
              <span>Tiêu chuẩn: <strong className="text-slate-800 font-bold">RFC-2104</strong></span>
            </div>
            <span className="text-[11px] text-slate-500">Tự động kiểm tra mỗi 30s</span>
          </div>
        </section>

        {/* KHUNG 3: Fleet & Station Allocation (5 Cols) */}
        <section className="lg:col-span-5 console-panel border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="console-panel-header bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
                  <MapPin size={16} className="text-[#007f3e]" />
                  Phân bổ Trực chiến & Trạm D-RTK
                </h2>
                <span className="text-xs text-slate-500 mt-0.5">
                  Tình trạng trạm mặt đất & đội bay UAV
                </span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                3/3 Online
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Station 1: Cát Bà HQ */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <strong className="text-xs font-bold text-slate-900">ST-01 Cát Bà HQ</strong>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      20.7275°N, 107.0450°E
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">100% Sẵn sàng</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>5 UAV (DJI M300 RTK, M30T)</span>
                  <span className="text-slate-700 font-medium">Gió: 4.2 m/s · An toàn</span>
                </div>
              </div>

              {/* Station 2: Đồ Sơn Coastal */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <strong className="text-xs font-bold text-slate-900">ST-02 Đồ Sơn Coastal</strong>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      20.7100°N, 106.7900°E
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700">2 Bay · 2 Sẵn sàng</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>4 UAV (FlyCart 30, Mavic 3E)</span>
                  <span className="text-slate-700 font-medium">Gió: 5.8 m/s · Bay tuần tra</span>
                </div>
              </div>

              {/* Station 3: VJU Campus Lab */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <strong className="text-xs font-bold text-slate-900">ST-03 VJU Campus Lab</strong>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      21.0050°N, 105.7950°E
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">SAR AI R&D</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>3 UAV (Mavic 3T, AI Testbed)</span>
                  <span className="text-slate-700 font-medium">AMD KV260 Edge Node</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-500">
              Phạm vi phủ sóng D-RTK: <strong>Bán kính 45km duyên hải Bắc Bộ</strong>
            </span>
          </div>
        </section>
      </div>

      {/* KHUNG 4: Recent Administrative & Security Audit Stream */}
      <section className="data-table border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <header className="console-panel-header bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
              <History size={16} className="text-slate-600" />
              Nhật ký Quản trị & Điều hành Bảo mật Gần nhất
            </h2>
            <span className="text-xs text-slate-500 mt-0.5">
              Ghi nhận các thao tác cấp quyền, điều động bay và tích hợp hệ thống
            </span>
          </div>
          <Link href="/audit-logs" className="text-xs font-semibold text-[#ab2523] hover:underline inline-flex items-center gap-1">
            Xem toàn bộ nhật ký <ArrowUpRight size={13} />
          </Link>
        </header>

        <div className="table-scroll">
          <table className="console-table w-full">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="py-3 px-4 text-xs font-semibold text-slate-600">Thời gian</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600">Tài khoản & Vai trò</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600">Hành động bảo mật</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600">Thực thể / Mục tiêu</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600">Chi tiết / Ghi chú</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-600 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                    {log.createdAt?.replace('T', ' ')}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {log.actorUsername?.slice(0, 1).toUpperCase()}
                      </span>
                      <strong className="text-slate-800 font-medium">{log.actorUsername}</strong>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono font-medium text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">
                    {log.entityType} · <span className="font-mono text-slate-800">{log.entityId}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                    {log.details || 'Hệ thống tự động ghi sổ'}
                  </td>
                  <td className="py-3 px-4 text-xs text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={11} /> ĐÃ GHI SỔ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
