'use client';
import {Input} from '@/components/ui';
import type {Uav} from "@/types/resources";
import type {OrderFields, ScheduleFields} from "@/types/maintenance/maintenance.types";
import {OptionalMark, RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/providers/I18nContext';

export const fieldClass = 'min-h-11 w-full min-w-0 rounded-control border border-slate-300 bg-white px-3 py-2 text-sm';

export function UavField({value, onChange, uavs, disabled, locked, canRead}: {
    value: string;
    onChange: (value: string) => void;
    uavs: Uav[];
    disabled: boolean;
    locked?: boolean;
    canRead: boolean
}) {
    const {t} = useI18n();
    return <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.uav')}<RequiredMark/></span>{canRead ?
        <select aria-required aria-label={t('opsAssets.maintenance.fields.uav')} className={fieldClass} value={value}
                disabled={disabled || locked} onChange={event => onChange(event.target.value)}>
            <option value="">{t('opsAssets.maintenance.fields.selectUav')}</option>
            {uavs.map(uav => <option key={uav.id}
                                     value={uav.id}>{uav.serialNumber} · {uav.model}</option>)}{value && !uavs.some(uav => String(uav.id) === value) &&
            <option value={value}>{t('opsAssets.maintenance.fields.uavNumber', {id: value})}</option>}</select> :
        <Input aria-label={t('opsAssets.maintenance.fields.uavId')} type="number" step="1" aria-required value={value} disabled={disabled || locked}
               onChange={event => onChange(event.target.value)}/>}{!canRead &&
        <small className="text-xs font-normal text-slate-500">{t('opsAssets.maintenance.fields.uavIdHint')}</small>}</label>;
}

export function ScheduleFieldsForm({value, onChange, disabled}: {
    value: ScheduleFields;
    onChange: (value: ScheduleFields) => void;
    disabled: boolean
}) {
    const {t} = useI18n();
    return <><label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.scheduleTitle')}<RequiredMark/></span><Input aria-required
                                                                               value={value.title} disabled={disabled}
                                                                               onChange={event => onChange({
                                                                                   ...value,
                                                                                   title: event.target.value
                                                                               })}/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.interval')}<RequiredMark/></span><Input
            aria-required type="number" step="1" value={value.intervalDays} disabled={disabled}
            onChange={event => onChange({...value, intervalDays: event.target.value})}/></label><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.nextDue')}<RequiredMark/></span><Input aria-required type="date" value={value.nextDueDate}
                                                                             disabled={disabled}
                                                                             onChange={event => onChange({
                                                                                 ...value,
                                                                                 nextDueDate: event.target.value
                                                                             })}/></label></div>
    </>;
}

export function OrderFieldsForm({value, onChange, disabled}: {
    value: OrderFields;
    onChange: (value: OrderFields) => void;
    disabled: boolean
}) {
    const {t} = useI18n();
    return <><label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.orderTitle')}<RequiredMark/></span><Input aria-required
                                                                                 value={value.title} disabled={disabled}
                                                                                 onChange={event => onChange({
                                                                                     ...value,
                                                                                     title: event.target.value
                                                                                 })}/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.plannedDate')}<RequiredMark/></span><Input aria-required type="date" value={value.plannedDate}
                                                                            disabled={disabled}
                                                                            onChange={event => onChange({
                                                                                ...value,
                                                                                plannedDate: event.target.value
                                                                            })}/></label><label
            className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.technician')}<RequiredMark/></span><Input aria-required
                                                                               value={value.technicianName}
                                                                               disabled={disabled}
                                                                               onChange={event => onChange({
                                                                                   ...value,
                                                                                   technicianName: event.target.value
                                                                               })}/></label></div>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700"><span>{t('opsAssets.maintenance.fields.description')}<OptionalMark/></span><textarea rows={4}
                                                                                          className={fieldClass}
                                                                                          value={value.description}
                                                                                          disabled={disabled}
                                                                                          onChange={event => onChange({
                                                                                              ...value,
                                                                                              description: event.target.value
                                                                                          })}/></label></>;
}
