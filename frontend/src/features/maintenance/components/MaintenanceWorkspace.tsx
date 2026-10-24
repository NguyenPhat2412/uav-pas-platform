'use client';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Button} from '@/components/ui';
import {Drawer, Tabs} from '@/components/data/Drawer';
import {EmptyState, LoadingRows} from '@/components/data/WorkspaceState';
import {useAuth} from '@/contexts/AuthContext';
import {useCollection} from "@/hooks/useCollections";
import {Pagination} from "@/components/data/ResourceState";
import {maintenanceService as service} from "@/features/maintenance/services/maintenance.service";
import type {MaintenanceSchedule} from "@/features/maintenance/types/maintenance.types";
import {ActionFeedback, Feedback, maintenanceError, useMaintenanceAction} from "@/features/maintenance/components/Feedback";
import {calendarDate, dueLabels, formatVnd, orderLabels, pageAfterRefresh} from "@/features/maintenance/utils/workflows";
import {fieldClass} from "@/features/maintenance/components/Fields";
import {ScheduleForm} from "@/features/maintenance/components/ScheduleForm";
import {OrderCreate} from "@/features/maintenance/components/OrderCreate";
import {OrderDetail} from "@/features/maintenance/components/OrderDetail";
import {resolveUavIdFromParam, toUavSlug} from "@/lib/url-slugs";
import {useI18n} from '@/contexts/I18nContext';

