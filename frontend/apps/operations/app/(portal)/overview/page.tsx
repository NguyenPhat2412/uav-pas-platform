'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Boxes, FileKey2, MapPinned, PlaneTakeoff, ShieldCheck, Users, ArrowUpRight, RadioTower, Settings2, Crosshair } from 'lucide-react';
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
  { icon: Settings2, label: 'Trạm', href: '/stations' },
  { icon: Activity, label: 'Điều phối nhiệm vụ', href: '/dispatch/missions' },
  { icon: PlaneTakeoff, label: 'Đội UAV', href: '/uavs' },
  { icon: FileKey2, label: 'Tệp kết quả', href: '/media' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, permissionsReady, can } = useAuth();
  const canReadSummary = can('DASHBOARD_READ');
  const canReadMissions = can('DASHBOARD_MISSION');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [missions, setMissions] = useState<MissionDashboard | null>(null);
  const uavsQuery = useCollection('uavs');
  const stationsQuery = useCollection('stations');
  const [error, setError] = useState(false);
  const [selectedUavId, setSelectedUavId] = useState<number>(1);
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isAuthenticated, isLoading, router]);
  useEffect(() => {
    if (!isAuthenticated || !permissionsReady) return;
    let active = true;
    Promise.allSettled([
      canReadSummary ? dashboardService.getSummary() : Promise.resolve(null),
      canReadMissions ? missionService.dashboard() : Promise.resolve(null),
    ]).then(([resources, mission]) => {
      if (!active) return;
      setSummary(resources.status === 'fulfilled' ? resources.value : null);
      setMissions(mission.status === 'fulfilled' ? mission.value : null);
      setError(resources.status === 'rejected' || mission.status === 'rejected');
    });
    return () => { active = false; };
  }, [isAuthenticated, permissionsReady, canReadSummary, canReadMissions]);
  if (isLoading || !isAuthenticated || !user) return <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb]"><Spinner size="lg" label="Đang xác thực" /></div>;

  const uavList = (uavsQuery.data ?? []).slice(0, 6);
  const activeUav = uavList.find(u => u.id === selectedUavId) ?? uavList[0];

  return <AppShell activeResource="overview"><div className="w-full">
    <PageHeader title="Tổng quan vận hành" action={{ label: 'Mở điều phối', href: '/dispatch/missions' }} />
    {(error || uavsQuery.isError || stationsQuery.isError) && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được toàn bộ số liệu. Các module còn lại vẫn khả dụng.</div>}
    {canReadSummary && <section className="inline-summary mb-5" aria-label="Tóm tắt toàn bộ dữ liệu được cấp quyền"><span><Users size={15} /> Người dùng <strong>{summary?.totalUsers ?? '—'}</strong></span><span><MapPinned size={15} /> Trạm <strong>{summary?.totalStations ?? '—'}</strong></span><span><PlaneTakeoff size={15} /> UAV sẵn sàng <strong>{summary?.availableUavs ?? '—'}</strong></span><span><Boxes size={15} /> Thiết bị <strong>{summary?.totalEquipmentUnits ?? '—'}</strong></span><span><Activity size={15} /> Sự kiện nhật ký <strong>{summary?.totalAuditEvents ?? '—'}</strong></span></section>}
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(370px,.75fr)]">
      <div className="min-w-0 space-y-5">
        {canReadMissions && <div className="console-panel">
          <div className="console-panel-header"><div><h2>Tổng quan nhiệm vụ</h2><span>Trạng thái quy trình hiện tại</span></div><Link href="/dispatch/missions" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Mở danh sách <ArrowUpRight size={14} /></Link></div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            <MissionMetric label="Tổng nhiệm vụ" value={missions?.totalMissions} icon={<Activity size={15} />} />
            <MissionMetric label="Đang xử lý" value={missions?.inProgressMissions} icon={<RadioTower size={15} />} tone="blue" />
            <MissionMetric label="Hoàn tất" value={missions?.completedMissions} icon={<ShieldCheck size={15} />} tone="green" />
            <MissionMetric label="Thất bại" value={missions?.failedMissions} icon={<Activity size={15} />} tone="red" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs"><span className="text-slate-500">Đang chờ xác nhận: <strong className="text-slate-800">{missions?.pendingMissions ?? '—'}</strong></span><span className="text-slate-500">Sẵn sàng: <strong className="text-slate-800">{missions?.readyMissions ?? '—'}</strong></span><Link href="/dispatch/missions" className="font-semibold text-primary hover:underline">Mở điều phối</Link></div>
        </div>}
        <div className="console-panel"><div className="console-panel-header"><div><h2>Trạng thái đội UAV</h2><span>Chọn một tàu bay để giám sát HUD 3D</span></div><Link href="/uavs" className="text-xs font-semibold text-primary hover:underline">Xem tất cả</Link></div><div className="overflow-x-auto"><table className="console-table"><thead><tr><th>Tài sản</th><th>Trạng thái</th><th>Trạm</th><th>Nhà sản xuất</th><th>Thao tác</th></tr></thead><tbody>{!uavList.length && <tr><td colSpan={5}>Chưa có UAV hoặc chưa được cấp quyền xem.</td></tr>}{uavList.map(uav => <tr key={uav.id} onClick={() => setSelectedUavId(uav.id)} className={`cursor-pointer transition ${activeUav?.id === uav.id ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}><td><div className="table-primary">{uav.model}</div><div className="table-secondary">{uav.serialNumber}</div></td><td><StatusBadge status={uav.status} /></td><td>{uav.stationName || 'Chưa gán'}</td><td>{uav.manufacturer}</td><td><Link href="/uavs" className="text-xs font-semibold text-primary hover:underline">Chi tiết</Link></td></tr>)}</tbody></table></div></div>
      </div>
      <div className="console-panel flex flex-col justify-between p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Crosshair size={16} className="text-[#ab2523]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{activeUav?.model ?? 'Chưa chọn UAV'}</h3>
              <span className="font-mono text-[11px] text-slate-500">{activeUav?.serialNumber ?? '—'} · {activeUav?.stationName || 'Chưa gán trạm'}</span>
            </div>
          </div>
          <StatusBadge status={activeUav?.status ?? 'UNKNOWN'} />
        </div>
        <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-lg border border-[#333842] bg-[#181a1e]">
          <div className="pointer-events-none absolute flex h-[240px] w-[240px] items-center justify-center rounded-full border border-[#ab2523]/30">
            <div className="h-[165px] w-[165px] rounded-full border border-dashed border-[#ab2523]/25" />
          </div>
          <div className="z-10 p-4 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ab2523]/40 bg-[#ab2523]/20 shadow-lg shadow-[#ab2523]/30">
              <PlaneTakeoff size={34} className="text-white" />
            </div>
            <span className="block text-xs font-extrabold tracking-wider text-white">KHUNG GIÁM SÁT UAV</span>
            <span className="mt-0.5 block font-mono text-[11px] text-slate-400">Chưa có kết nối telemetry trực tiếp</span>
          </div>
          <span className="absolute left-2.5 top-2 font-mono text-[10px] font-bold text-[#ab2523]">┌ HUD-01</span>
          <span className="absolute right-2.5 top-2 font-mono text-[10px] font-bold text-[#ab2523]">┐ D-RTK</span>
          <span className="absolute bottom-2 left-2.5 font-mono text-[10px] font-bold text-[#ab2523]">└ 5.8G</span>
          <span className="absolute bottom-2 right-2.5 font-mono text-[10px] font-bold text-[#ab2523]">┘ 360°</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-semibold">
          <span className="text-slate-500">Pin: <strong className="text-emerald-600">—</strong></span>
          <span className="text-slate-500">Độ cao: <strong className="text-slate-900">—</strong></span>
          <span className="text-slate-500">RTK: <strong className="text-emerald-600">—</strong></span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <Link href="/sar-cockpit" className="font-semibold text-[#ab2523] hover:underline">Mở buồng lái AI & SAR ↗</Link>
          <Link href="/uavs" className="inline-flex items-center font-semibold text-slate-600 hover:text-slate-900">Mở bảng đội UAV <ArrowUpRight size={13} className="ml-0.5" /></Link>
        </div>
      </div>
    </section>
    <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <div className="console-panel"><div className="console-panel-header"><div><h2>Hoạt động trạm</h2><span>Danh sách trạm hiện tại</span></div><Link href="/stations" className="text-xs font-semibold text-primary hover:underline">Quản lý trạm</Link></div><div className="overflow-x-auto"><table className="console-table"><thead><tr><th>Trạm</th><th>Trạng thái</th><th>Địa chỉ</th><th>Tọa độ</th></tr></thead><tbody>{(stationsQuery.data ?? []).slice(0, 6).map(station => <tr key={station.id}><td className="table-primary">{station.code}<span className="table-secondary">{station.name}</span></td><td><StatusBadge status={station.status} /></td><td>{station.address || '—'}</td><td>{station.latitude != null && station.longitude != null ? String(station.latitude) + ', ' + String(station.longitude) : '—'}</td></tr>)}</tbody></table></div></div>
      <div className="console-panel"><div className="console-panel-header"><div><h2>Thao tác nhanh</h2><span>Truy cập nhanh</span></div></div><div className="grid grid-cols-2 gap-2 p-3">{quickActions.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="group flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 p-3 transition hover:border-primary/40 hover:bg-primary/5"><span className="text-slate-400 group-hover:text-primary"><Icon size={17} /></span><span className="text-xs font-semibold text-slate-700">{label}</span></Link>)}</div></div>
    </section>
  </div></AppShell>;
}

function MissionMetric({ label, value, icon, tone = 'slate' }: { label: string; value?: number; icon: React.ReactNode; tone?: 'slate' | 'blue' | 'green' | 'red' }) {
  const colors = { slate: 'text-slate-500', blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-rose-600' };
  return <div className="bg-white p-4"><div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${colors[tone]}`}>{icon}{label}</div><strong className="text-2xl tracking-tight text-slate-900">{value ?? '—'}</strong></div>;
}
