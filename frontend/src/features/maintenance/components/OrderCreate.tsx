'use client';
import {useState} from 'react';
import {Button} from '@/components/ui';
import {Drawer} from '@/components/data/Drawer';
import type {Uav} from "@/types/resources";
import type {MaintenanceSchedule, RepairOrder} from "@/features/maintenance/types/maintenance.types";
import {OrderFieldsForm, UavField} from "@/features/maintenance/components/Fields";
import {ActionFeedback, useMaintenanceAction} from "@/features/maintenance/components/Feedback";
import {businessToday, positiveId} from "@/features/maintenance/utils/workflows";
import {maintenanceService as service} from '@/lib/api/services';
import {useI18n} from '@/contexts/I18nContext';

export function OrderCreate({schedule, uavId: initialUavId, uavs, canRead, onClose, onCreated, refresh}: {
    schedule?: MaintenanceSchedule;
    uavId: string;
    uavs: Uav[];
    canRead: boolean;
    onClose: () => void;
    onCreated: (order: RepairOrder) => void;
    refresh: () => Promise<boolean>
}) {
    const [uavId, setUavId] = useState(schedule ? String(schedule.uavId) : initialUavId);
    const [fields, setFields] = useState({
        title: schedule?.title || '',
        description: '',
        plannedDate: schedule?.nextDueDate || businessToday(),
        technicianName: ''
    });
    const {t} = useI18n();
    const action = useMaintenanceAction(refresh);
    return <Drawer title={schedule ? t('opsAssets.maintenance.orderCreate.fromSchedule') : t('opsAssets.maintenance.orderCreate.title')} onClose={() => {
        if (!action.busy) onClose();
    }}>
        <form className="space-y-4" onSubmit={event => {
            event.preventDefault();
            let created: RepairOrder | undefined;
            void action.run(async () => {
                created = await service.createOrder(positiveId(uavId), fields, schedule?.id);
            }, 'opsAssets.maintenance.orderCreate.created', () => {
                if (created) onCreated(created);
            });
        }}><ActionFeedback action={action}/><p className="text-sm text-slate-600">{t('opsAssets.maintenance.orderCreate.note')}</p>{schedule && <p className="rounded-panel bg-slate-100 p-3 text-sm">{t('opsAssets.maintenance.orderCreate.linked', {id: schedule.id})}<strong>{schedule.title}</strong></p>}<UavField value={uavId} onChange={setUavId}
                                                                            uavs={uavs} canRead={canRead}
                                                                            disabled={action.blocked}
                                                                            locked={!!schedule}/><OrderFieldsForm
            value={fields} onChange={setFields} disabled={action.blocked}/>
            <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={action.busy}
                                                          onClick={onClose}>{t('opsAssets.maintenance.back')}</Button><Button type="submit"
                                                                                                     disabled={action.blocked}>{t('opsAssets.maintenance.orderCreate.submit')}</Button></div>
        </form>
    </Drawer>;
}
