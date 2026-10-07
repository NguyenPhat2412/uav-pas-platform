'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, StatusBadge } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationMutation, useStation } from '../hooks/useOperations';
import { useCollection } from '../hooks/useCollections';
import { operationsService } from '../services/operations.service';
import { DataTable, options } from '@/components/data/DataTable';
import { Drawer, Metadata, Tabs } from '@/components/data/Drawer';
import { ErrorNotice, QueryState } from '@/components/data/WorkspaceState';
import { SectionHeading } from '@/components/layout/PageHeader';
import type { Station } from '../types/operations.types';

export function StationPanel() {
  const { can } = useAuth();
  const query = useCollection('stations');
  const [selected, setSelected] = useState<number>();
  const detail = useStation(selected);
  const [tab, setTab] = useState('overview');
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', address: '' });
  const create = useOperationMutation(operationsService.createStation, ['stations', 'dashboard', 'audit']);
  const rows = query.data || [];
  const columns = [
    { accessorKey: 'code', header: 'Mã trạm', cell: ({ row }: { row: { original: Station } }) => <span className="table-primary">{row.original.code}</span> },
    { accessorKey: 'name', header: 'Tên trạm' },
    { accessorKey: 'address', header: 'Địa chỉ', cell: ({ row }: { row: { original: Station } }) => row.original.address || '—' },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }: { row: { original: Station } }) => <StatusBadge status={row.original.status} /> },
    { id: 'actions', header: 'Thao tác', enableSorting: false, enableHiding: false, cell: ({ row }: { row: { original: Station } }) => <Button size="sm" variant="outline" onClick={() => { setSelected(row.original.id); setTab('overview'); }}>Mở chi tiết</Button> },
  ];
  return <div className="space-y-5">
    {can('STATION_MANAGE') && <div className="flex justify-end"><Button size="sm" leftIcon={<Plus size={15} />} onClick={() => setOpenCreate(value => !value)}>{openCreate ? 'Đóng form' : 'Tạo trạm'}</Button></div>}
    {openCreate && <form className="schema-form rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={async event => { event.preventDefault(); try { await create.mutateAsync(form); setForm({ code: '', name: '', address: '' }); setOpenCreate(false); await query.refetch(); } catch { /* visible below */ } }}><div className="form-grid"><div className="form-field"><label htmlFor="station-code">Mã trạm</label><Input id="station-code" required maxLength={40} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div><div className="form-field"><label htmlFor="station-name">Tên trạm</label><Input id="station-name" required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div className="form-field form-field-wide"><label htmlFor="station-address">Địa chỉ</label><Input id="station-address" maxLength={255} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div></div><div className="form-actions"><Button size="sm" type="submit" isLoading={create.isPending}>Tạo trạm</Button></div><ErrorNotice error={create.error} /></form>}
    <QueryState query={query}><DataTable label="Bảng trạm UAV" data={rows} columns={columns} filters={[{ column: 'status', label: 'Trạng thái', options: options(rows.map(row => row.status)) }]} /></QueryState>
    {selected && <Drawer title="Chi tiết trạm" onClose={() => setSelected(undefined)} wide><QueryState query={detail}>{detail.data && <><SectionHeading title={detail.data.name} meta={detail.data.code + ' · ' + detail.data.status} /><Tabs items={[{ id: 'overview', label: 'Tổng quan' }, { id: 'uavs', label: 'UAV' }, { id: 'inventory', label: 'Kho' }, { id: 'activity', label: 'Hoạt động' }]} value={tab} onChange={setTab} />{tab === 'overview' && <Metadata items={[['Mã trạm', detail.data.code], ['Địa chỉ', detail.data.address || 'Chưa cập nhật'], ['Trạng thái', <StatusBadge key="detail-status" status={detail.data.status} />], ['Tọa độ', detail.data.latitude && detail.data.longitude ? String(detail.data.latitude) + ', ' + String(detail.data.longitude) : 'Chưa cập nhật']]} />}{tab === 'uavs' && <p className="text-sm text-slate-600">UAV được gán cho trạm hiển thị trong domain Đội UAV.</p>}{tab === 'inventory' && <p className="text-sm text-slate-600">Thiết bị tại trạm hiển thị trong domain Kho thiết bị.</p>}{tab === 'activity' && <p className="text-sm text-slate-600">Hoạt động của trạm hiển thị trong Nhật ký hoạt động.</p>}</>}</QueryState></Drawer>}
  </div>;
}
