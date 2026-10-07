'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Boxes, FileKey2, MapPinned, PlaneTakeoff, ShieldCheck, Users, ArrowUpRight, RadioTower, Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Spinner, StatusBadge } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { missionService } from '@/features/missions/services/mission.service';
import type { DashboardSummary } from '@/features/dashboard/types/dashboard.types';
import type { MissionDashboard } from '@/features/missions/types/mission.types';
import { useCollection } from '@/features/operations/hooks/useCollections';

const quickActions = [
  { icon: Settings2, label: 'Vận hành', href: '/operations' },
  { icon: Activity, label: 'Mission', href: '/missions' },
  { icon: ShieldCheck, label: 'Truy cập', href: '/access-control' },
  { icon: FileKey2, label: 'Media', href: '/operations?tab=media' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [missions, setMissions] = useState<MissionDashboard | null>(null);
  const uavsQuery = useCollection('uavs');
  const stationsQuery = useCollection('stations');
  const [error, setError] = useState(false);
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isAuthenticated, isLoading, router]);
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.allSettled([dashboardService.getSummary(), missionService.dashboard()]).then(([resources, mission]) => {
      if (resources.status === 'fulfilled') setSummary(resources.value); else setError(true);
      if (mission.status === 'fulfilled') setMissions(mission.value);
    });
  }, [isAuthenticated]);
  if (isLoading || !isAuthenticated || !user) return <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb]"><Spinner size="lg" label="Đang xác thực" /></div>;

  return <AppShell><div className="w-full">
    <PageHeader title="Tổng quan vận hành" action={{ label: 'Mở vận hành', href: '/operations' }} />
    {error && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được toàn bộ số liệu. Các module còn lại vẫn khả dụng.</div>}
    <section className="inline-summary mb-5" aria-label="Tóm tắt toàn bộ dữ liệu được cấp quyền"><span><Users size={15} /> Người dùng <strong>{summary?.totalUsers ?? '—'}</strong></span><span><MapPinned size={15} /> Trạm <strong>{summary?.totalStations ?? '—'}</strong></span><span><PlaneTakeoff size={15} /> UAV sẵn sàng <strong>{summary?.availableUavs ?? '—'}</strong></span><span><Boxes size={15} /> Thiết bị <strong>{summary?.totalEquipmentUnits ?? '—'}</strong></span><span><Activity size={15} /> Audit events <strong>{summary?.totalAuditEvents ?? '—'}</strong></span></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(370px,.75fr)]">
      <div className="space-y-5">
        <div className="console-panel">
          <div className="console-panel-header"><div><h2>Tổng quan mission</h2><span>Trạng thái quy trình hiện tại</span></div><Link href="/missions" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Mở danh sách <ArrowUpRight size={14} /></Link></div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            <MissionMetric label="Tổng mission" value={missions?.totalMissions} icon={<Activity size={15} />} />
            <MissionMetric label="Đang xử lý" value={missions?.inProgressMissions} icon={<RadioTower size={15} />} tone="blue" />
            <MissionMetric label="Hoàn tất" value={missions?.completedMissions} icon={<ShieldCheck size={15} />} tone="green" />
            <MissionMetric label="Thất bại" value={missions?.failedMissions} icon={<Activity size={15} />} tone="red" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs"><span className="text-slate-500">Đang chờ xác nhận: <strong className="text-slate-800">{missions?.pendingMissions ?? '—'}</strong></span><span className="text-slate-500">Sẵn sàng: <strong className="text-slate-800">{missions?.readyMissions ?? '—'}</strong></span><Link href="/missions/create" className="font-semibold text-primary hover:underline">Tạo mission mới</Link></div>
        </div>
        <div className="console-panel"><div className="console-panel-header"><div><h2>Trạng thái đội UAV</h2><span>Ảnh chụp hiện tại</span></div><Link href="/operations?tab=uavs" className="text-xs font-semibold text-primary hover:underline">Xem tất cả</Link></div><div className="overflow-x-auto"><table className="console-table"><thead><tr><th>Tài sản</th><th>Trạng thái</th><th>Trạm</th><th>Nhà sản xuất</th><th>Thao tác</th></tr></thead><tbody>{uavsQuery.isPending ? <tr><td colSpan={5}>Đang tải đội UAV…</td></tr> : !uavsQuery.data?.length ? <tr><td colSpan={5}>Chưa có UAV.</td></tr> : uavsQuery.data.slice(0, 6).map(uav => <tr key={uav.id}><td><div className="table-primary">{uav.model}</div><div className="table-secondary">{uav.serialNumber}</div></td><td><StatusBadge status={uav.status} /></td><td>{uav.stationName || 'Chưa gán'}</td><td>{uav.manufacturer}</td><td><Link href="/operations?tab=uavs" className="text-xs font-semibold text-primary hover:underline">Chi tiết</Link></td></tr>)}</tbody></table></div></div>
      </div>
      <div className="console-panel flex min-h-[260px] items-center justify-center p-6"><div className="max-w-sm text-center"><PlaneTakeoff size={28} className="mx-auto mb-3 text-primary" /><h2 className="text-base font-semibold text-slate-800">Đội UAV</h2><p className="mt-1 text-sm text-slate-500">Mở một dòng trong bảng Đội UAV để xem chi tiết và mô hình minh họa 3D.</p><Link href="/operations?tab=uavs" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Mở bảng đội UAV <ArrowUpRight size={14} className="ml-1" /></Link></div></div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <div className="console-panel"><div className="console-panel-header"><div><h2>Hoạt động trạm</h2><span>Danh sách trạm hiện tại</span></div><Link href="/operations?tab=stations" className="text-xs font-semibold text-primary hover:underline">Quản lý trạm</Link></div><div className="overflow-x-auto"><table className="console-table"><thead><tr><th>Trạm</th><th>Trạng thái</th><th>Địa chỉ</th><th>Tọa độ</th></tr></thead><tbody>{stationsQuery.isPending ? <tr><td colSpan={4}>Đang tải trạm…</td></tr> : !stationsQuery.data?.length ? <tr><td colSpan={4}>Chưa có trạm.</td></tr> : stationsQuery.data.slice(0, 6).map(station => <tr key={station.id}><td className="table-primary">{station.code}<span className="table-secondary">{station.name}</span></td><td><StatusBadge status={station.status} /></td><td>{station.address || '—'}</td><td>{station.latitude && station.longitude ? String(station.latitude) + ', ' + String(station.longitude) : '—'}</td></tr>)}</tbody></table></div></div>
      <div className="console-panel"><div className="console-panel-header"><div><h2>Thao tác nhanh</h2><span>Truy cập nhanh</span></div></div><div className="grid grid-cols-2 gap-2 p-3">{quickActions.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="group flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 p-3 transition hover:border-primary/40 hover:bg-blue-50"><span className="text-slate-400 group-hover:text-primary"><Icon size={17} /></span><span className="text-xs font-semibold text-slate-700">{label}</span></Link>)}</div></div>
    </section>
  </div></AppShell>;
}

function MissionMetric({ label, value, icon, tone = 'slate' }: { label: string; value?: number; icon: React.ReactNode; tone?: 'slate' | 'blue' | 'green' | 'red' }) {
  const colors = { slate: 'text-slate-500', blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-rose-600' };
  return <div className="bg-white p-4"><div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${colors[tone]}`}>{icon}{label}</div><strong className="text-2xl tracking-tight text-slate-900">{value ?? '—'}</strong></div>;
}
