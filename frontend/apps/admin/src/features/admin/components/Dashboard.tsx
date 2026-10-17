'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Users, MapPin, Plane, History } from 'lucide-react';
import { displayLabel, formatDate, auditDetail } from '@uav/ui/presentation';
import { useAuth } from '@/contexts/AuthContext';
import { KpiCard } from '@/components/ui';
import { QueryState, EmptyState } from '@/components/data/WorkspaceState';
import { adminService } from '../services/admin.service';

export function Dashboard() {
  const { user, can, permissionsReady } = useAuth();
  const summary = useQuery({ queryKey: ['session', user?.id, 'admin-dashboard'], queryFn: ({ signal }) => adminService.dashboard(signal), enabled: permissionsReady && can('DASHBOARD_READ') });
  const audit = useQuery({ queryKey: ['session', user?.id, 'admin-audit', 'recent'], queryFn: ({ signal }) => adminService.audit(0, 5, signal), enabled: permissionsReady && can('AUDIT_READ') });
  const cards = summary.data ? [
    { label: 'Người dùng', value: summary.data.totalUsers, icon: <Users size={18} />, tone: 'blue' as const },
    { label: 'Trạm', value: summary.data.totalStations, icon: <MapPin size={18} />, tone: 'green' as const },
    { label: 'UAV sẵn sàng', value: summary.data.availableUavs ?? '—', meta: `Tổng số: ${summary.data.totalUavs ?? '—'} UAV`, icon: <Plane size={18} />, tone: 'amber' as const },
    { label: 'Sự kiện nhật ký', value: summary.data.totalAuditEvents, icon: <History size={18} />, tone: 'slate' as const },
  ] : [];
  const shortcuts = [
    { href: '/users', label: 'Người dùng', detail: 'Tra cứu tài khoản và trạng thái truy cập', permission: 'USER_READ' },
    { href: '/access-control', label: 'Phân quyền', detail: 'Quản lý quyền truy cập theo tài khoản', permission: 'PERMISSION_MANAGE' },
    { href: '/billing', label: 'Gói cước và hạn mức', detail: 'Theo dõi gói dịch vụ và giờ bay', permission: 'PERMISSION_MANAGE' },
    { href: '/settings', label: 'Cấu hình hệ thống', detail: 'Tham số vận hành và tự động hóa', permission: 'PERMISSION_MANAGE' },
  ].filter(item => can(item.permission));
  return <div className="space-y-6">
    <QueryState query={summary}>{summary.data && <div className="kpi-grid">{cards.map(card => <KpiCard key={card.label} {...card} />)}</div>}</QueryState>
    <div className="portal-dashboard-grid">
      <section className="console-panel"><header className="console-panel-header"><h2>Truy cập nhanh</h2></header>
        <div className="portal-shortcuts">{shortcuts.map(item => <Link key={item.href} href={item.href} className="portal-shortcut"><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowUpRight size={18} aria-hidden="true" /></Link>)}</div>
      </section>
      <section className="console-panel"><header className="console-panel-header"><h2>Kết nối giám sát</h2><span className="status-badge status-badge-muted">Chưa có dữ liệu</span></header>
        <div className="panel-body space-y-4"><p className="text-secondary">Chưa kết nối giám sát thiết bị thời gian thực. Trạng thái trạm, chất lượng kết nối và số liệu phân phối thông báo sẽ được hiển thị khi có dữ liệu xác thực.</p>
          {can('PERMISSION_MANAGE') && <Link href="/webhooks" className="portal-button portal-button-outline inline-flex items-center gap-2 px-4">Quản lý kết nối <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        </div>
      </section>
    </div>
    {can('AUDIT_READ') && <QueryState query={audit}><section className="data-table audit-table">
      <header className="console-panel-header"><h2>Hoạt động quản trị gần đây</h2><Link href="/audit-logs" className="text-primary font-semibold">Xem toàn bộ nhật ký →</Link></header>
      {audit.data?.content.length ? <div className="table-scroll" tabIndex={0} aria-label="Hoạt động quản trị gần đây"><table className="console-table">
        <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Nội dung</th></tr></thead>
        <tbody>{audit.data.content.map(log => <tr key={log.id}>
          <td data-label="Thời gian"><time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time></td>
          <td data-label="Người thực hiện"><span className="table-primary">{log.actorUsername || 'Hệ thống'}</span></td>
          <td data-label="Thao tác"><span className="audit-action">{displayLabel(log.action)}</span></td>
          <td data-label="Đối tượng">{displayLabel(log.entityType)} · {log.entityId}</td>
          <td data-label="Nội dung" className="audit-details">{auditDetail(log.details)}</td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="Chưa có hoạt động quản trị" detail="Các thao tác quản trị sẽ xuất hiện tại đây." />}
    </section></QueryState>}
  </div>;
}
