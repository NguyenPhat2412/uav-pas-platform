'use client';
import {useState} from 'react';
import {Button} from '@/components/ui';
import {Drawer} from '@/components/data/Drawer';
import {ApiError} from '@/lib/api';
import type {Uav} from "@/types/resources";
import type {MaintenanceSchedule} from "@/features/maintenance/types/maintenance.types";
import {ScheduleFieldsForm, UavField} from "@/features/maintenance/components/Fields";
import {ActionFeedback} from "@/features/maintenance/components/Feedback";
import {useMaintenanceAction} from '@/features/maintenance/hooks/useMaintenanceAction';
import {businessToday, positiveId} from "@/features/maintenance/utils/workflows";
import {useI18n} from '@/providers/I18nContext';

export function ScheduleForm({schedule, uavId: initialUavId, uavs, canRead, onClose, refresh}: {
    schedule?: MaintenanceSchedule;
    uavId: string;
    uavs: Uav[];
    canRead: boolean;
    onClose: () => void;
    refresh: () => Promise<boolean>
}) {
    const [uavId, setUavId] = useState(schedule ? String(schedule.uavId) : initialUavId);
    const [fields, setFields] = useState({
        title: schedule?.title || '',
        intervalDays: String(schedule?.intervalDays || 30),
        nextDueDate: schedule?.nextDueDate || businessToday()
    });
    const {t} = useI18n();
    const action = useMaintenanceAction(refresh);
    const [conflicted, setConflicted] = useState(false);
    return <Drawer title={schedule ? t('opsAssets.maintenance.schedule.editTitle') : t('opsAssets.maintenance.schedule.createTitle')} onClose={() => {
        if (!action.busy) onClose();
    }}>
        <form className="space-y-4" onSubmit={event => {
            event.preventDefault();
            if (conflicted) return;
            void action.run(async service => {
                try {
                    return await (schedule ? service.updateSchedule(schedule, fields, schedule.active) : service.createSchedule(positiveId(uavId), fields));
                } catch (failure) {
                    if (failure instanceof ApiError && failure.status === 409 && failure.message === 'MAINTENANCE_VERSION_CHANGED') setConflicted(true);
                    throw failure;
                }
            }, 'opsAssets.maintenance.schedule.saved', onClose);
        }}><ActionFeedback action={action}/>{conflicted &&
            <p className="rounded-panel bg-amber-50 p-3 text-sm">{t('opsAssets.maintenance.schedule.conflict')}</p>}<p className="text-sm text-slate-600">{t('opsAssets.maintenance.schedule.note')}</p><UavField value={uavId} onChange={setUavId}
                                                                              uavs={uavs} canRead={canRead}
                                                                              disabled={action.blocked || conflicted}
                                                                              locked={!!schedule}/><ScheduleFieldsForm
            value={fields} onChange={setFields} disabled={action.blocked || conflicted}/>
            <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" disabled={action.busy}
                                                          onClick={onClose}>{t('opsAssets.maintenance.back')}</Button><Button type="submit"
                                                                                                     disabled={action.blocked || conflicted}>{schedule ? t('opsAssets.maintenance.schedule.saveChanges') : t('opsAssets.maintenance.schedule.create')}</Button>
            </div>
        </form>
    </Drawer>;
}
