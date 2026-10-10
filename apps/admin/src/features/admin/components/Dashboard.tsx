'use client';

import { useQuery } from '@tanstack/react-query';
import { History, MapPin, Plane, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QueryState } from '@/components/data/WorkspaceState';
import { KpiCard } from '@/components/ui';
import { adminService } from '../services/admin.service';

export function Dashboard() {
  const { user, can, permissionsReady } = useAuth();
  const summary = useQuery({ queryKey: ['session', user?.id, 'admin-dashboard'], queryFn: ({ signal }) => adminService.dashboard(signal), enabled: permissionsReady && can('DASHBOARD_READ') });
  const audit = useQuery({ queryKey: ['session', user?.id, 'admin-audit', 'recent'], queryFn: ({ signal }) => adminService.audit(0, 5, signal), enabled: permissionsReady && can('AUDIT_READ') });
  const cards = summary.data ? [
    { label: 'Người dùng', value: summary.data.totalUsers, icon: <Users size={18} />, tone: 'blue' as const },
    { label: 'Trạm', value: summary.data.totalStations, icon: <MapPin size={18} />, tone: 'green' as const },
    { label: 'UAV sẵn sàng', value: summary.data.availableUavs, icon: <Plane size={18} />, tone: 'amber' as const },
    { label: 'Sự kiện audit', value: summary.data.totalAuditEvents, icon: <History size={18} />, tone: 'slate' as const },
  ] : [];
  return <div className="space-y-6"><QueryState query={summary}>{summary.data && <><div className="kpi-grid">{cards.map(card => <KpiCard key={card.label} {...card} />)}</div><section className="console-panel p-5"><h2 className="font-semibold">Phạm vi dữ liệu</h2><p className="mt-2 text-sm text-slate-600">Các số liệu lấy từ /api/v1/dashboard/summary. Chỉ hiển thị trường backend cung cấp; không suy diễn active user, organization hay payment.</p></section></>}</QueryState>{can('AUDIT_READ') && <QueryState query={audit}><section className="data-table"><header className="console-panel-header"><h2>Hoạt động quản trị gần đây</h2><span>5 bản ghi mới nhất</span></header>{audit.data?.content.length ? <div className="table-scroll"><table className="console-table"><thead><tr><th>Thời gian</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>{audit.data.content.map(log => <tr key={log.id}><td>{log.createdAt.replace('T', ' ')}</td><td>{log.actorUsername}</td><td>{log.action}</td><td>{log.entityType} · {log.entityId}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-slate-500">Chưa có hoạt động audit.</p>}</section></QueryState>}</div>;
}