export function MaintenanceWorkspace() {
    const {user, can} = useAuth();
    const {t, locale} = useI18n();
    const params = useSearchParams();
    const [tab, setTab] = useState('schedules');
    const [uavId, setUavId] = useState(() => resolveUavIdFromParam(params.get('uav'), params.get('uavId')));
    const [dueStatus, setDueStatus] = useState(''), [status, setStatus] = useState('');
    const [schedulePage, setSchedulePage] = useState(0), [orderPage, setOrderPage] = useState(0);
    const [scheduleForm, setScheduleForm] = useState<MaintenanceSchedule | 'new' | null>(null);
    const [orderForm, setOrderForm] = useState<MaintenanceSchedule | 'new' | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<number>();
    const [changeActive, setChangeActive] = useState<MaintenanceSchedule | null>(null);
    const uavs = useCollection('uavs');
    const client = useQueryClient();
    const schedules = useQuery({
        queryKey: ['maintenance', user?.id, 'schedules', uavId, dueStatus, schedulePage],
        queryFn: ({signal}) => service.schedules(schedulePage, uavId, dueStatus, signal),
        enabled: can('UAV_MANAGE'),
        retry: false
    });
    const orders = useQuery({
        queryKey: ['maintenance', user?.id, 'orders', uavId, status, orderPage],
        queryFn: ({signal}) => service.orders(orderPage, uavId, status, signal),
        enabled: can('UAV_MANAGE'),
        retry: false
    });
    const refresh = async () => {
        // A mutation can remove a row from a filtered page. Mark every cached list page
        // stale before moving to a remaining page, so its count and rows reload too.
        await Promise.all(['schedules', 'orders'].map(resource => client.invalidateQueries({
            queryKey: ['maintenance', user?.id, resource],
            refetchType: 'none'
        })));
        const results = await Promise.all([schedules.refetch(), orders.refetch()]);
        const schedulePages = results[0].data?.totalPages, orderPages = results[1].data?.totalPages;
        if (!results[0].isError && schedulePages !== undefined) setSchedulePage(current => pageAfterRefresh(current, schedulePages));
        if (!results[1].isError && orderPages !== undefined) setOrderPage(current => pageAfterRefresh(current, orderPages));
        await client.invalidateQueries({predicate: query => Array.isArray(query.queryKey) && (query.queryKey.includes('uavs') || query.queryKey.includes('audit') || query.queryKey.includes('dashboard'))});
        return results.every(result => !result.isError);
    };
    const action = useMaintenanceAction(refresh);
    const query = tab === 'schedules' ? schedules : orders;
    return <div className="space-y-5">
        <p className="max-w-3xl text-sm text-slate-600">{t('opsAssets.maintenance.workspace.intro')}</p>
        {!changeActive && <ActionFeedback action={action}/>}
        <Tabs items={[{id: 'schedules', label: t('opsAssets.maintenance.workspace.tabs.schedules')}, {id: 'orders', label: t('opsAssets.maintenance.workspace.tabs.orders')}]} value={tab}
              onChange={setTab}/>
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 sm:px-6 sm:py-5">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.workspace.filterUav')}</span><select aria-label={t('opsAssets.maintenance.workspace.filterUav')}
                                                                           className={fieldClass} value={uavId}
                                                                           onChange={event => {
                                                                               const nextUavId = event.target.value;
                                                                               setUavId(nextUavId);
                                                                               setSchedulePage(0);
                                                                               setOrderPage(0);
                                                                               if (typeof window !== 'undefined') {
                                                                                   const matched = uavs.data?.find(item => String(item.id) === nextUavId);
                                                                                   const nextUrl = nextUavId
                                                                                       ? `${window.location.pathname}?uav=${matched ? toUavSlug(matched) : nextUavId}`
                                                                                       : window.location.pathname;
                                                                                   window.history.replaceState(null, '', nextUrl);
                                                                               }
                                                                           }}>
                <option value="">{t('opsAssets.maintenance.workspace.allUavs')}</option>
                {uavs.data?.map(uav => <option key={uav.id}
                                               value={uav.id}>{uav.serialNumber}</option>)}{uavId && !uavs.data?.some(uav => String(uav.id) === uavId) &&
                <option value={uavId}>{t('opsAssets.maintenance.fields.uavNumber', {id: uavId})}</option>}</select></label>
            {tab === 'schedules' ?
                <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.workspace.filterDue')}</span><select aria-label={t('opsAssets.maintenance.workspace.filterDue')}
                                                                                  className={fieldClass}
                                                                                  value={dueStatus} onChange={event => {
                    setDueStatus(event.target.value);
                    setSchedulePage(0);
                }}>
                    <option value="">{t('opsAssets.maintenance.workspace.allSchedules')}</option>
                    {Object.keys(dueLabels).map(value => <option key={value}
                                                                               value={value}>{t(`opsAssets.maintenance.due.${value}`)}</option>)}</select></label> :
                <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.workspace.filterStatus')}</span><select aria-label={t('opsAssets.maintenance.workspace.filterStatus')}
                                                                                       className={fieldClass}
                                                                                       value={status}
                                                                                       onChange={event => {
                                                                                           setStatus(event.target.value);
                                                                                           setOrderPage(0);
                                                                                       }}>
                    <option value="">{t('opsAssets.maintenance.workspace.allStatuses')}</option>
                    {Object.keys(orderLabels).map(value => <option key={value}
                                                                                 value={value}>{t(`opsAssets.maintenance.orderStatus.${value}`)}</option>)}
                </select></label>}
            <div className="flex items-end"><Button type="button" className="min-h-11 w-full" disabled={action.blocked}
                                                    onClick={() => tab === 'schedules' ? setScheduleForm('new') : setOrderForm('new')}>{tab === 'schedules' ? t('opsAssets.maintenance.workspace.createSchedule') : t('opsAssets.maintenance.workspace.createOrder')}</Button>
            </div>
        </div>
        {uavs.error && can('UAV_READ') && <div className="space-y-2"><Feedback
            error={t('opsAssets.maintenance.workspace.uavsError')}/><Button
            type="button" variant="outline" onClick={() => void uavs.refetch()}>{t('opsAssets.maintenance.workspace.reloadUavs')}</Button></div>}
        {query.error ? <div className="space-y-3"><Feedback error={maintenanceError(query.error, t)}/><Button type="button"
                                                                                                           variant="outline"
                                                                                                           onClick={() => void query.refetch()}>{t('opsAssets.maintenance.workspace.reloadList')}</Button></div> : query.isPending ? <LoadingRows/> : <>
            <p className="text-sm text-slate-500"
               role="status">{t(tab === 'schedules' ? 'opsAssets.maintenance.workspace.countSchedules' : 'opsAssets.maintenance.workspace.countOrders', {count: query.data?.totalElements || 0})}{query.isFetching ? t('opsAssets.maintenance.workspace.updating') : ''}</p>
            {tab === 'schedules' ? <section aria-label={t('opsAssets.maintenance.workspace.scheduleList')}
                                            className="space-y-3">{schedules.data?.content.length ? schedules.data.content.map(schedule =>
                    <article key={schedule.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-wrap justify-between gap-3">
                            <div className="min-w-0 space-y-1"><h2
                                className="break-words font-semibold">{schedule.title}</h2><p
                                className="text-sm text-slate-600">{schedule.uavSerialNumber} · {t('opsAssets.maintenance.workspace.scheduleNumber', {id: schedule.id})}</p>
                            </div>
                            <span data-due-status={schedule.dueStatus}
                                  className={`h-fit rounded-full px-3 py-1 text-sm font-medium ${schedule.dueStatus === 'OVERDUE' ? 'bg-red-50 text-red-800' : schedule.dueStatus === 'DUE' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{t(`opsAssets.maintenance.due.${schedule.dueStatus}`)}</span>
                        </div>
                        <dl className="grid gap-3 text-sm sm:grid-cols-3">
                            <div>
                                <dt className="text-slate-500">{t('opsAssets.maintenance.workspace.interval')}</dt>
                                <dd className="mt-1 font-medium">{t('opsAssets.maintenance.workspace.intervalDays', {days: schedule.intervalDays})}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('opsAssets.maintenance.workspace.nextDue')}</dt>
                                <dd className="mt-1 font-medium">{calendarDate(schedule.nextDueDate, t, locale)}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-500">{t('opsAssets.maintenance.workspace.lastCompleted')}</dt>
                                <dd className="mt-1 font-medium">{calendarDate(schedule.lastCompletedDate, t, locale)}</dd>
                            </div>
                        </dl>
                        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm"
                                                                      disabled={action.blocked || schedules.isFetching}
                                                                      onClick={() => setScheduleForm(schedule)}>{t('opsAssets.maintenance.workspace.editSchedule')}</Button><Button type="button" variant="outline" size="sm"
                                                 disabled={action.blocked || schedules.isFetching}
                                                 onClick={() => setChangeActive(schedule)}>{schedule.active ? t('opsAssets.maintenance.workspace.pauseSchedule') : t('opsAssets.maintenance.workspace.activateSchedule')}</Button>{schedule.active &&
                            <Button type="button" size="sm" disabled={action.blocked || schedules.isFetching}
                                    onClick={() => setOrderForm(schedule)}>{t('opsAssets.maintenance.workspace.orderFromSchedule')}</Button>}</div>
                    </article>) : <EmptyState title={t('opsAssets.maintenance.workspace.noSchedules')}
                                              detail={t('opsAssets.maintenance.workspace.noSchedulesDetail')}/>}<Pagination
                    page={schedulePage} pages={schedules.data?.totalPages} onPage={setSchedulePage}/></section> :
                <section aria-label={t('opsAssets.maintenance.workspace.orderList')}
                         className="space-y-3">{orders.data?.content.length ? orders.data.content.map(order => <article
                    key={order.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap justify-between gap-3">
                        <div className="min-w-0 space-y-1"><h2 className="break-words font-semibold">{order.title}</h2>
                            <p className="text-sm text-slate-600">{order.uavSerialNumber} · {t('opsAssets.maintenance.workspace.orderNumber', {id: order.id})}</p></div>
                        <span
                            className="h-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">{t(`opsAssets.maintenance.orderStatus.${order.status}`)}</span>
                    </div>
                    <p className="break-words text-sm text-slate-600">{t('opsAssets.maintenance.workspace.planned', {date: calendarDate(order.plannedDate, t, locale)})} · {order.technicianName}</p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong>{formatVnd(order.totalMaterialCost, t, locale)}</strong><Button type="button" variant="outline"
                                                                                     onClick={() => setSelectedOrder(order.id)}>{t('opsAssets.maintenance.workspace.openOrder')}</Button></div>
                </article>) : <EmptyState title={t('opsAssets.maintenance.workspace.noOrders')}
                                          detail={t('opsAssets.maintenance.workspace.noOrdersDetail')}/>}<Pagination
                    page={orderPage} pages={orders.data?.totalPages} onPage={setOrderPage}/></section>}
        </>}
        {scheduleForm && <ScheduleForm schedule={scheduleForm === 'new' ? undefined : scheduleForm} uavId={uavId}
                                       uavs={uavs.data || []} canRead={can('UAV_READ')}
                                       onClose={() => setScheduleForm(null)} refresh={refresh}/>}
        {orderForm &&
            <OrderCreate schedule={orderForm === 'new' ? undefined : orderForm} uavId={uavId} uavs={uavs.data || []}
                         canRead={can('UAV_READ')} onClose={() => setOrderForm(null)} onCreated={order => {
                setOrderForm(null);
                setTab('orders');
                setSelectedOrder(order.id);
            }} refresh={refresh}/>}
        {selectedOrder &&
            <OrderDetail id={selectedOrder} onClose={() => setSelectedOrder(undefined)} refreshLists={refresh}/>}
        {changeActive &&
            <Drawer title={changeActive.active ? t('opsAssets.maintenance.workspace.pauseTitle') : t('opsAssets.maintenance.workspace.activateTitle')} onClose={() => {
                if (!action.busy) setChangeActive(null);
            }}>
                <div className="space-y-4"><ActionFeedback action={action}/><p>
                    <strong>{changeActive.title}</strong> · {changeActive.uavSerialNumber}</p><p
                    className="text-sm text-slate-600">{changeActive.active ? t('opsAssets.maintenance.workspace.pauseNote') : t('opsAssets.maintenance.workspace.activateNote')}</p>
                    <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={action.busy}
                                                                  onClick={() => setChangeActive(null)}>{t('opsAssets.maintenance.workspace.keep')}</Button><Button type="button" disabled={action.blocked}
                                             onClick={() => void action.run(async () => {
                                                 try {
                                                     return await service.updateSchedule(changeActive, {
                                                         title: changeActive.title,
                                                         intervalDays: String(changeActive.intervalDays),
                                                         nextDueDate: changeActive.nextDueDate
                                                     }, !changeActive.active);
                                                 } finally {
                                                     setChangeActive(null);
                                                 }
                                             }, changeActive.active ? 'opsAssets.maintenance.workspace.paused' : 'opsAssets.maintenance.workspace.activated')}>{changeActive.active ? t('opsAssets.maintenance.workspace.confirmPause') : t('opsAssets.maintenance.workspace.confirmActivate')}</Button>
                    </div>
                </div>
            </Drawer>}
    </div>;
}
