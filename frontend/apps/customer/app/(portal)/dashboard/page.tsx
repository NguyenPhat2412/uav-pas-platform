'use client';
import Link from 'next/link';
import { planName } from '@uav/ui/presentation';
import { PageGuard } from '@/components/layout';
import { Panel, Status } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useMissions, useServices, useBilling } from '@/features/customer/hooks';
import { Activity, ArrowUpRight, Boxes, Plane } from 'lucide-react';

export default function DashboardPage() {
  return <PageGuard><Dashboard /></PageGuard>;
}

function Dashboard() {
  const { user } = useAuth();
  const missions = useMissions();
  const services = useServices();
  const { quota } = useBilling();
  const realRows = missions.data?.content ?? [];
  const rows = realRows;
  const totalMissions = missions.data?.totalElements ?? 0;
  const inProgressMissions = rows.filter(m => ['PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(m.status)).length;
  const openServices = services.data?.length ?? 0;

  return (
    <>
      {(missions.isError || services.isError) && <div role="alert" className="notice error">Không tải được dữ liệu tổng quan. Vui lòng tải lại trang.</div>}
      <div className="page-heading">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 8, height: 26, background: '#ab2523', borderRadius: 9999, display: 'inline-block' }} />
            Xin chào, {user?.fullName || user?.username || 'Khách hàng VJU'}
          </h1>
          <p>Theo dõi yêu cầu dịch vụ, tiến độ nhiệm vụ và hạn mức sử dụng.</p>
        </div>
        <Link href="/missions/create" className="button button-primary">Đặt dịch vụ UAV</Link>
      </div>

      {/* Frame 1: KPI Grid */}
      <div className="grid grid-3">
        <Panel style={{ borderLeft: '4px solid #ab2523' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ display: 'flex', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#fdf2f2', color: '#ab2523', flexShrink: 0 }}>
              <Activity size={18} />
            </span>
            <div>
              <span className="muted" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Tổng số nhiệm vụ</span>
              <div className="metric" style={{ marginTop: 8, color: '#0f172a' }}>{totalMissions}</div>
              <small style={{ display: 'block', marginTop: 8, color: '#64748b', fontSize: 12, fontWeight: 500 }}>Đã đăng ký trên hệ thống</small>
            </div>
          </div>
        </Panel>

        <Panel style={{ borderLeft: '4px solid #007f3e' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ display: 'flex', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#ecfdf5', color: '#007f3e', flexShrink: 0 }}>
              <Plane size={18} />
            </span>
            <div>
              <span className="muted" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Đang xử lý trong trang gần đây</span>
              <div className="metric" style={{ marginTop: 8, color: '#007f3e' }}>{inProgressMissions}</div>
              <small style={{ display: 'block', marginTop: 8, color: '#007f3e', fontSize: 12, fontWeight: 500 }}>Theo trạng thái nhiệm vụ đã tải</small>
            </div>
          </div>
        </Panel>

        <Panel style={{ borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ display: 'flex', width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#fffbeb', color: '#d97706', flexShrink: 0 }}>
              <Boxes size={18} />
            </span>
            <div>
              <span className="muted" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>Dịch vụ đang mở</span>
              <div className="metric" style={{ marginTop: 8, color: '#0f172a' }}>{openServices}</div>
              <small style={{ display: 'block', marginTop: 8, color: '#64748b', fontSize: 12, fontWeight: 500 }}>Các dịch vụ UAV đang được hỗ trợ</small>
            </div>
          </div>
        </Panel>
      </div>

      {/* Frame 2 & 3: Mission Stream & Quota Status */}
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        {/* Frame 2: Mission Table */}
        <Panel
          title="Nhiệm vụ gần đây"
          action={<Link href="/missions" className="button-link" style={{ fontSize: 12, color: '#ab2523', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Xem tất cả <ArrowUpRight size={13} /></Link>}
          style={{ height: '100%' }}
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã nhiệm vụ</th>
                  <th>Thời gian</th>
                  <th style={{ textAlign: 'right' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length && <tr><td colSpan={3}>{missions.isPending ? 'Đang tải nhiệm vụ…' : 'Chưa có nhiệm vụ.'}</td></tr>}
                {rows.slice(0, 5).map(m => (
                  <tr key={m.id}>
                    <td>
                      <Link className="button-link" href={`/missions/${m.id}`} style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                        {m.code}
                      </Link>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{m.title}</div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {(() => {
                        if (!m.startTime) return '—';
                        const d = new Date(m.startTime);
                        return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Status value={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Frame 3: Quota & Quick Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 18, height: '100%' }}>
          <Panel title="Hạn mức bay & Gói cước VJU">
            {quota.isPending ? <p>Đang tải hạn mức…</p> : quota.isError ? <p role="status">Chưa tải được thông tin hạn mức. <Link href="/billing">Xem gói cước</Link></p> : <div className="stack">
              <p>Gói hiện tại: <strong>{quota.data?.planName ? planName(quota.data.planName) : 'Chưa đăng ký'}</strong></p>
              <p>Giờ bay đã dùng: <strong>{quota.data?.flightHoursUsed ?? 0} / {quota.data?.flightHoursLimit ?? 0}</strong></p>
              <p>Kết thúc chu kỳ: <strong>{quota.data?.cycleEnd ? new Date(quota.data.cycleEnd).toLocaleDateString('vi-VN') : '—'}</strong></p>
            </div>}
          </Panel>

          <Panel title="Bắt đầu nhanh" style={{ flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/services" className="button button-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                <span>Khám phá danh mục dịch vụ UAV</span>
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/missions/create" className="button button-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                <span>Tạo yêu cầu dịch vụ UAV</span>
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/billing" className="button button-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                <span>Quản lý thanh toán & Hóa đơn VietQR</span>
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
