'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { Drawer, Tabs } from '@/components/data/Drawer';
import { EmptyState, LoadingRows } from '@/components/data/WorkspaceState';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '../operations/hooks/useCollections';
import { Pagination } from '../operations/components/ResourceState';
import { maintenanceService as service } from './service';
import type { MaintenanceSchedule } from './types';
import { ActionFeedback, Feedback, maintenanceError, useMaintenanceAction } from './Feedback';
import { calendarDate, dueLabels, formatVnd, orderLabels, pageAfterRefresh } from './workflows';
import { fieldClass } from './Fields';
import { ScheduleForm } from './ScheduleForm';
import { OrderCreate } from './OrderCreate';
import { OrderDetail } from './OrderDetail';

export function MaintenanceWorkspace() {
  const { user, can } = useAuth();
  const params = useSearchParams();
  const initialUav = params.get('uavId') || '';
  const [tab, setTab] = useState('schedules');
  const [uavId, setUavId] = useState(/^\d+$/.test(initialUav) && Number(initialUav) > 0 ? initialUav : '');
  const [dueStatus, setDueStatus] = useState(''), [status, setStatus] = useState('');
  const [schedulePage, setSchedulePage] = useState(0), [orderPage, setOrderPage] = useState(0);
  const [scheduleForm, setScheduleForm] = useState<MaintenanceSchedule | 'new' | null>(null);
  const [orderForm, setOrderForm] = useState<MaintenanceSchedule | 'new' | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<number>();
  const [changeActive, setChangeActive] = useState<MaintenanceSchedule | null>(null);
  const uavs = useCollection('uavs');
  const client = useQueryClient();
  const schedules = useQuery({ queryKey: ['maintenance', user?.id, 'schedules', uavId, dueStatus, schedulePage], queryFn: ({ signal }) => service.schedules(schedulePage, uavId, dueStatus, signal), enabled: can('UAV_MANAGE'), retry: false });
  const orders = useQuery({ queryKey: ['maintenance', user?.id, 'orders', uavId, status, orderPage], queryFn: ({ signal }) => service.orders(orderPage, uavId, status, signal), enabled: can('UAV_MANAGE'), retry: false });
  const refresh = async () => {
    // A mutation can remove a row from a filtered page. Mark every cached list page
    // stale before moving to a remaining page, so its count and rows reload too.
    await Promise.all(['schedules', 'orders'].map(resource => client.invalidateQueries({ queryKey: ['maintenance', user?.id, resource], refetchType: 'none' })));
    const results = await Promise.all([schedules.refetch(), orders.refetch()]);
    const schedulePages = results[0].data?.totalPages, orderPages = results[1].data?.totalPages;
    if (!results[0].isError && schedulePages !== undefined) setSchedulePage(current => pageAfterRefresh(current, schedulePages));
    if (!results[1].isError && orderPages !== undefined) setOrderPage(current => pageAfterRefresh(current, orderPages));
    await client.invalidateQueries({ predicate: query => Array.isArray(query.queryKey) && (query.queryKey.includes('uavs') || query.queryKey.includes('audit') || query.queryKey.includes('dashboard')) });
    return results.every(result => !result.isError);
  };
  const action = useMaintenanceAction(refresh);
  const query = tab === 'schedules' ? schedules : orders;
  return <div className="space-y-5">
    <p className="max-w-3xl text-sm text-slate-600">Theo dõi lịch định kỳ, công việc sửa chữa và chi phí vật tư của từng UAV. Ngày đến hạn chỉ là nhắc việc trên màn hình; chưa tự động dừng UAV hoặc gửi thông báo.</p>
    {!changeActive && <ActionFeedback action={action} />}
    <Tabs items={[{ id: 'schedules', label: 'Lịch định kỳ' }, { id: 'orders', label: 'Phiếu sửa chữa' }]} value={tab} onChange={setTab} />
    <div className="portal-filter-bar">
      <label className="form-field"><span>Lọc theo UAV</span><select aria-label="Lọc theo UAV" className={fieldClass} value={uavId} onChange={event => { setUavId(event.target.value); setSchedulePage(0); setOrderPage(0); }}><option value="">Tất cả UAV</option>{uavs.data?.map(uav => <option key={uav.id} value={uav.id}>{uav.serialNumber}</option>)}{uavId && !uavs.data?.some(uav => String(uav.id) === uavId) && <option value={uavId}>UAV #{uavId}</option>}</select></label>
      {tab === 'schedules' ? <label className="form-field"><span>Lọc hạn bảo trì</span><select aria-label="Lọc hạn bảo trì" className={fieldClass} value={dueStatus} onChange={event => { setDueStatus(event.target.value); setSchedulePage(0); }}><option value="">Tất cả lịch</option>{Object.entries(dueLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : <label className="form-field"><span>Lọc trạng thái phiếu</span><select aria-label="Lọc trạng thái phiếu" className={fieldClass} value={status} onChange={event => { setStatus(event.target.value); setOrderPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(orderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <div className="flex items-end"><Button type="button" className="min-h-11 w-full" disabled={action.blocked} onClick={() => tab === 'schedules' ? setScheduleForm('new') : setOrderForm('new')}>{tab === 'schedules' ? 'Tạo lịch định kỳ' : 'Lập phiếu sửa chữa'}</Button></div>
    </div>
    {uavs.error && can('UAV_READ') && <div className="space-y-2"><Feedback error="Chưa tải được danh sách UAV để lựa chọn. Các lịch và phiếu hiện có vẫn hiển thị bên dưới." /><Button type="button" variant="outline" onClick={() => void uavs.refetch()}>Tải lại danh sách UAV</Button></div>}
    {query.error ? <div className="space-y-3"><Feedback error={maintenanceError(query.error)} /><Button type="button" variant="outline" onClick={() => void query.refetch()}>Tải lại danh sách bảo trì</Button></div> : query.isPending ? <LoadingRows /> : <>
      <p className="text-sm text-slate-500" role="status">{query.data?.totalElements || 0} {tab === 'schedules' ? 'lịch bảo trì' : 'phiếu sửa chữa'} phù hợp bộ lọc{query.isFetching ? ' · Đang cập nhật…' : ''}</p>
      {tab === 'schedules' ? <section aria-label="Danh sách lịch bảo trì" className="space-y-3">{schedules.data?.content.length ? schedules.data.content.map(schedule => <article key={schedule.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 space-y-1"><h2 className="break-words font-semibold">{schedule.title}</h2><p className="text-sm text-slate-600">{schedule.uavSerialNumber} · Lịch #{schedule.id}</p></div><span data-due-status={schedule.dueStatus} className={`h-fit rounded-full px-3 py-1 text-sm font-medium ${schedule.dueStatus === 'OVERDUE' ? 'bg-red-50 text-red-800' : schedule.dueStatus === 'DUE' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{dueLabels[schedule.dueStatus]}</span></div><dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-slate-500">Chu kỳ</dt><dd className="mt-1 font-medium">{schedule.intervalDays} ngày</dd></div><div><dt className="text-slate-500">Đến hạn tiếp theo</dt><dd className="mt-1 font-medium">{calendarDate(schedule.nextDueDate)}</dd></div><div><dt className="text-slate-500">Lần hoàn tất gần nhất</dt><dd className="mt-1 font-medium">{calendarDate(schedule.lastCompletedDate)}</dd></div></dl><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={action.blocked || schedules.isFetching} onClick={() => setScheduleForm(schedule)}>Chỉnh sửa lịch</Button><Button type="button" variant="outline" size="sm" disabled={action.blocked || schedules.isFetching} onClick={() => setChangeActive(schedule)}>{schedule.active ? 'Tạm dừng lịch' : 'Kích hoạt lịch'}</Button>{schedule.active && <Button type="button" size="sm" disabled={action.blocked || schedules.isFetching} onClick={() => setOrderForm(schedule)}>Lập phiếu theo lịch</Button>}</div></article>) : <EmptyState title="Chưa có lịch phù hợp" detail="Tạo lịch định kỳ cho UAV hoặc thay đổi bộ lọc." />}<Pagination page={schedulePage} pages={schedules.data?.totalPages} onPage={setSchedulePage} /></section> : <section aria-label="Danh sách phiếu sửa chữa" className="space-y-3">{orders.data?.content.length ? orders.data.content.map(order => <article key={order.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 space-y-1"><h2 className="break-words font-semibold">{order.title}</h2><p className="text-sm text-slate-600">{order.uavSerialNumber} · Phiếu #{order.id}</p></div><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{orderLabels[order.status]}</span></div><p className="break-words text-sm text-slate-600">Dự kiến {calendarDate(order.plannedDate)} · {order.technicianName}</p><div className="flex flex-wrap items-center justify-between gap-3"><strong>{formatVnd(order.totalMaterialCost)}</strong><Button type="button" variant="outline" onClick={() => setSelectedOrder(order.id)}>Mở phiếu sửa chữa</Button></div></article>) : <EmptyState title="Chưa có phiếu phù hợp" detail="Lập phiếu đột xuất hoặc tạo phiếu từ một lịch định kỳ." />}<Pagination page={orderPage} pages={orders.data?.totalPages} onPage={setOrderPage} /></section>}
    </>}
    {scheduleForm && <ScheduleForm schedule={scheduleForm === 'new' ? undefined : scheduleForm} uavId={uavId} uavs={uavs.data || []} canRead={can('UAV_READ')} onClose={() => setScheduleForm(null)} refresh={refresh} />}
    {orderForm && <OrderCreate schedule={orderForm === 'new' ? undefined : orderForm} uavId={uavId} uavs={uavs.data || []} canRead={can('UAV_READ')} onClose={() => setOrderForm(null)} onCreated={order => { setOrderForm(null); setTab('orders'); setSelectedOrder(order.id); }} refresh={refresh} />}
    {selectedOrder && <OrderDetail id={selectedOrder} onClose={() => setSelectedOrder(undefined)} refreshLists={refresh} />}
    {changeActive && <Drawer title={changeActive.active ? 'Tạm dừng lịch bảo trì' : 'Kích hoạt lịch bảo trì'} onClose={() => { if (!action.busy) setChangeActive(null); }}><div className="space-y-4"><ActionFeedback action={action} /><p><strong>{changeActive.title}</strong> · {changeActive.uavSerialNumber}</p><p className="text-sm text-slate-600">{changeActive.active ? 'Tạm dừng giúp giữ lịch sử của lịch mà không tiếp tục theo dõi hạn bảo trì. Không thể thay đổi lịch khi còn phiếu liên kết chưa đóng.' : 'Lịch sẽ tiếp tục theo dõi từ ngày đến hạn đã lưu. Bạn có thể chỉnh lại ngày sau khi kích hoạt.'}</p><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={action.busy} onClick={() => setChangeActive(null)}>Giữ nguyên lịch</Button><Button type="button" disabled={action.blocked} onClick={() => void action.run(async () => { try { return await service.updateSchedule(changeActive, { title: changeActive.title, intervalDays: String(changeActive.intervalDays), nextDueDate: changeActive.nextDueDate }, !changeActive.active); } finally { setChangeActive(null); } }, changeActive.active ? 'Đã tạm dừng lịch.' : 'Đã kích hoạt lịch.')}>{changeActive.active ? 'Xác nhận tạm dừng lịch' : 'Xác nhận kích hoạt lịch'}</Button></div></div></Drawer>}
  </div>;
}
