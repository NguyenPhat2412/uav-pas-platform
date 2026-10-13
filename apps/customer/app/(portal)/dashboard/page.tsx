'use client';
import Link from 'next/link';
import { PageGuard } from '@/components/layout';
import { Panel, Button, Status } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useMissions, useServices } from '@/features/customer/hooks';
import { Activity, ArrowUpRight, Boxes, CheckCircle2, Clock, CreditCard, Plane, ShieldCheck, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  return <PageGuard><Dashboard /></PageGuard>;
}

const DEMO_MISSIONS = [
  { id: 1, code: 'MS-2026-SAR01', title: 'Cứu hộ khẩn cấp ngư dân vịnh Lan Hạ', startTime: '2026-10-13T08:30:00Z', status: 'IN_PROGRESS' },
  { id: 2, code: 'MS-2026-PATROL02', title: 'Tuần tra duyên hải & giám sát sạt lở Cát Bà', startTime: '2026-10-12T14:00:00Z', status: 'COMPLETED' },
  { id: 3, code: 'MS-2026-MED03', title: 'Vận chuyển thiết bị y tế khẩn cấp trạm Đồ Sơn', startTime: '2026-10-11T09:15:00Z', status: 'COMPLETED' },
];

function Dashboard() {
  const { user } = useAuth();
  const missions = useMissions();
  const services = useServices();
  const realRows = missions.data?.content ?? [];
  const rows = realRows.length > 0 ? realRows : DEMO_MISSIONS;
  const totalMissions = realRows.length > 0 ? (missions.data?.totalElements ?? rows.length) : rows.length;
  const inProgressMissions = rows.filter(m => ['PENDING_CONFIRMATION', 'CONFIRMED', 'RESOURCE_RESERVED', 'READY', 'IN_PROGRESS'].includes(m.status)).length;
  const openServices = services.data?.length ?? 6;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 26, background: '#ab2523', borderRadius: 9999, display: 'inline-block' }} />
            Xin chào, {user?.fullName || user?.username || 'Khách hàng VJU'}
          </h1>
          <p>Hệ thống giám sát nhiệm vụ UAV, điều phối bay khẩn cấp và gói dịch vụ duyên hải VJU.</p>
        </div>
        <Link href="/missions/create">
          <Button style={{ background: '#ab2523', color: '#fff', fontWeight: 700 }}>
            + Đặt dịch vụ UAV
          </Button>
        </Link>
      </div>

      {/* Frame 1: KPI Grid */}
      <div className="grid grid-3">
        <Panel style={{ borderTop: '3px solid #ab2523' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>Tổng số Mission</span>
            <Activity size={18} style={{ color: '#ab2523' }} />
          </div>
          <div className="metric" style={{ marginTop: 8, color: '#0f172a' }}>{totalMissions}</div>
          <small style={{ color: '#64748b', fontSize: 12 }}>Đã đăng ký trên hệ thống</small>
        </Panel>

        <Panel style={{ borderTop: '3px solid #007f3e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>Đang tác chiến / xử lý</span>
            <Plane size={18} style={{ color: '#007f3e' }} />
          </div>
          <div className="metric" style={{ marginTop: 8, color: '#007f3e' }}>{inProgressMissions}</div>
          <small style={{ color: '#007f3e', fontSize: 12 }}>Trực ban đang kết nối vệ tinh</small>
        </Panel>

        <Panel style={{ borderTop: '3px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>Dịch vụ đang mở</span>
            <Boxes size={18} style={{ color: '#0284c7' }} />
          </div>
          <div className="metric" style={{ marginTop: 8, color: '#0f172a' }}>{openServices}</div>
          <small style={{ color: '#64748b', fontSize: 12 }}>Cứu hộ, khảo sát, kiểm tra</small>
        </Panel>
      </div>

      {/* Frame 2 & 3: Mission Stream & Quota Status */}
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        {/* Frame 2: Mission Table */}
        <Panel
          title="Mission gần đây"
          action={<Link href="/missions" className="button-link" style={{ fontSize: 13, color: '#ab2523', fontWeight: 700 }}>Xem tất cả</Link>}
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã nhiệm vụ</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map(m => (
                  <tr key={m.id}>
                    <td>
                      <Link className="button-link" href={`/missions/${m.id}`} style={{ fontWeight: 700, color: '#0f172a' }}>
                        {m.code}
                      </Link>
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{m.title}</div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {(() => {
                        if (!m.startTime) return '13/10/2026';
                        const d = new Date(m.startTime);
                        return isNaN(d.getTime()) ? '13/10/2026' : d.toLocaleDateString('vi-VN');
                      })()}
                    </td>
                    <td>
                      <Status value={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Frame 3: Quota & Quick Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Hạn mức bay & Gói cước VJU">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Gói dịch vụ hiện tại:</span>
                <span style={{ fontWeight: 800, color: '#ab2523', fontSize: 13, background: '#fdf2f2', padding: '3px 10px', borderRadius: 9999, border: '1px solid #fecdd3' }}>
                  Enterprise SAR
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Giờ bay đã sử dụng:</span>
                  <strong>18.5 / 50 giờ (37%)</strong>
                </div>
                <div style={{ width: '100%', height: 7, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                  <div style={{ width: '37%', height: '100%', background: '#ab2523', borderRadius: 9999 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>
                <span>Chu kỳ thanh toán kế tiếp:</span>
                <strong style={{ color: '#0f172a' }}>01/11/2026</strong>
              </div>
            </div>
          </Panel>

          <Panel title="Bắt đầu nhanh">
            <div className="grid" style={{ gap: 10 }}>
              <Link href="/services" className="button button-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                <span>Khám phá danh mục dịch vụ UAV</span>
                <ArrowUpRight size={15} />
              </Link>
              <Link href="/missions/create" className="button button-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                <span>Tạo yêu cầu bay cứu nạn khẩn cấp</span>
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
