'use client';

import type {ChangeEvent} from 'react';
import {FlightSpecFields} from '@/components/mission/customer/FlightSpecFields';
import {LocationPicker} from '@/components/mission/customer/LocationPicker';
import {Alert, FormField, Input, Select, Textarea} from '@/components/ui';
import type {MissionFormErrors} from '@/forms/mission/mission-form';
import {displayLabel} from '@/lib/presentation';
import {useI18n} from '@/providers/I18nContext';
import type {MissionInput} from '@/types/customer';
import {defaultFlightPlan} from '@/types/mission/flight-plan.types';

export function MissionFields({form, onChange, errors = {}}: {
    form: MissionInput;
    onChange: (form: MissionInput) => void;
    errors?: MissionFormErrors;
}) {
    const {t} = useI18n();
    const set = (key: keyof MissionInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        onChange({
            ...form,
            [key]: key === 'latitude' || key === 'longitude' ? (value === '' ? undefined : Number(value)) : value,
        });
    };
    const attributes = (key: keyof MissionInput) => ({
        id: `mission-${key}`,
        'aria-invalid': !!errors[key],
        'aria-describedby': errors[key] ? `mission-${key}-error` : undefined,
    });
    const coordError = (key: 'latitude' | 'longitude') =>
        errors[key] ? (
            <span className="text-sm font-normal leading-normal text-danger" id={`mission-${key}-error`}>
                {errors[key]}
            </span>
        ) : null;

    const labelClass = 'font-bold text-foreground';
    const inputClass = 'h-11 px-3 py-2 text-base font-normal text-foreground sm:text-sm aria-[invalid=true]:border-danger';
    const textareaClass = 'min-h-28 resize-y px-3 py-2.5 text-base font-normal text-foreground sm:text-sm aria-[invalid=true]:border-danger';

    return (
        <>
            <FormField id="mission-title" label={t('missionForm.title')} required error={errors.title} labelClassName={labelClass}>
                <Input className={inputClass} {...attributes('title')} value={form.title} onChange={set('title')}/>
            </FormField>
            <FormField id="mission-requestedDate" label={t('missionForm.requestedDate')} required error={errors.requestedDate} labelClassName={labelClass}>
                <Input className={inputClass} {...attributes('requestedDate')} type="date" value={form.requestedDate} onChange={set('requestedDate')}/>
            </FormField>
            <FormField id="mission-startTime" label={t('missionForm.start')} required error={errors.startTime} labelClassName={labelClass}>
                <Input className={inputClass} {...attributes('startTime')} type="datetime-local" step="any" value={form.startTime} onChange={set('startTime')}/>
            </FormField>
            <FormField id="mission-expectedEndTime" label={t('missionForm.expectedEnd')} required error={errors.expectedEndTime} labelClassName={labelClass}>
                <Input className={inputClass} {...attributes('expectedEndTime')} type="datetime-local" step="any" value={form.expectedEndTime} onChange={set('expectedEndTime')}/>
            </FormField>
            <p className="col-span-full m-0 border-l-2 border-primary/40 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                {t('missionForm.timeHint')}
            </p>
            <FormField id="mission-locationName" label={t('missionForm.location')} required error={errors.locationName} labelClassName={labelClass}>
                <Input className={inputClass} {...attributes('locationName')} value={form.locationName} onChange={set('locationName')}/>
            </FormField>
            <FormField id="mission-priority" label={t('missionForm.priority')} optional={false} error={errors.priority} labelClassName={labelClass}>
                <Select className={inputClass} {...attributes('priority')} value={form.priority ?? 'NORMAL'} onChange={set('priority')}>
                    {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(priority => (
                        <option key={priority} value={priority}>{displayLabel(priority)}</option>
                    ))}
                </Select>
            </FormField>
            <LocationPicker
                plan={form.flightPlan}
                fallbackLatitude={form.latitude}
                fallbackLongitude={form.longitude}
                latitudeInvalid={!!errors.latitude}
                latitudeErrorId={errors.latitude ? 'mission-latitude-error' : undefined}
                longitudeInvalid={!!errors.longitude}
                longitudeErrorId={errors.longitude ? 'mission-longitude-error' : undefined}
                onChange={(flightPlan, center) =>
                    onChange({
                        ...form,
                        flightPlan,
                        latitude: center ? Math.round(center[0] * 1e6) / 1e6 : undefined,
                        longitude: center ? Math.round(center[1] * 1e6) / 1e6 : undefined,
                    })
                }
            />
            {coordError('latitude')}
            {coordError('longitude')}
            <FlightSpecFields plan={form.flightPlan ?? defaultFlightPlan()} onChange={flightPlan => onChange({...form, flightPlan})}/>
            <FormField
                id="mission-description"
                label={t('missionForm.description')}
                optional
                error={errors.description}
                helperText={t('missionForm.maxChars')}
                labelClassName={labelClass}
            >
                <Textarea className={textareaClass} {...attributes('description')} value={form.description ?? ''} onChange={set('description')} rows={3}/>
            </FormField>
            <FormField
                id="mission-notes"
                label={t('missionForm.notes')}
                optional
                error={errors.notes}
                helperText={t('missionForm.maxChars')}
                labelClassName={labelClass}
            >
                <Textarea className={textareaClass} {...attributes('notes')} value={form.notes ?? ''} onChange={set('notes')} rows={3}/>
            </FormField>
        </>
    );
}

export function MissionErrorSummary({errors}: { errors: MissionFormErrors }) {
    const {t} = useI18n();
    if (!Object.keys(errors).length) return null;
    return (
        <Alert variant="error" className="mb-5 px-3.5 py-3 text-xs" tabIndex={-1} id="mission-error-summary" title={t('missionForm.checkErrors')}>
            <ul className="m-0 mt-1 list-disc pl-5">
                {Object.entries(errors).map(([key, message]) => (
                    <li key={key}><a className="underline" href={`#mission-${key}`}>{message}</a></li>
                ))}
            </ul>
        </Alert>
    );
}

export function focusMissionErrors() {
    requestAnimationFrame(() => document.getElementById('mission-error-summary')?.focus());
}
