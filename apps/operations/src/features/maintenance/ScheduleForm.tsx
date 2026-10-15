'use client';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { Drawer } from '@/components/data/Drawer';
import { ApiError } from '@/lib/api.client';
import type { Uav } from '../operations/types/operations.types';
import type { MaintenanceSchedule } from './types';
import { ScheduleFieldsForm, UavField } from './Fields';
import { ActionFeedback, useMaintenanceAction } from './Feedback';
import { businessToday, positiveId, scheduleInput } from './workflows';
import { maintenanceService as service } from './service';

export function ScheduleForm({ schedule, uavId: initialUavId, uavs, canRead, onClose, refresh }: { schedule?: MaintenanceSchedule; uavId: string; uavs: Uav[]; canRead: boolean; onClose: () => void; refresh: () => Promise<boolean> }) {
  const [uavId, setUavId] = useState(schedule ? String(schedule.uavId) : initialUavId);
  const [fields, setFields] = useState({ title: schedule?.title || '', intervalDays: String(schedule?.intervalDays || 30), nextDueDate: schedule?.nextDueDate || businessToday() });
  const action = useMaintenanceAction(refresh);
  const [conflicted, setConflicted] = useState(false);
  return <Drawer title={schedule ? 'Chỉnh sửa lịch bảo trì' : 'Tạo lịch bảo trì định kỳ'} onClose={() => { if (!action.busy) onClose(); }}><form className="schema-form space-y-4" onSubmit={event => {
    event.preventDefault();
    try { positiveId(uavId); scheduleInput(fields); }
    catch (error) { action.setError(error instanceof Error ? error.message : 'Thông tin chưa hợp lệ.'); return; }
    if (conflicted) return;
    void action.run(async () => {
      try { return await (schedule ? service.updateSchedule(schedule, fields, schedule.active) : service.createSchedule(positiveId(uavId), fields)); }
      catch (failure) { if (failure instanceof ApiError && failure.status === 409 && failure.message === 'MAINTENANCE_VERSION_CHANGED') setConflicted(true); throw failure; }
    }, 'Đã lưu lịch bảo trì.', onClose);
  }}><ActionFeedback action={action} />{conflicted && <p className="rounded-lg bg-amber-50 p-3 text-sm">Biểu mẫu đang giữ nội dung cũ. Đóng biểu mẫu rồi mở lại lịch trong danh sách để sửa dữ liệu mới nhất.</p>}<p className="text-sm text-slate-600">Lịch giúp theo dõi ngày đến hạn. Hệ thống không tự đưa UAV vào bảo trì hoặc gửi nhắc lịch. Chu kỳ tiếp theo được tính từ ngày hoàn tất phiếu gắn với lịch, theo giờ Việt Nam.</p><UavField value={uavId} onChange={setUavId} uavs={uavs} canRead={canRead} disabled={action.blocked || conflicted} locked={!!schedule} /><ScheduleFieldsForm value={fields} onChange={setFields} disabled={action.blocked || conflicted} /><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={action.busy} onClick={onClose}>Quay lại</Button><Button type="submit" disabled={action.blocked || conflicted}>{schedule ? 'Lưu thay đổi lịch' : 'Tạo lịch bảo trì'}</Button></div></form></Drawer>;
}
