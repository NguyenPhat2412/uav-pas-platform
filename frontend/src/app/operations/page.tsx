'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { Activity, Boxes, FileKey2, MapPinned, PlaneTakeoff, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { StationPanel } from '@/features/operations/components/StationPanel';
import { UavPanel } from '@/features/operations/components/UavPanel';
import { EquipmentPanel } from '@/features/operations/components/EquipmentPanel';
import { MediaPanel } from '@/features/operations/components/MediaPanel';
import { AuditPanel } from '@/features/operations/components/AuditPanel';

const tabs = [
  { id: 'stations', label: 'Trạm UAV', permission: 'STATION_READ', icon: MapPinned, panel: StationPanel, metric: 'Infrastructure' },
  { id: 'uavs', label: 'Đội UAV', permission: 'UAV_READ', icon: PlaneTakeoff, panel: UavPanel, metric: 'Fleet' },
  { id: 'equipment', label: 'Kho thiết bị', permission: 'INVENTORY_READ', icon: Boxes, panel: EquipmentPanel, metric: 'Inventory' },
  { id: 'media', label: 'Tệp', permission: 'MEDIA_READ', icon: FileKey2, panel: MediaPanel, metric: 'Thư viện' },
  { id: 'audit', label: 'Nhật ký', permission: 'AUDIT_READ', icon: Activity, panel: AuditPanel, metric: 'Hoạt động' },
] as const;

export default function OperationsPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner label="Đang tải workspace" /></div>}><OperationsWorkspace /></Suspense>;
}

function OperationsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, can, permissionsReady, permissionError, refreshPermissions } = useAuth();
  const tab = searchParams.get('tab') || 'stations';
  useEffect(() => { if (!isLoading && !isAuthenticated) router.replace('/login'); }, [isAuthenticated, isLoading, router]);
  const selected = useMemo(() => tabs.find(item => item.id === tab) || tabs[0], [tab]);
  const Panel = selected.panel;
  const selectTab = (id: string) => { router.replace(`/operations?tab=${id}`, { scroll: false }); };
  if (isLoading || !isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-[#f3f6fb]"><Spinner label="Đang xác thực" /></div>;
  return <AppShell activeResource={tab}><div className="w-full">
    <PageHeader title="Vận hành tài nguyên" />
    <div className="grid gap-5 xl:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="console-panel h-fit p-2"><div className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Nhóm tài nguyên</div><nav aria-label="Nhóm tài nguyên" className="space-y-1">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => selectTab(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs font-semibold transition ${tab === item.id ? 'bg-[#0d1b2e] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={16} /> <span className="flex-1">{item.label}</span>{tab === item.id && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />}</button>; })}</nav></aside>
      <section className="console-panel min-w-0"><div className="console-panel-header"><div><h2>{selected.label}</h2><span>{selected.metric === 'Fleet' ? 'Đội UAV' : selected.metric === 'Infrastructure' ? 'Hạ tầng' : selected.metric === 'Inventory' ? 'Kho thiết bị' : selected.metric === 'Thư viện' ? 'Thư viện' : 'Hoạt động'}</span></div><div className="flex items-center gap-2"><Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={() => window.location.reload()}>Làm mới</Button></div></div><div className="p-4 sm:p-5">{permissionError ? <div className="space-y-3"><p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Không thể kiểm tra quyền truy cập.</p><Button size="sm" onClick={() => void refreshPermissions()}>Thử lại</Button></div> : !permissionsReady ? <div className="flex min-h-40 items-center justify-center"><Spinner label="Đang kiểm tra quyền" /></div> : !can(selected.permission) ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Bạn không có quyền xem {selected.label}. Liên hệ người quản lý truy cập.</div> : <Panel key={`${selected.id}`} />}</div></section>
    </div>
  </div></AppShell>;
}
