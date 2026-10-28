'use client';
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Button} from '@/components/ui';
import {Drawer, Metadata} from '@/components/data/Drawer';
import {LoadingRows} from '@/components/data/WorkspaceState';
import {useAuth} from '@/contexts/AuthContext';
import {formatDate} from "@/components/shared/presentation";
import {maintenanceService as service} from '@/lib/api/services';
import {ActionFeedback, Feedback, maintenanceError, useMaintenanceAction} from "@/features/maintenance/components/Feedback";
import {fieldClass, OrderFieldsForm} from "@/features/maintenance/components/Fields";
import {MaterialEditor} from "@/features/maintenance/components/MaterialEditor";
import {
    calendarDate,
    formatVnd,
    orderControls
} from "@/features/maintenance/utils/workflows";
import type {OrderDetailMode as Mode, OrderFields, RepairOrder} from "@/features/maintenance/types/maintenance.types";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

function EditOrder({order, disabled, onSave, onCancel}: {
    order: RepairOrder;
    disabled: boolean;
    onSave: (fields: OrderFields) => void;
    onCancel: () => void
}) {
    const [fields, setFields] = useState({
        title: order.title,
        description: order.description || '',
        plannedDate: order.plannedDate,
        technicianName: order.technicianName
    });
    const [error, setError] = useState('');
    const {t} = useI18n();
    return <form className="space-y-4" aria-label={t('opsAssets.maintenance.order.editForm')} onSubmit={event => {
        event.preventDefault();
        setError('');
        onSave(fields);
    }}><Feedback error={error}/><OrderFieldsForm value={fields} onChange={setFields} disabled={disabled}/>
        <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={disabled}
                                                      onClick={onCancel}>{t('opsAssets.maintenance.order.discard')}</Button><Button type="submit"
                                                                                                           disabled={disabled}>{t('opsAssets.maintenance.order.saveInfo')}</Button></div>
    </form>;
}

function OrderConfirmation({order, mode, disabled, onConfirm, onCancel}: {
    order: RepairOrder;
    mode: 'start' | 'complete' | 'cancel';
    disabled: boolean;
    onConfirm: (note: string, passed: boolean) => void;
    onCancel: () => void
}) {
    const [note, setNote] = useState(''), [passed, setPassed] = useState(false), [error, setError] = useState('');
    const {t} = useI18n();
    const label = t(`opsAssets.maintenance.order.confirm.${mode}`);
    return <form className="space-y-4 rounded-panel border border-border bg-slate-50 p-4" aria-label={label}
                 onSubmit={event => {
                     event.preventDefault();
                     try {
                         setError('');
                         onConfirm(note, passed);
                     } catch (failure) {
                         setError(maintenanceError(failure, t));
                     }
                 }}><h3 className="font-semibold">{label}</h3><Feedback error={error}/><p
        className="text-sm text-slate-600">{t(mode === 'start' ? 'opsAssets.maintenance.order.desc.start' : mode === 'complete' ? 'opsAssets.maintenance.order.desc.complete' : order.status === 'IN_PROGRESS' ? 'opsAssets.maintenance.order.desc.cancelStarted' : 'opsAssets.maintenance.order.desc.cancelOpen')}</p>{mode !== 'start' &&
        <label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{mode === 'complete' ? t('opsAssets.maintenance.order.inspectionResult') : t('opsAssets.maintenance.order.cancelReason')}<RequiredMark/></span><textarea
            autoFocus aria-required rows={4} className={fieldClass} value={note} disabled={disabled}
            onChange={event => setNote(event.target.value)}/></label>}{mode === 'complete' &&
        <label className="flex items-start gap-3 text-sm"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox"
                                                                 aria-required checked={passed} disabled={disabled}
                                                                 onChange={event => setPassed(event.target.checked)}/><span>{t('opsAssets.maintenance.order.inspectedConfirm')}<RequiredMark/></span></label>}
        <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={disabled}
                                                      onClick={onCancel}>{t('opsAssets.maintenance.order.backToOrder')}</Button><Button type="submit"
                                                                                                        disabled={disabled || (mode !== 'start' && !note.trim()) || (mode === 'complete' && !passed)}>{label}</Button>
        </div>
    </form>;
}

