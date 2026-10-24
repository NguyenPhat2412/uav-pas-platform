'use client';
import {displayLabel} from "@/components/shared/presentation";
import type {ChangeEvent} from 'react';
import type {MissionInput} from "@/types/customer";
import {LocationPicker} from "@/features/missions/components/customer/LocationPicker";
import {FlightSpecFields} from "@/features/missions/components/customer/FlightSpecFields";
import {defaultFlightPlan} from "@/features/missions/types/flight-plan.types";
import {localDateToday, type MissionFormErrors, missionLimits} from "@/features/missions/forms/mission-form";
import {RequiredMark} from "@/components/shared/RequiredMark";
import {useI18n} from '@/contexts/I18nContext';

export function MissionFields({form, onChange, errors = {}}: {
    form: MissionInput;
    onChange: (form: MissionInput) => void;
    errors?: MissionFormErrors
}) {
    const {t} = useI18n();
    const set = (key: keyof MissionInput) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = event.target.value;
        onChange({
            ...form,
            [key]: key === 'latitude' || key === 'longitude' ? value === '' ? undefined : Number(value) : value
        });
    };
    const attributes = (key: keyof MissionInput) => ({
        id: `mission-${key}`,
        'aria-invalid': !!errors[key],
        'aria-describedby': errors[key] ? `mission-${key}-error` : undefined
    });
    const error = (key: keyof MissionInput) => errors[key] ?
        <span className="text-sm font-normal leading-normal text-danger" id={`mission-${key}-error`}>{errors[key]}</span> : null;
    const fieldClass = 'grid gap-1.5 text-xs font-bold text-foreground';
    const inputClass = 'min-h-11 w-full rounded-lg border border-border-input bg-card px-3 py-2 text-base font-normal text-foreground sm:text-sm aria-[invalid=true]:border-danger';
    const textareaClass = 'min-h-28 w-full resize-y rounded-lg border border-border-input bg-card px-3 py-2.5 text-base font-normal text-foreground sm:text-sm aria-[invalid=true]:border-danger';
    return <>
        <label className={fieldClass}><span>{t('missionForm.title')}<RequiredMark/></span><input className={inputClass} {...attributes('title')}
                                                                                              value={form.title}
                                                                                              onChange={set('title')}
                                                                                              required
                                                                                              maxLength={missionLimits.title}/>{error('title')}
        </label>
        <label className={fieldClass}><span>{t('missionForm.requestedDate')}<RequiredMark/></span><input className={inputClass} {...attributes('requestedDate')} type="date"
                                                     value={form.requestedDate} min={localDateToday()}
                                                     onChange={set('requestedDate')} required/>{error('requestedDate')}
        </label>
        <label className={fieldClass}><span>{t('missionForm.start')}<RequiredMark/></span><input className={inputClass} {...attributes('startTime')} type="datetime-local" step="any"
                                                     value={form.startTime} onChange={set('startTime')}
                                                     required/>{error('startTime')}</label>
        <label className={fieldClass}><span>{t('missionForm.expectedEnd')}<RequiredMark/></span><input className={inputClass} {...attributes('expectedEndTime')} type="datetime-local" step="any"
                                                     value={form.expectedEndTime} onChange={set('expectedEndTime')}
                                                     required/>{error('expectedEndTime')}</label>
        <p className="col-span-full m-0 text-sm text-muted">{t('missionForm.timeHint')}</p>
        <label className={fieldClass}><span>{t('missionForm.location')}<RequiredMark/></span><input className={inputClass} {...attributes('locationName')} value={form.locationName}
                                                     onChange={set('locationName')}
                                                     maxLength={missionLimits.locationName}
                                                     required/>{error('locationName')}</label>
        <label className={fieldClass}><span>{t('missionForm.priority')}</span><select className={inputClass} {...attributes('priority')}
                                                                 value={form.priority ?? 'NORMAL'}
                                                                 onChange={set('priority')}>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(priority =>
            <option key={priority} value={priority}>{displayLabel(priority)}</option>)}</select>{error('priority')}
        </label>
        <LocationPicker plan={form.flightPlan} fallbackLatitude={form.latitude} fallbackLongitude={form.longitude}
                        onChange={(flightPlan, center) => onChange({
                            ...form, flightPlan,
                            latitude: center ? Math.round(center[0] * 1e6) / 1e6 : undefined,
                            longitude: center ? Math.round(center[1] * 1e6) / 1e6 : undefined,
                        })}/>
        {error('latitude')}
        <FlightSpecFields plan={form.flightPlan ?? defaultFlightPlan()} onChange={flightPlan => onChange({...form, flightPlan})}/>
        <label className={`${fieldClass} col-span-full`}><span>{t('missionForm.description')}</span><textarea className={textareaClass} {...attributes('description')}
                                                                       value={form.description ?? ''}
                                                                       onChange={set('description')}
                                                                       maxLength={missionLimits.description}
                                                                       rows={4}/>{error('description')}<span
            className="text-sm font-normal text-muted">{t('missionForm.maxChars')}</span></label>
        <label className={`${fieldClass} col-span-full`}><span>{t('missionForm.notes')}</span><textarea className={textareaClass} {...attributes('notes')}
                                                                         value={form.notes ?? ''}
                                                                         onChange={set('notes')}
                                                                         maxLength={missionLimits.notes}
                                                                         rows={3}/>{error('notes')}<span
            className="text-sm font-normal text-muted">{t('missionForm.maxChars')}</span></label>
    </>;
}

export function MissionErrorSummary({errors}: { errors: MissionFormErrors }) {
    const {t} = useI18n();
    if (!Object.keys(errors).length) return null;
    return <div className="mb-5 rounded-lg bg-red-50 px-3.5 py-3 text-xs text-danger" role="alert" tabIndex={-1} id="mission-error-summary"><strong>{t('missionForm.checkErrors')}</strong>
        <ul className="m-0 mt-2 list-disc pl-5">{Object.entries(errors).map(([key, message]) => <li key={key}><a className="underline" href={`#mission-${key}`}>{message}</a>
        </li>)}</ul>
    </div>;
}

export function focusMissionErrors() {
    requestAnimationFrame(() => document.getElementById('mission-error-summary')?.focus());
}
