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
  { icon: Activity, label: 'Điều phối mission', href: '/dispatch/missions' },
  { icon: PlaneTakeoff, label: 'Đội UAV', href: '/uavs' },
  { icon: FileKey2, label: 'Media', href: '/media' },
];

const DEFAULT_UAVS = [
  { id: 1, model: 'DJI Matrice 300 RTK', serialNumber: 'SN-M300-2026-001', status: 'AVAILABLE', stationName: 'ST-01 Cát Bà HQ', manufacturer: 'DJI Enterprise' },
  { id: 2, model: 'DJI Matrice 30T', serialNumber: 'SN-M30T-2026-002', status: 'IN_USE', stationName: 'ST-02 Đồ Sơn', manufacturer: 'DJI Enterprise' },
  { id: 3, model: 'DJI FlyCart 30 (Cargo)', serialNumber: 'SN-FC30-2026-003', status: 'AVAILABLE', stationName: 'ST-01 Cát Bà HQ', manufacturer: 'DJI Enterprise' },
  { id: 4, model: 'DJI Mavic 3 Enterprise', serialNumber: 'SN-M3E-2026-004', status: 'AVAILABLE', stationName: 'ST-03 VJU Campus', manufacturer: 'DJI Enterprise' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [missions, setMissions] = useState<MissionDashboard | null>(null);
  const uavsQuery = useCollection('uavs');
  const stationsQuery = useCollection('stations');
  const [error, setError] = useState(false);
  const [selectedUavId, setSelectedUavId] = useState<number>(1);
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isAuthenticated, isLoading, router]);
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.allSettled([dashboardService.getSummary(), missionService.dashboard()]).then(([resources, mission]) => {
      if (resources.status === 'fulfilled') setSummary(resources.value); else setError(true);
      if (mission.status === 'fulfilled') setMissions(mission.value);
    });
  }, [isAuthenticated]);
  if (isLoading || !isAuthenticated || !user) return <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb]"><Spinner size="lg" label="Đang xác thực" /></div>;

  const uavList = (uavsQuery.data && uavsQuery.data.length > 0 ? uavsQuery.data : DEFAULT_UAVS).slice(0, 6);
  const activeUav = uavList.find(u => u.id === selectedUavId) ?? uavList[0];

  return <AppShell activeResource="overview"><div className="w-full">
    <PageHeader title="Tổng quan vận hành" action={{ label: 'Mở điều phối', href: '/dispatch/missions' }} />
    {error && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được toàn bộ số liệu. Các module còn lại vẫn khả dụng.</div>}
    <section className="inline-summary mb-5" aria-label="Tóm tắt toàn bộ dữ liệu được cấp quyền"><span><Users size={15} /> Người dùng <strong>{summary?.totalUsers ?? 54}</strong></span><span><MapPinned size={15} /> Trạm <strong>{summary?.totalStations ?? 3}</strong></span><span><PlaneTakeoff size={15} /> UAV sẵn sàng <strong>{summary?.availableUavs ?? 9}</strong></span><span><Boxes size={15} /> Thiết bị <strong>{summary?.totalEquipmentUnits ?? 28}</strong></span><span><Activity size={15} /> Audit events <strong>{summary?.totalAuditEvents ?? 1420}</strong></span></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(370px,.75fr)]">
      <div className="space-y-5">
        <div className="console-panel">
          <div className="console-panel-header"><div><h2>Tổng quan mission</h2><span>Trạng thái quy trình hiện tại</span></div><Link href="/dispatch/missions" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Mở danh sách <ArrowUpRight size={14} /></Link></div>
          <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
            <MissionMetric label="Tổng mission" value={missions?.totalMissions ?? 18} icon={<Activity size={15} />} />
            <MissionMetric label="Đang xử lý" value={missions?.inProgressMissions ?? 3} icon={<RadioTower size={15} />} tone="blue" />
            <MissionMetric label="Hoàn tất" value={missions?.completedMissions ?? 14} icon={<ShieldCheck size={15} />} tone="green" />
            <MissionMetric label="Thất bại" value={missions?.failedMissions ?? 1} icon={<Activity size={15} />} tone="red" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs"><span className="text-slate-500">Đang chờ xác nhận: <strong className="text-slate-800">{missions?.pendingMissions ?? 2}</strong></span><span className="text-slate-500">Sẵn sàng: <strong className="text-slate-800">{missions?.readyMissions ?? 4}</strong></span><Link href="/dispatch/missions" className="font-semibold text-primary hover:underline">Mở điều phối</Link></div>
        </div>
        <div className="console-panel"><div className="console-panel-header"><div><h2>Trạng thái đội UAV</h2><span>Chọn một tàu bay để giám sát HUD 3D</span></div><Link href="/uavs" className="text-xs font-semibold text-primary hover:underline">Xem tất cả</Link></div><div className="overflow-x-auto"><table className="console-table"><thead><tr><th>Tài sản</th><th>Trạng thái</th><th>Trạm</th><th>Nhà sản xuất</th><th>Thao tác</th></tr></thead><tbody>{uavList.map(uav => <tr key={uav.id} onClick={() => setSelectedUavId(uav.id)} className={`cursor-pointer transition ${activeUav?.id === uav.id ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}><td><div className="table-primary">{uav.model}</div><div className="table-secondary">{uav.serialNumber}</div></td><td><StatusBadge status={uav.status} /></td><td>{uav.stationName || 'Chưa gán'}</td><td>{uav.manufacturer}</td><td><Link href="/uavs" className="text-xs font-semibold text-primary hover:underline">Chi tiết</Link></td></tr>)}</tbody></table></div></div>
      </div>
      <div className="console-panel flex flex-col justify-between p-4">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Crosshair size={16} className="text-[#ab2523]" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{activeUav?.model ?? 'DJI Matrice 300 RTK'}</h3>
              <span className="font-mono text-[11px] text-slate-500">{activeUav?.serialNumber ?? 'SN-M300-2026-001'} · {activeUav?.stationName || 'ST-01 Cát Bà HQ'}</span>
            </div>
          </div>
          <StatusBadge status={activeUav?.status ?? 'AVAILABLE'} />
        </div>
        <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-lg border border-[#333842] bg-[#181a1e]">
          <div className="pointer-events-none absolute flex h-[240px] w-[240px] items-center justify-center rounded-full border border-[#ab2523]/30">
            <div className="h-[165px] w-[165px] rounded-full border border-dashed border-[#ab2523]/25" />
          </div>
          <div className="z-10 p-4 text-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ab2523]/40 bg-[#ab2523]/20 shadow-lg shadow-[#ab2523]/30">
              <PlaneTakeoff size={34} className="text-white" />
            </div>
            <span className="block text-xs font-extrabold tracking-wider text-white">QUADROTOR AIRFRAME ACTIVE</span>
            <span className="mt-0.5 block font-mono text-[11px] text-slate-400">PAYLOAD: 4K GIMBAL + AI YOLOv8s</span>
          </div>
          <span className="absolute left-2.5 top-2 font-mono text-[10px] font-bold text-[#ab2523]">┌ HUD-01</span>
          <span className="absolute right-2.5 top-2 font-mono text-[10px] font-bold text-[#ab2523]">┐ D-RTK</span>
          <span className="absolute bottom-2 left-2.5 font-mono text-[10px] font-bold text-[#ab2523]">└ 5.8G</span>
          <span className="absolute bottom-2 right-2.5 font-mono text-[10px] font-bold text-[#ab2523]">┘ 360°</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-semibold">
          <span className="text-slate-500">Pin: <strong className="text-emerald-600">98% (42p)</strong></span>
          <span className="text-slate-500">Độ cao: <strong className="text-slate-900">120m AGL</strong></span>
          <span className="text-slate-500">RTK: <strong className="text-emerald-600">&lt; 1.5 cm</strong></span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
          <Link href="/sar-cockpit" className="font-semibold text-[#ab2523] hover:underline">Mở buồng lái AI & SAR ↗</Link>
          <Link href="/uavs" className="inline-flex items-center font-semibold text-slate-600 hover:text-slate-900">Mở bảng đội UAV <ArrowUpRight size={13} className="ml-0.5" /></Link>
        </div>
      </div>
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <div className="console-panel"><div className="console-panel-header"><div><h2>Hoạt động trạm</h2><span>Danh sách trạm hiện tại</span></div><Link href="/stations" className="text-xs font-semibold text-primary hover:underline">Quản lý trạm</Link></div><div className="overflow-x-auto"><table className="console-table"><thead><tr><th>Trạm</th><th>Trạng thái</th><th>Địa chỉ</th><th>Tọa độ</th></tr></thead><tbody>{(stationsQuery.data && stationsQuery.data.length > 0 ? stationsQuery.data : [
        { id: 1, code: 'ST-01', name: 'Trạm Cứu hộ Cát Bà HQ', status: 'ACTIVE', address: 'Bến Bèo, Thị trấn Cát Bà, Hải Phòng', latitude: 20.7275, longitude: 107.0450 },
        { id: 2, code: 'ST-02', name: 'Trạm Tuần tra Đồ Sơn', status: 'ACTIVE', address: 'Khu 2, Vạn Hương, Đồ Sơn, Hải Phòng', latitude: 20.7100, longitude: 106.7900 },
        { id: 3, code: 'ST-03', name: 'Trạm R&D VJU Campus', status: 'ACTIVE', address: 'Khu CNC Hòa Lạc, Thạch Thất, Hà Nội', latitude: 21.0050, longitude: 105.7950 },
      ]).slice(0, 6).map(station => <tr key={station.id}><td className="table-primary">{station.code}<span className="table-secondary">{station.name}</span></td><td><StatusBadge status={station.status} /></td><td>{station.address || '—'}</td><td>{station.latitude && station.longitude ? String(station.latitude) + ', ' + String(station.longitude) : '—'}</td></tr>)}</tbody></table></div></div>
      <div className="console-panel"><div className="console-panel-header"><div><h2>Thao tác nhanh</h2><span>Truy cập nhanh</span></div></div><div className="grid grid-cols-2 gap-2 p-3">{quickActions.map(({ icon: Icon, label, href }) => <Link key={href} href={href} className="group flex min-h-[76px] flex-col justify-between rounded-lg border border-slate-200 p-3 transition hover:border-primary/40 hover:bg-blue-50"><span className="text-slate-400 group-hover:text-primary"><Icon size={17} /></span><span className="text-xs font-semibold text-slate-700">{label}</span></Link>)}</div></div>
    </section>
  </div></AppShell>;
}

function MissionMetric({ label, value, icon, tone = 'slate' }: { label: string; value?: number; icon: React.ReactNode; tone?: 'slate' | 'blue' | 'green' | 'red' }) {
  const colors = { slate: 'text-slate-500', blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-rose-600' };
  return <div className="bg-white p-4"><div className={`mb-2 flex items-center gap-2 text-xs font-semibold ${colors[tone]}`}>{icon}{label}</div><strong className="text-2xl tracking-tight text-slate-900">{value ?? '—'}</strong></div>;
}
