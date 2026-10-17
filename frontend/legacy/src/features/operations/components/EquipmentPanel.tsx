'use client';
import { useRef, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useInventoryHistory, useOperationMutation, useStations } from '../hooks/useOperations';
import { useCollection } from '../hooks/useCollections';
import { operationsService } from '../services/operations.service';
import { DataTable, options } from '@/components/data/DataTable';
import { ErrorNotice, QueryState } from '@/components/data/WorkspaceState';
import type { Equipment } from '../types/operations.types';

export function EquipmentPanel() {
  const { can } = useAuth();
  const collection = useCollection('equipment');
  const history = useInventoryHistory(0);
  const stations = useStations(0, 100);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'BATTERY', serialNumber: '', stationId: '' });
  const [movement, setMovement] = useState({ id: '', action: 'stock-in', quantity: '1', note: '', stationId: '' });
  const replay = useRef<{ payload: string; requestId: string } | null>(null);
  const [success, setSuccess] = useState('');
  const create = useOperationMutation(operationsService.createEquipment, ['equipment', 'dashboard', 'audit']);
  const move = useOperationMutation(operationsService.moveEquipment, ['equipment', 'dashboard', 'audit']);
  const rows = collection.data || [];
  const columns = [
    { accessorKey: 'name', header: 'Thiết bị', cell: ({ row }: { row: { original: Equipment } }) => <div><span className="table-primary">{row.original.name}</span><span className="table-secondary">{row.original.serialNumber || 'Không serial hóa'}</span></div> },
    { accessorKey: 'type', header: 'Loại' },
    { accessorKey: 'stationName', header: 'Trạm', cell: ({ row }: { row: { original: Equipment } }) => row.original.stationName || 'Chưa gán' },
    { accessorKey: 'quantity', header: 'Tồn', cell: ({ row }: { row: { original: Equipment } }) => <strong>{row.original.quantity}</strong> },
    { accessorKey: 'availableQuantity', header: 'Khả dụng' },
    { accessorKey: 'reservedQuantity', header: 'Giữ chỗ' },
  ];
  return <div className="space-y-5">
    {can('INVENTORY_MANAGE') && <div className="flex justify-end"><Button size="sm" onClick={() => setOpenCreate(value => !value)}>{openCreate ? 'Đóng form' : 'Tạo thiết bị'}</Button></div>}
    {openCreate && <form className="schema-form rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={async event => { event.preventDefault(); try { await create.mutateAsync({ ...form, serialNumber: form.serialNumber || undefined, stationId: Number(form.stationId) || undefined }); setForm({ name: '', type: 'BATTERY', serialNumber: '', stationId: '' }); setOpenCreate(false); await collection.refetch(); } catch { /* visible below */ } }}><div className="form-grid"><div className="form-field"><label htmlFor="equipment-name">Tên thiết bị</label><Input id="equipment-name" required maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div><div className="form-field"><label htmlFor="equipment-type">Loại</label><select id="equipment-type" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{['BATTERY', 'CAMERA', 'KV260', 'SENSOR', 'ACCESSORY'].map(type => <option key={type}>{type}</option>)}</select></div><div className="form-field"><label htmlFor="equipment-serial">Serial</label><Input id="equipment-serial" maxLength={100} value={form.serialNumber} onChange={event => setForm({ ...form, serialNumber: event.target.value })} /></div></div><div className="form-actions"><Button size="sm" type="submit" isLoading={create.isPending}>Tạo thiết bị</Button></div><ErrorNotice error={create.error} /></form>}
    {can('INVENTORY_MANAGE') && <form className="rounded-lg border border-slate-200 bg-slate-50 p-4" onSubmit={async event => { event.preventDefault(); setSuccess(''); const payload = JSON.stringify(movement); if (replay.current?.payload !== payload) replay.current = { payload, requestId: crypto.randomUUID() }; try { await move.mutateAsync({ id: Number(movement.id), action: movement.action, quantity: Number(movement.quantity), note: movement.note || undefined, stationId: Number(movement.stationId) || undefined, requestId: replay.current.requestId }); replay.current = null; setSuccess('Đã ghi nhận biến động kho.'); await collection.refetch(); } catch { /* same request id is retained for safe retry */ } }}><h3 className="mb-3 text-sm font-semibold text-slate-800">Biến động số lượng</h3><div className="form-grid"><div className="form-field"><label htmlFor="movement-equipment">Thiết bị</label><select id="movement-equipment" required value={movement.id} onChange={event => setMovement({ ...movement, id: event.target.value })}><option value="">Chọn thiết bị</option>{rows.map(item => <option key={item.id} value={item.id}>{item.name} · #{item.id}</option>)}</select></div><div className="form-field"><label htmlFor="movement-action">Thao tác</label><select id="movement-action" value={movement.action} onChange={event => setMovement({ ...movement, action: event.target.value })}>{[['stock-in', 'Nhập kho'], ['stock-out', 'Xuất kho'], ['reserve', 'Giữ chỗ'], ['release', 'Giải phóng'], ['transfer', 'Điều chuyển']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="form-field"><label htmlFor="movement-quantity">Số lượng</label><Input id="movement-quantity" required type="number" min={1} step={1} value={movement.quantity} onChange={event => setMovement({ ...movement, quantity: event.target.value })} /></div><div className="form-field"><label htmlFor="movement-note">Ghi chú</label><Input id="movement-note" maxLength={255} value={movement.note} onChange={event => setMovement({ ...movement, note: event.target.value })} /></div></div>{movement.action === 'transfer' && <div className="form-field mt-3 max-w-sm\"><label htmlFor="movement-station">Trạm đích</label><select id="movement-station" required value={movement.stationId} onChange={event => setMovement({ ...movement, stationId: event.target.value })}><option value="">Chọn trạm đích</option>{stations.data?.content.map(station => <option key={station.id} value={station.id}>{station.code}</option>)}</select></div>}<div className="mt-4 flex items-center gap-3\"><Button size="sm" type="submit" isLoading={move.isPending}>Ghi nhận</Button>{success && <span role="status" className="text-sm text-emerald-700">{success}</span>}</div><ErrorNotice error={move.error} /></form>}
    <QueryState query={collection}><DataTable label="Bảng kho thiết bị" data={rows} columns={columns} filters={[{ column: 'type', label: 'Loại', options: options(rows.map(row => row.type)) }, { column: 'stationName', label: 'Trạm', options: options(rows.map(row => row.stationName)) }]} /></QueryState>
    <QueryState query={history}><h3 className="text-base font-semibold text-slate-800">Lịch sử kho</h3><div className="overflow-auto rounded-lg border border-slate-200"><table className="console-table\"><thead><tr><th>Thiết bị</th><th>Thao tác</th><th>Số lượng</th><th>Trạm</th><th>Người xử lý</th></tr></thead><tbody>{(history.data?.content || []).map(item => <tr key={item.id}><td className="table-primary">{item.equipmentName}</td><td>{item.type}</td><td>{item.quantity}</td><td>{String(item.fromStationId || '—') + ' → ' + String(item.toStationId || '—')}</td><td>{item.actor || '—'}</td></tr>)}</tbody></table></div></QueryState>
  </div>;
}