export function OrderDetail({id, onClose, refreshLists}: {
    id: number;
    onClose: () => void;
    refreshLists: () => Promise<boolean>
}) {
    const {user, can} = useAuth();
    const {t, locale} = useI18n();
    const vnd = (value: string) => formatVnd(value, t, locale);
    const query = useQuery({
        queryKey: ['maintenance', user?.id, 'order', id],
        queryFn: ({signal}) => service.order(id, signal),
        enabled: can('UAV_MANAGE'),
        retry: false,
        refetchOnWindowFocus: false
    });
    const [mode, setMode] = useState<Mode>('view');
    const action = useMaintenanceAction(async () => {
        const [detail, lists] = await Promise.all([query.refetch(), refreshLists()]);
        return !detail.isError && lists;
    });
    const order = query.data;
    const controls = order ? orderControls(order.status, can('UAV_MANAGE')) : null;
    const blocked = action.blocked || query.isFetching || !!query.error;
    const submit = (request: () => Promise<unknown>, successKey: string) => void action.run(async () => {
        try {
            return await request();
        } finally {
            setMode('view');
        }
    }, successKey);
    return <Drawer title={t('opsAssets.maintenance.order.title', {id})} wide onClose={() => {
        if (!action.busy) onClose();
    }}>
        <div className="space-y-5"><ActionFeedback action={action}/>{query.isPending &&
            <LoadingRows/>}{query.error && <><Feedback error={maintenanceError(query.error, t)}/><Button type="button"
                                                                                                      variant="outline"
                                                                                                      disabled={action.busy}
                                                                                                      onClick={() => void query.refetch()}>{t('opsAssets.maintenance.order.reload')}</Button></>}{order && <>
            <header className="space-y-2"><span data-order-status={order.status}
                                                className="inline-flex rounded-panel bg-slate-100 px-3 py-1 text-sm font-semibold">{t(`opsAssets.maintenance.orderStatus.${order.status}`)}</span>
                <h3 className="break-words text-xl font-semibold">{order.title}</h3><p
                    className="text-sm text-slate-600">{order.uavSerialNumber} · {order.scheduleId ? t('opsAssets.maintenance.order.scheduled', {id: order.scheduleId}) : t('opsAssets.maintenance.order.adHoc')}</p>
            </header>
            <Metadata items={[
                [t('opsAssets.maintenance.order.plannedDate'), calendarDate(order.plannedDate, t, locale)], [t('opsAssets.maintenance.order.technician'), order.technicianName], [t('opsAssets.maintenance.order.createdAt'), formatDate(order.createdAt)], [t('opsAssets.maintenance.order.startedAt'), order.startedAt ? formatDate(order.startedAt) : t('opsAssets.maintenance.order.notStarted')], [t('opsAssets.maintenance.order.completedAt'), order.completedAt ? formatDate(order.completedAt) : t('opsAssets.maintenance.order.notCompleted')], [t('opsAssets.maintenance.order.cancelledAt'), order.cancelledAt ? formatDate(order.cancelledAt) : t('opsAssets.maintenance.order.notCancelled')],
            ]}/>{order.description &&
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{order.description}</p>}{order.inspectionNotes &&
            <div className="rounded-panel bg-uav-blue-light border border-blue-200 p-4"><strong>{t('opsAssets.maintenance.order.inspection')}</strong><p
                className="mt-2 whitespace-pre-wrap break-words text-sm">{order.inspectionNotes}</p>
            </div>}{order.cancelReason && <div className="rounded-panel bg-amber-50 p-4"><strong>{t('opsAssets.maintenance.order.cancelReasonShort')}</strong><p
            className="mt-2 whitespace-pre-wrap break-words text-sm">{order.cancelReason}</p></div>}
            {mode === 'view' && <>
                <section aria-label={t('opsAssets.maintenance.order.materialsSection')} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t('opsAssets.maintenance.order.materialsTitle')}</h3><strong data-testid="material-total"
                                                  className="text-xl">{vnd(order.totalMaterialCost)}</strong>
                    </div>
                    <p className="text-sm text-slate-600">{t('opsAssets.maintenance.order.materialsNote')}</p>{order.materials.length ?
                    <ul className="space-y-2">{order.materials.map(item => <li key={item.id}
                                                                               className="rounded-panel border border-slate-200 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2"><strong
                            className="break-words">{item.name}</strong><strong>{vnd(item.lineTotal)}</strong>
                        </div>
                        <p className="mt-1 break-words text-sm text-slate-600">{item.quantity} {item.unit} × {vnd(item.unitPrice)}</p>
                    </li>)}</ul> :
                    <p className="rounded-panel bg-slate-50 p-4 text-sm text-slate-600">{t('opsAssets.maintenance.order.noMaterials')}</p>}
                </section>
                <div className="flex flex-wrap gap-3">{controls?.edit && <><Button type="button" variant="outline"
                                                                                   disabled={blocked}
                                                                                   onClick={() => setMode('edit')}>{t('opsAssets.maintenance.order.editInfo')}</Button><Button type="button" variant="outline" disabled={blocked}
                                                    onClick={() => setMode('materials')}>{t('opsAssets.maintenance.order.editMaterials')}</Button></>}{controls?.start &&
                    <Button type="button" disabled={blocked} onClick={() => setMode('start')}>{t('opsAssets.maintenance.order.start')}</Button>}{controls?.complete &&
                    <Button type="button" disabled={blocked} onClick={() => setMode('complete')}>{t('opsAssets.maintenance.order.complete')}</Button>}{controls?.cancel &&
                    <Button type="button" variant="outline" disabled={blocked} onClick={() => setMode('cancel')}>{t('opsAssets.maintenance.order.cancel')}</Button>}</div>
                {!controls?.edit &&
                    <p className="rounded-panel bg-slate-100 p-4 text-sm">{t('opsAssets.maintenance.order.closedNote')}</p>}</>}
            {mode === 'edit' && controls?.edit &&
                <EditOrder key={order.version} order={order} disabled={blocked} onCancel={() => setMode('view')}
                           onSave={fields => submit(() => service.updateOrder(order, fields), 'opsAssets.maintenance.order.success.updated')}/>}
            {mode === 'materials' && controls?.edit &&
                <MaterialEditor key={order.version} order={order} disabled={blocked} onCancel={() => setMode('view')}
                                onSave={items => submit(() => service.materials(order, items), 'opsAssets.maintenance.order.success.materials')}/>}
            {(['start', 'complete', 'cancel'] as Mode[]).includes(mode) &&
                <OrderConfirmation key={`${mode}-${order.version}`} order={order}
                                   mode={mode as 'start' | 'complete' | 'cancel'} disabled={blocked}
                                   onCancel={() => setMode('view')}
                                   onConfirm={(note, passed) => submit(() => mode === 'start' ? service.start(order) : mode === 'complete' ? service.complete(order, note, passed) : service.cancel(order, note), `opsAssets.maintenance.order.success.${mode}`)}/>}
        </>}</div>
    </Drawer>;
}
