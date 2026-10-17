'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, StatusBadge } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationMutation, useStations, useUav, useUavHistory } from '../hooks/useOperations';
import { useCollection } from '../hooks/useCollections';
import { operationsService } from '../services/operations.service';
import { DataTable, options } from '@/components/data/DataTable';
import { Drawer, Metadata, Tabs } from '@/components/data/Drawer';
import { ErrorNotice, QueryState } from '@/components/data/WorkspaceState';
import { UavModelViewer } from '@/components/visuals/UavModelViewer';
import type { Uav } from '../types/operations.types';

export function UavPanel() {
  const { can } = useAuth();
  const query = useCollection('uavs');
  const stations = useStations(0, 100);
  const [selected, setSelected] = useState<number>();
  const detail = useUav(selected);
  const history = useUavHistory(selected, 0);
  const [tab, setTab] = useState('overview');
  const [show3d, setShow3d] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ model: '', serialNumber: '', manufacturer: '' });
  const create = useOperationMutation(operationsService.createUav, ['uavs', 'dashboard', 'audit']);
  const maintenance = useOperationMutation(operationsService.maintenanceUav, ['uavs', 'dashboard', 'audit']);
  const assign = useOperationMutation(({ id, stationId }: { id: number; stationId: number }) => operationsService.assignUav(id, stationId), ['uavs', 'audit']);
  const rows = query.data || [];
  const columns = [
    { accessorKey: 'model', header: 'Mẫu UAV', cell: ({ row }: { row: { original: Uav } }) => <div><span className="table-primary">{row.original.model}</span><span className="table-secondary">{row.original.serialNumber}</span></div> },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }: { row: { original: Uav } }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'stationName', header: 'Trạm', cell: ({ row }: { row: { original: Uav } }) => row.original.stationName || 'Chưa gán' },
    { id: 'actions', header: 'Thao tác', enableSorting: false, enableHiding: false, cell: ({ row }: { row: { original: Uav } }) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setSelected(row.original.id); setTab('overview'); setShow3d(false); }}>Mở chi tiết</Button>{can('UAV_MANAGE') && <Button size="sm" variant="outline" disabled={maintenance.isPending || row.original.status === 'MAINTENANCE'} onClick={() => void maintenance.mutateAsync(row.original.id)}>Bảo trì</Button>}</div> },
  ];
  return <div className="space-y-5">
    {can('UAV_MANAGE') && <div className="flex justify-end"><Button size="sm" leftIcon={<Plus size={15} />} onClick={() => setOpenCreate(value => !value)}>{openCreate ? 'Đóng form' : 'Thêm UAV'}</Button></div>}
    {openCreate && <form className="schema-form rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={async event => { event.preventDefault(); try { await create.mutateAsync(form); setForm({ model: '', serialNumber: '', manufacturer: '' }); setOpenCreate(false); await query.refetch(); } catch { /* visible below */ } }}><div className="form-grid"><div className="form-field"><label htmlFor="uav-model">Mẫu UAV</label><Input id="uav-model" required maxLength={100} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div><div className="form-field"><label htmlFor="uav-serial">Số serial</label><Input id="uav-serial" required maxLength={100} value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} /></div><div className="form-field"><label htmlFor="uav-maker">Nhà sản xuất</label><Input id="uav-maker" required maxLength={120} value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div></div><div className="form-actions"><Button size="sm" type="submit" isLoading={create.isPending}>Tạo UAV</Button></div><ErrorNotice error={create.error} /></form>}
    <ErrorNotice error={maintenance.error || assign.error} />
    <QueryState query={query}><DataTable label="Bảng đội UAV" data={rows} columns={columns} filters={[{ column: 'status', label: 'Trạng thái', options: options(rows.map(row => row.status)) }, { column: 'stationName', label: 'Trạm', options: options(rows.map(row => row.stationName)) }]} /></QueryState>
    {selected && <Drawer title="Chi tiết UAV" onClose={() => setSelected(undefined)} wide><QueryState query={detail}>{detail.data && <><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.8fr)]"><div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-800">Kiểm tra trực quan</h3><Button size="sm" variant="outline" onClick={() => setShow3d(value => !value)}>{show3d ? 'Đóng mô hình 3D' : 'Xem mô hình 3D'}</Button></div>{show3d ? <UavModelViewer serial={detail.data.serialNumber} status={detail.data.status} /> : <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Mô hình minh họa chỉ tải khi bạn chủ động mở.</div>}</div><Metadata items={[['Mẫu UAV', detail.data.model], ['Số serial', detail.data.serialNumber], ['Nhà sản xuất', detail.data.manufacturer], ['Trạng thái', <StatusBadge key="detail-status" status={detail.data.status} />], ['Trạm', detail.data.stationName || 'Chưa gán']]} /></div><Tabs items={[{ id: 'overview', label: 'Tổng quan' }, { id: 'maintenance', label: 'Bảo trì' }, { id: 'assignment', label: 'Điều phối' }, { id: 'activity', label: 'Hoạt động' }, { id: 'media', label: 'Tệp' }]} value={tab} onChange={setTab} />{tab === 'overview' && <p className="text-sm text-slate-600">Mô hình minh họa chỉ hỗ trợ quan sát; thuộc tính quản trị lấy từ UAV API.</p>}{tab === 'maintenance' && <p className="text-sm text-slate-600">{can('UAV_MANAGE') ? 'Dùng thao tác Bảo trì để chuyển trạng thái UAV.' : 'Bạn không có quyền cập nhật trạng thái.'}</p>}{tab === 'assignment' && can('UAV_MANAGE') && <div className="flex flex-wrap items-center gap-3"><label className="text-sm font-semibold" htmlFor="uav-station">Gán trạm</label><select id="uav-station" className="h-9 rounded-md border border-slate-300 px-2 text-sm" disabled={assign.isPending || stations.isPending} defaultValue={detail.data.stationId || ''} onChange={event => { if (event.target.value) void assign.mutateAsync({ id: detail.data!.id, stationId: Number(event.target.value) }); }}><option value="">Chọn trạm</option>{stations.data?.content.map(station => <option key={station.id} value={station.id}>{station.code}</option>)}</select></div>}{tab === 'media' && <p className="text-sm text-slate-600">Tệp của UAV được quản lý trong khu vực Tệp.</p>}{tab === 'activity' && <QueryState query={history}><div className="space-y-3">{history.data?.content.map(item => <div key={item.id} className="border-b border-slate-100 pb-3 text-sm\"><strong>{(item.fromStatus || 'Mới') + ' → ' + item.toStatus}</strong><p className="text-xs text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'} · {item.changedBy || '—'}{item.reason ? ' · ' + item.reason : ''}</p></div>)}</div></QueryState>}</>}</QueryState></Drawer>}
  </div>;
}
