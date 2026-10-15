'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { Drawer } from '@/components/data/Drawer';
import type { Uav } from '../operations/types/operations.types';
import type { MaintenanceSchedule, RepairOrder } from './types';
import { OrderFieldsForm, UavField } from './Fields';
import { ActionFeedback, useMaintenanceAction } from './Feedback';
import { businessToday, orderInput, positiveId } from './workflows';
import { maintenanceService as service } from './service';

export function OrderCreate({ schedule, uavId: initialUavId, uavs, canRead, onClose, onCreated, refresh }: { schedule?: MaintenanceSchedule; uavId: string; uavs: Uav[]; canRead: boolean; onClose: () => void; onCreated: (order: RepairOrder) => void; refresh: () => Promise<boolean> }) {
  const [uavId, setUavId] = useState(schedule ? String(schedule.uavId) : initialUavId);
  const [fields, setFields] = useState({ title: schedule?.title || '', description: '', plannedDate: schedule?.nextDueDate || businessToday(), technicianName: '' });
  const action = useMaintenanceAction(refresh);
  return <Drawer title={schedule ? 'Lập phiếu theo lịch bảo trì' : 'Lập phiếu sửa chữa'} onClose={() => { if (!action.busy) onClose(); }}><form className="schema-form space-y-4" onSubmit={event => {
    event.preventDefault();
    try { positiveId(uavId); orderInput(fields); }
    catch (error) { action.setError(error instanceof Error ? error.message : 'Thông tin chưa hợp lệ.'); return; }
    let created: RepairOrder | undefined;
    void action.run(async () => { created = await service.createOrder(positiveId(uavId), fields, schedule?.id); }, 'Đã lập phiếu sửa chữa.', () => { if (created) onCreated(created); });
  }}><ActionFeedback action={action} /><p className="text-sm text-slate-600">Mỗi UAV chỉ có một phiếu chưa đóng. Lập phiếu để lên kế hoạch chưa làm thay đổi trạng thái UAV; khi bắt đầu sửa chữa, hệ thống mới kiểm tra nhiệm vụ đang giữ UAV.</p>{schedule && <p className="rounded-lg bg-slate-100 p-3 text-sm">Gắn với lịch #{schedule.id}: <strong>{schedule.title}</strong></p>}<UavField value={uavId} onChange={setUavId} uavs={uavs} canRead={canRead} disabled={action.blocked} locked={!!schedule} /><OrderFieldsForm value={fields} onChange={setFields} disabled={action.blocked} /><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={action.busy} onClick={onClose}>Quay lại</Button><Button type="submit" disabled={action.blocked}>Tạo phiếu sửa chữa</Button></div></form></Drawer>;
}
